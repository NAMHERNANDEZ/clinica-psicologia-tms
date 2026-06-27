import type { Env } from '../../types';
import type { ProtocolSimulation, ComparisonResult, SimulationBaselineScores } from './types';
import { getTargetRegion } from './brain';

function generateRequestId(): string {
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function overallScore(scores: { mood: number; anxiety: number; energy: number }): number {
  return +(((scores.mood + (10 - scores.anxiety) + scores.energy) / 3).toFixed(1));
}

function estimateRisk(frequency: number, intensity: number, stimulationType: string): 'low' | 'moderate' | 'high' {
  let risk = 0;
  if (frequency >= 20) risk += 2; else if (frequency >= 10) risk += 1;
  if (intensity >= 130) risk += 2; else if (intensity >= 120) risk += 1;
  if (stimulationType === 'rTMS' || stimulationType === 'dTMS') risk += 1;
  if (risk >= 4) return 'high';
  if (risk >= 2) return 'moderate';
  return 'low';
}

export async function generatePredictedCurve(
  protocol: { total_sessions: number; frequency_hz: number; intensity_pct_mt: number; target_area: string },
  motorThreshold: number,
  baseline: SimulationBaselineScores
): Promise<Array<{ session: number; mood: number; anxiety: number; energy: number; overall: number }>> {
  const curve: Array<{ session: number; mood: number; anxiety: number; energy: number; overall: number }> = [];
  const totalSessions = protocol.total_sessions;
  const effectiveIntensity = (motorThreshold * protocol.intensity_pct_mt) / 100;
  const intensityFactor = Math.min(effectiveIntensity / 120, 1.5);
  const freqFactor = Math.min(protocol.frequency_hz / 10, 1.5);

  for (let s = 1; s <= totalSessions; s++) {
    const progress = s / totalSessions;
    const earlyBoost = progress <= 0.3 ? progress * 2 : 0.6;
    const midBoost = progress > 0.3 && progress <= 0.7 ? (progress - 0.3) * 1.5 : 0;
    const plateauFactor = progress > 0.7 ? 0.6 + (progress - 0.7) * 1.33 : 0.6;
    const totalImprovement = (earlyBoost + midBoost + plateauFactor) * intensityFactor * freqFactor * 0.5;

    const mood = Math.min(10, +(baseline.mood + totalImprovement * 0.8).toFixed(1));
    const anxiety = Math.max(0, +(baseline.anxiety - totalImprovement * 0.6).toFixed(1));
    const energy = Math.min(10, +(baseline.energy + totalImprovement * 0.7).toFixed(1));
    const overall = overallScore({ mood, anxiety, energy });

    curve.push({ session: s, mood, anxiety, energy, overall });
  }

  return curve;
}

export async function simulateProtocol(
  env: Env,
  clinicId: number,
  protocolId: number,
  patientId: number
): Promise<{ requestId: string; simulation: ProtocolSimulation }> {
  const requestId = generateRequestId();

  const protocolRow = await env.DB.prepare(
    `SELECT id, name, target_area, frequency_hz, intensity_pct_mt, pulses_per_session,
            session_duration_min, total_sessions, stimulation_type, evidence_level
     FROM tms_protocols WHERE id = ? AND clinic_id = ?`
  ).bind(protocolId, clinicId).first();

  if (!protocolRow) {
    throw new Error('Protocol not found');
  }

  const mtRow = await env.DB.prepare(
    `SELECT mt_pct FROM motor_thresholds WHERE patient_id = ? AND clinic_id = ?
     ORDER BY measured_at DESC LIMIT 1`
  ).bind(patientId, clinicId).first();

  const motorThreshold = (mtRow?.mt_pct as number) ?? 50;

  const lastResponseRow = await env.DB.prepare(
    `SELECT mood_score, anxiety_score, energy_score
     FROM clinical_response_tracking WHERE patient_id = ?
     ORDER BY created_at DESC LIMIT 1`
  ).bind(patientId).first();

  const baseline: SimulationBaselineScores = {
    mood: (lastResponseRow?.mood_score as number) ?? 5,
    anxiety: (lastResponseRow?.anxiety_score as number) ?? 5,
    energy: (lastResponseRow?.energy_score as number) ?? 5,
    overall: 0,
  };
  baseline.overall = overallScore(baseline);

  const totalSessions = (protocolRow.total_sessions as number) ?? 30;
  const pulsesPerSession = (protocolRow.pulses_per_session as number) ?? 3000;
  const sessionDurationMin = (protocolRow.session_duration_min as number) ?? 20;
  const frequencyHz = (protocolRow.frequency_hz as number) ?? 10;
  const intensityPctMt = (protocolRow.intensity_pct_mt as number) ?? 120;
  const targetArea = (protocolRow.target_area as string) ?? 'DLPFC';
  const stimulationType = (protocolRow.stimulation_type as string) ?? 'rTMS';

  const curve = await generatePredictedCurve(
    { total_sessions: totalSessions, frequency_hz: frequencyHz, intensity_pct_mt: intensityPctMt, target_area: targetArea },
    motorThreshold,
    baseline
  );

  const lastPrediction = curve[curve.length - 1];
  const improvementPct = baseline.overall > 0
    ? +(((lastPrediction.overall - baseline.overall) / baseline.overall) * 100).toFixed(1)
    : 0;

  const confidence = Math.min(0.5 + (totalSessions / 60) * 0.3, 0.85);

  const protocol: ProtocolSimulation['protocol'] = {
    id: protocolRow.id as number,
    name: protocolRow.name as string,
    target_area: targetArea,
    frequency_hz: frequencyHz,
    intensity_pct_mt: intensityPctMt,
    total_sessions: totalSessions,
    stimulation_type: stimulationType,
  };

  const simulation: ProtocolSimulation = {
    protocol,
    predicted_curve: curve,
    estimated_duration_weeks: Math.ceil(totalSessions / 5),
    estimated_total_pulses: totalSessions * pulsesPerSession,
    risk_assessment: estimateRisk(frequencyHz, intensityPctMt, stimulationType),
    confidence: +confidence.toFixed(2),
  };

  return { requestId, simulation };
}

export async function compareProtocols(
  env: Env,
  clinicId: number,
  patientId: number,
  protocolAId: number,
  protocolBId: number
): Promise<{ requestId: string; comparison: ComparisonResult }> {
  const requestId = generateRequestId();

  const simA = await simulateProtocol(env, clinicId, protocolAId, patientId);
  const simB = await simulateProtocol(env, clinicId, protocolBId, patientId);

  const curveA = simA.simulation.predicted_curve;
  const curveB = simB.simulation.predicted_curve;
  const finalA = curveA[curveA.length - 1]?.overall ?? 0;
  const finalB = curveB[curveB.length - 1]?.overall ?? 0;

  const differencePct = finalA !== 0 ? +(((finalB - finalA) / finalA) * 100).toFixed(1) : 0;

  let recommendation: string;
  if (Math.abs(differencePct) < 5) {
    recommendation = `Both protocols show similar outcomes (${differencePct}% difference). Consider cost and patient preference.`;
  } else if (finalB > finalA) {
    recommendation = `Protocol B (${simB.simulation.protocol.name}) shows ${differencePct}% better outcomes than Protocol A (${simA.simulation.protocol.name}).`;
  } else {
    recommendation = `Protocol A (${simA.simulation.protocol.name}) shows ${Math.abs(differencePct)}% better outcomes than Protocol B (${simB.simulation.protocol.name}).`;
  }

  return {
    requestId,
    comparison: {
      protocol_a: simA.simulation,
      protocol_b: simB.simulation,
      recommendation,
      difference_pct: differencePct,
    },
  };
}

export async function getComparisonHistory(
  env: Env,
  patientId: number
): Promise<{ requestId: string; comparisons: Record<string, unknown>[] }> {
  const rows = await env.DB.prepare(
    `SELECT sc.id, sc.patient_id, sc.protocol_a_id, sc.protocol_b_id,
            sc.result_a, sc.result_b, sc.created_by, sc.created_at,
            pa.name as protocol_a_name, pb.name as protocol_b_name
     FROM simulation_comparisons sc
     LEFT JOIN tms_protocols pa ON pa.id = sc.protocol_a_id
     LEFT JOIN tms_protocols pb ON pb.id = sc.protocol_b_id
     WHERE sc.patient_id = ?
     ORDER BY sc.created_at DESC`
  ).bind(patientId).all();

  return {
    requestId: generateRequestId(),
    comparisons: (rows.results ?? []) as unknown as Record<string, unknown>[],
  };
}

export async function getSimulationDashboard(
  env: Env,
  clinicId: number
): Promise<{ requestId: string; dashboard: Record<string, unknown> }> {
  const totalSimulations = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM simulation_comparisons WHERE clinic_id = ?`
  ).bind(clinicId).first();

  const totalProtocols = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM tms_protocols WHERE clinic_id = ?`
  ).bind(clinicId).first();

  const recentComparisons = await env.DB.prepare(
    `SELECT sc.id, sc.patient_id, sc.protocol_a_id, sc.protocol_b_id, sc.created_at,
            pa.name as protocol_a_name, pb.name as protocol_b_name
     FROM simulation_comparisons sc
     LEFT JOIN tms_protocols pa ON pa.id = sc.protocol_a_id
     LEFT JOIN tms_protocols pb ON pb.id = sc.protocol_b_id
     WHERE sc.clinic_id = ?
     ORDER BY sc.created_at DESC LIMIT 10`
  ).bind(clinicId).all();

  const protocols = await env.DB.prepare(
    `SELECT id, name, indication, target_area, frequency_hz, evidence_level
     FROM tms_protocols WHERE clinic_id = ? ORDER BY name ASC`
  ).bind(clinicId).all();

  const avgSessions = await env.DB.prepare(
    `SELECT AVG(p.total_sessions) as avg_sessions FROM tms_protocols p WHERE p.clinic_id = ?`
  ).bind(clinicId).first();

  return {
    requestId: generateRequestId(),
    dashboard: {
      total_simulations: (totalSimulations?.cnt as number) ?? 0,
      total_protocols: (totalProtocols?.cnt as number) ?? 0,
      avg_sessions_per_protocol: +(avgSessions?.avg_sessions as number ?? 0).toFixed(1),
      recent_comparisons: (recentComparisons.results ?? []) as unknown as Record<string, unknown>[],
      protocols: (protocols.results ?? []) as unknown as Record<string, unknown>[],
    },
  };
}
