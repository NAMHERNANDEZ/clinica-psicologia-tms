import type { Env } from '../../types';
import type { DigitalTwinInput, DigitalTwinPrediction, ClinicalScore } from './types';
import { predictionRules } from './rules';

function generateRequestId(): string {
  return `dt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function overallScore(c: { mood: number; anxiety: number; energy: number; sleep: number; concentration: number }): number {
  return +(((c.mood + (10 - c.anxiety) + c.energy + c.sleep + c.concentration) / 5).toFixed(1));
}

export async function predictResponse(env: Env, input: DigitalTwinInput): Promise<DigitalTwinPrediction> {
  const historyRows = await env.DB.prepare(
    `SELECT mood_score as mood, anxiety_score as anxiety, energy_score as energy,
            sleep_score as sleep, concentration_score as concentration, overall_response as overall
     FROM clinical_response_tracking WHERE patient_id = ? ORDER BY created_at ASC`
  ).bind(input.patient_id).all();

  const history: ClinicalScore[] = (historyRows.results ?? []).map((r, i) => ({
    session_number: i + 1,
    mood: r.mood as number,
    anxiety: r.anxiety as number,
    energy: r.energy as number,
    sleep: r.sleep as number,
    concentration: r.concentration as number,
    overall: r.overall as number,
  }));

  const matched = predictionRules
    .filter(r => r.condition(input, history))
    .sort((a, b) => b.priority - a.priority);

  if (matched.length > 0) {
    return matched[0].predict(input, history);
  }

  const base = overallScore(input.clinical_scores);
  const sessionFactor = Math.min(input.session_number / input.protocol.total_sessions, 1) * 1.5;
  const predicted = Math.min(10, base + sessionFactor);

  return {
    predicted_mood: Math.min(10, input.clinical_scores.mood + sessionFactor * 0.8),
    predicted_anxiety: Math.max(0, input.clinical_scores.anxiety - sessionFactor * 0.6),
    predicted_energy: Math.min(10, input.clinical_scores.energy + sessionFactor * 0.7),
    predicted_sleep: Math.min(10, input.clinical_scores.sleep + sessionFactor * 0.5),
    predicted_concentration: Math.min(10, input.clinical_scores.concentration + sessionFactor * 0.5),
    predicted_overall: +predicted.toFixed(1),
    confidence: 0.5,
    risk_score: 0.3,
    rule_applied: 'default_progression',
  };
}

export async function generatePrediction(
  env: Env,
  clinicId: number,
  patientId: number,
  sessionNumber?: number
): Promise<{ requestId: string; prediction: DigitalTwinPrediction; stored: boolean }> {
  const requestId = generateRequestId();

  const profileRow = await env.DB.prepare(
    `SELECT id, assigned_diagnosis, baseline_bdi, baseline_gad7, baseline_phq9
     FROM tms_patient_profiles WHERE patient_id = ? AND status = 'active' LIMIT 1`
  ).bind(patientId).first();

  const protocolRow = await env.DB.prepare(
    `SELECT p.name, p.target_area, p.frequency_hz, p.intensity_pct_mt, p.total_sessions
     FROM tms_protocols p
     INNER JOIN tms_patient_profiles pp ON pp.protocol_id = p.id
     WHERE pp.patient_id = ? AND pp.status = 'active' LIMIT 1`
  ).bind(patientId).first();

  const mtRow = await env.DB.prepare(
    `SELECT mt_pct FROM motor_thresholds WHERE patient_id = ? ORDER BY measured_at DESC LIMIT 1`
  ).bind(patientId).first();

  const lastSessionRow = await env.DB.prepare(
    `SELECT session_number FROM tms_sessions WHERE profile_id = ?
     ORDER BY session_number DESC LIMIT 1`
  ).bind(profileRow?.id ?? 0).first();

  const targetSession = sessionNumber ?? ((lastSessionRow?.session_number as number ?? 0) + 1);

  const lastResponseRow = await env.DB.prepare(
    `SELECT mood_score, anxiety_score, energy_score, sleep_score, concentration_score
     FROM clinical_response_tracking WHERE patient_id = ?
     ORDER BY created_at DESC LIMIT 1`
  ).bind(patientId).first();

  const scores = {
    mood: (lastResponseRow?.mood_score as number) ?? (profileRow?.baseline_bdi as number) ?? 5,
    anxiety: (lastResponseRow?.anxiety_score as number) ?? (profileRow?.baseline_gad7 as number) ?? 5,
    energy: 5,
    sleep: 5,
    concentration: 5,
  };

  const input: DigitalTwinInput = {
    patient_id: patientId,
    diagnosis: (profileRow?.assigned_diagnosis as string) ?? 'unknown',
    motor_threshold: (mtRow?.mt_pct as number) ?? 50,
    clinical_scores: scores,
    session_number: targetSession,
    protocol: {
      name: (protocolRow?.name as string) ?? 'standard',
      target_area: (protocolRow?.target_area as string) ?? 'DLPFC',
      frequency_hz: (protocolRow?.frequency_hz as number) ?? 10,
      intensity_pct_mt: (protocolRow?.intensity_pct_mt as number) ?? 120,
      total_sessions: (protocolRow?.total_sessions as number) ?? 30,
    },
  };

  const prediction = await predictResponse(env, input);

  await env.DB.prepare(
    `INSERT INTO twin_predictions (clinic_id, patient_id, session_number, predicted_mood, predicted_anxiety,
       predicted_energy, predicted_sleep, predicted_concentration, predicted_overall, confidence, risk_score, rule_applied)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    clinicId, patientId, targetSession,
    prediction.predicted_mood, prediction.predicted_anxiety,
    prediction.predicted_energy, prediction.predicted_sleep,
    prediction.predicted_concentration, prediction.predicted_overall,
    prediction.confidence, prediction.risk_score, prediction.rule_applied
  ).run();

  return { requestId, prediction, stored: true };
}

export async function getPatientPredictions(
  env: Env,
  patientId: number
): Promise<{ requestId: string; predictions: Record<string, unknown>[] }> {
  const rows = await env.DB.prepare(
    `SELECT id, patient_id, session_number, predicted_mood, predicted_anxiety,
            predicted_energy, predicted_sleep, predicted_concentration, predicted_overall,
            confidence, risk_score, rule_applied, created_at
     FROM twin_predictions WHERE patient_id = ? ORDER BY session_number ASC`
  ).bind(patientId).all();

  return {
    requestId: generateRequestId(),
    predictions: (rows.results ?? []) as unknown as Record<string, unknown>[],
  };
}

export async function getPredictionHistory(
  env: Env,
  patientId: number
): Promise<{ requestId: string; history: { session_number: number; predicted: Record<string, number>; actual: Record<string, number> | null }[] }> {
  const predictions = await env.DB.prepare(
    `SELECT session_number, predicted_mood as mood, predicted_anxiety as anxiety,
            predicted_energy as energy, predicted_sleep as sleep,
            predicted_concentration as concentration, predicted_overall as overall
     FROM twin_predictions WHERE patient_id = ? ORDER BY session_number ASC`
  ).bind(patientId).all();

  const actualRows = await env.DB.prepare(
    `SELECT mood_score as mood, anxiety_score as anxiety, energy_score as energy,
            sleep_score as sleep, concentration_score as concentration, overall_response as overall
     FROM clinical_response_tracking WHERE patient_id = ? ORDER BY created_at ASC`
  ).bind(patientId).all();

  const predictionsList = (predictions.results ?? []) as Record<string, unknown>[];
  const actualsList = (actualRows.results ?? []) as Record<string, unknown>[];

  const history = predictionsList.map((p) => {
    const actual = actualsList.find(a => true) ?? null;
    return {
      session_number: p.session_number as number,
      predicted: {
        mood: p.mood as number,
        anxiety: p.anxiety as number,
        energy: p.energy as number,
        sleep: p.sleep as number,
        concentration: p.concentration as number,
        overall: p.overall as number,
      },
      actual: actual ? {
        mood: actual.mood as number,
        anxiety: actual.anxiety as number,
        energy: actual.energy as number,
        sleep: actual.sleep as number,
        concentration: actual.concentration as number,
        overall: actual.overall as number,
      } : null,
    };
  });

  return { requestId: generateRequestId(), history };
}

export async function evaluateConfidence(
  env: Env,
  patientId: number
): Promise<{ requestId: string; confidence: number; factors: Record<string, unknown> }> {
  const profileCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM tms_patient_profiles WHERE patient_id = ?`
  ).bind(patientId).first();

  const predictionCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM twin_predictions WHERE patient_id = ?`
  ).bind(patientId).first();

  const responseCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM clinical_response_tracking WHERE patient_id = ?`
  ).bind(patientId).first();

  const mtCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM motor_thresholds WHERE patient_id = ?`
  ).bind(patientId).first();

  const sessionCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM tms_sessions s
     INNER JOIN tms_patient_profiles pp ON s.profile_id = pp.id
     WHERE pp.patient_id = ?`
  ).bind(patientId).first();

  const hasProfile = (profileCount?.cnt as number) > 0 ? 1 : 0;
  const predCount = (predictionCount?.cnt as number) ?? 0;
  const respCount = (responseCount?.cnt as number) ?? 0;
  const mtCountVal = (mtCount?.cnt as number) ?? 0;
  const sessCount = (sessionCount?.cnt as number) ?? 0;

  const score =
    hasProfile * 15 +
    Math.min(predCount, 5) * 8 +
    Math.min(respCount, 5) * 10 +
    Math.min(mtCountVal, 3) * 10 +
    Math.min(sessCount, 5) * 9;

  const confidence = Math.min(+(score / 100).toFixed(2), 0.95);

  return {
    requestId: generateRequestId(),
    confidence,
    factors: {
      has_profile: !!hasProfile,
      prediction_count: predCount,
      response_count: respCount,
      motor_threshold_count: mtCountVal,
      session_count: sessCount,
    },
  };
}
