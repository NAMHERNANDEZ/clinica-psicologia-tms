import type { Env } from '../../types';
import type { TreatmentSummaryReport, ClinicalScores, ExportOptions } from './types';

export async function generateTreatmentSummary(env: Env, patientId: number): Promise<TreatmentSummaryReport> {
  const clinicFilter = `clinic_id = (SELECT clinic_id FROM tms_patient_profiles WHERE patient_id = ? LIMIT 1)`;

  const patient = await env.DB.prepare(
    `SELECT id, name, email FROM patients WHERE id = ?`
  ).bind(patientId).first<{ id: number; name: string; email: string }>();

  if (!patient) throw new Error('Patient not found');

  const profile = await env.DB.prepare(
    `SELECT * FROM tms_patient_profiles WHERE patient_id = ? ORDER BY id DESC LIMIT 1`
  ).bind(patientId).first<any>();

  const therapist = profile
    ? await env.DB.prepare(
        `SELECT id, name FROM therapists WHERE id = (SELECT therapist_id FROM appointments WHERE patient_id = ? AND therapist_id IS NOT NULL LIMIT 1)`
      ).bind(patientId).first<{ id: number; name: string }>()
    : { id: 0, name: 'Sin asignar' };

  const protocol = profile
    ? await env.DB.prepare(
        `SELECT name, target_area, total_sessions, stimulation_type FROM tms_protocols WHERE id = ?`
      ).bind(profile.protocol_id).first<{ name: string; target_area: string; total_sessions: number; stimulation_type: string }>()
    : { name: 'N/A', target_area: 'N/A', total_sessions: 0, stimulation_type: 'N/A' };

  const motorThreshold = await env.DB.prepare(
    `SELECT mt_pct, measured_at FROM motor_thresholds WHERE patient_id = ? ORDER BY measured_at DESC`
  ).bind(patientId).all<{ mt_pct: number; measured_at: string }>();

  const completedSessions = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tms_sessions WHERE profile_id = ? AND status = 'completed'`
  ).bind(profile?.id ?? 0).first<{ count: number }>();

  const curve = await env.DB.prepare(
    `SELECT ts.session_number, crt.mood_score, crt.anxiety_score, crt.energy_score, crt.sleep_score, crt.concentration_score, crt.overall_response
     FROM clinical_response_tracking crt
     JOIN tms_sessions ts ON crt.tms_session_id = ts.id
     WHERE crt.patient_id = ? ORDER BY ts.session_number ASC`
  ).bind(patientId).all<any>();

  const baselineScores: ClinicalScores = {
    mood: profile?.baseline_bdi ?? 0,
    anxiety: profile?.baseline_gad7 ?? 0,
    energy: 0,
    sleep: 0,
    concentration: 0,
    overall: profile?.baseline_phq9 ?? 0,
  };

  const latestRow = curve.length > 0 ? curve[curve.length - 1] : null;
  const latestScores: ClinicalScores = {
    mood: latestRow?.mood_score ?? 0,
    anxiety: latestRow?.anxiety_score ?? 0,
    energy: latestRow?.energy_score ?? 0,
    sleep: latestRow?.sleep_score ?? 0,
    concentration: latestRow?.concentration_score ?? 0,
    overall: latestRow?.overall_response ?? 0,
  };

  const curveData = curve.map((row: any) => ({
    session: row.session_number,
    scores: {
      mood: row.mood_score ?? 0,
      anxiety: row.anxiety_score ?? 0,
      energy: row.energy_score ?? 0,
      sleep: row.sleep_score ?? 0,
      concentration: row.concentration_score ?? 0,
      overall: row.overall_response ?? 0,
    },
  }));

  const predictions = await env.DB.prepare(
    `SELECT tp.session_number, tp.predicted_mood, tp.predicted_overall, tp.confidence,
            crt.mood_score as actual_mood, crt.overall_response as actual_overall
     FROM twin_predictions tp
     LEFT JOIN clinical_response_tracking crt ON crt.patient_id = tp.patient_id AND crt.tms_session_id = (
       SELECT id FROM tms_sessions WHERE profile_id = ? AND session_number = tp.session_number LIMIT 1
     )
     WHERE tp.patient_id = ? ORDER BY tp.session_number ASC`
  ).bind(profile?.id ?? 0, patientId).all<any>();

  const predictionsData = predictions.map((row: any) => ({
    session: row.session_number,
    predicted: row.predicted_overall ?? 0,
    actual: row.actual_overall ?? 0,
    confidence: row.confidence ?? 0,
  }));

  const adverseEffects = await env.DB.prepare(
    `SELECT effect_type, severity, COUNT(*) as count, SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved
     FROM adverse_effects
     WHERE patient_id = ? GROUP BY effect_type, severity`
  ).bind(patientId).all<{ type: string; severity: string; count: number; resolved: number }>();

  const timelineEvents: Array<{ date: string; event: string; details: string }> = [];
  if (profile?.start_date) {
    timelineEvents.push({ date: profile.start_date, event: 'Treatment started', details: protocol?.name ?? '' });
  }
  for (const row of curve) {
    timelineEvents.push({ date: row.created_at ?? '', event: `Session ${row.session_number} completed`, details: `Score: ${row.overall_response}` });
  }
  if (profile?.end_date) {
    timelineEvents.push({ date: profile.end_date, event: 'Treatment ended', details: `Status: ${profile.status}` });
  }

  return {
    patient: { id: patient.id, name: patient.name, email: patient.email },
    therapist: therapist ? { id: therapist.id, name: therapist.name } : { id: 0, name: 'Sin asignar' },
    diagnosis: profile?.assigned_diagnosis ?? 'No diagnosticado',
    protocol: protocol!,
    motor_threshold: {
      current: motorThreshold.length > 0 ? motorThreshold[0].mt_pct : 0,
      history: motorThreshold.map(m => ({ value: m.mt_pct, date: m.measured_at })),
    },
    progress: {
      completed: completedSessions?.count ?? 0,
      total: protocol?.total_sessions ?? 0,
      percentage: protocol?.total_sessions ? Math.round(((completedSessions?.count ?? 0) / protocol.total_sessions) * 100) : 0,
    },
    clinical_scores: { baseline: baselineScores, latest: latestScores, curve: curveData },
    twin_predictions: predictionsData,
    adverse_effects: adverseEffects.map(a => ({ type: a.type, severity: a.severity, count: a.count, resolved: a.resolved })),
    timeline: timelineEvents.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function generateClinicalEvolution(env: Env, patientId: number) {
  const curve = await env.DB.prepare(
    `SELECT ts.session_number, ts.completed_at, crt.mood_score, crt.anxiety_score, crt.energy_score, crt.sleep_score, crt.concentration_score, crt.overall_response
     FROM clinical_response_tracking crt
     JOIN tms_sessions ts ON crt.tms_session_id = ts.id
     WHERE crt.patient_id = ? ORDER BY ts.session_number ASC`
  ).bind(patientId).all<any>();

  const profile = await env.DB.prepare(
    `SELECT baseline_bdi, baseline_gad7, baseline_phq9 FROM tms_patient_profiles WHERE patient_id = ? ORDER BY id DESC LIMIT 1`
  ).bind(patientId).first<any>();

  const baseline = {
    mood: profile?.baseline_bdi ?? null,
    anxiety: profile?.baseline_gad7 ?? null,
    energy: null,
    sleep: null,
    concentration: null,
    overall: profile?.baseline_phq9 ?? null,
  };

  return {
    patient_id: patientId,
    baseline,
    sessions: curve.map((row: any) => ({
      session_number: row.session_number,
      date: row.completed_at,
      mood: row.mood_score,
      anxiety: row.anxiety_score,
      energy: row.energy_score,
      sleep: row.sleep_score,
      concentration: row.concentration_score,
      overall: row.overall_response,
    })),
  };
}

export async function generateProtocolReport(env: Env, clinicId: number, protocolId: number) {
  const protocol = await env.DB.prepare(
    `SELECT * FROM tms_protocols WHERE id = ?`
  ).bind(protocolId).first<any>();

  if (!protocol) throw new Error('Protocol not found');

  const profiles = await env.DB.prepare(
    `SELECT tpp.*, p.name as patient_name
     FROM tms_patient_profiles tpp
     JOIN patients p ON tpp.patient_id = p.id
     WHERE tpp.protocol_id = ? AND tpp.clinic_id = ?`
  ).bind(protocolId, clinicId).all<any>();

  const totalPatients = profiles.length;
  const activePatients = profiles.filter((p: any) => p.status === 'active').length;
  const completedPatients = profiles.filter((p: any) => p.status === 'completed').length;

  const avgCompletion = profiles.length > 0
    ? Math.round((profiles.filter((p: any) => p.status === 'completed').length / totalPatients) * 100)
    : 0;

  return {
    protocol: {
      id: protocol.id,
      name: protocol.name,
      indication: protocol.indication,
      target_area: protocol.target_area,
      frequency_hz: protocol.frequency_hz,
      intensity_pct_mt: protocol.intensity_pct_mt,
      total_sessions: protocol.total_sessions,
      stimulation_type: protocol.stimulation_type,
    },
    stats: {
      total_patients: totalPatients,
      active_patients: activePatients,
      completed_patients: completedPatients,
      completion_rate: avgCompletion,
    },
    patients: profiles.map((p: any) => ({
      patient_id: p.patient_id,
      patient_name: p.patient_name,
      status: p.status,
      start_date: p.start_date,
      end_date: p.end_date,
      assigned_diagnosis: p.assigned_diagnosis,
    })),
  };
}

export async function exportCSV(env: Env, patientId: number, sections: string[]): Promise<string> {
  const lines: string[] = [];

  if (sections.includes('summary') || sections.length === 0) {
    const patient = await env.DB.prepare(`SELECT id, name, email FROM patients WHERE id = ?`).bind(patientId).first<any>();
    const profile = await env.DB.prepare(
      `SELECT assigned_diagnosis, start_date, end_date, status FROM tms_patient_profiles WHERE patient_id = ? ORDER BY id DESC LIMIT 1`
    ).bind(patientId).first<any>();

    lines.push('Section,Patient ID,Name,Email,Diagnosis,Start Date,End Date,Status');
    lines.push(`Summary,${patient?.id ?? ''},${patient?.name ?? ''},${patient?.email ?? ''},${profile?.assigned_diagnosis ?? ''},${profile?.start_date ?? ''},${profile?.end_date ?? ''},${profile?.status ?? ''}`);
    lines.push('');
  }

  if (sections.includes('scores') || sections.length === 0) {
    const scores = await env.DB.prepare(
      `SELECT ts.session_number, crt.mood_score, crt.anxiety_score, crt.energy_score, crt.sleep_score, crt.concentration_score, crt.overall_response
       FROM clinical_response_tracking crt
       JOIN tms_sessions ts ON crt.tms_session_id = ts.id
       WHERE crt.patient_id = ? ORDER BY ts.session_number ASC`
    ).bind(patientId).all<any>();

    lines.push('Session,Mood,Anxiety,Energy,Sleep,Concentration,Overall');
    for (const row of scores) {
      lines.push(`${row.session_number},${row.mood_score ?? ''},${row.anxiety_score ?? ''},${row.energy_score ?? ''},${row.sleep_score ?? ''},${row.concentration_score ?? ''},${row.overall_response ?? ''}`);
    }
    lines.push('');
  }

  if (sections.includes('adverse_effects') || sections.length === 0) {
    const effects = await env.DB.prepare(
      `SELECT ae.effect_type, ae.severity, ae.description, ae.resolved, ts.session_number
       FROM adverse_effects ae
       JOIN tms_sessions ts ON ae.tms_session_id = ts.id
       WHERE ae.patient_id = ? ORDER BY ts.session_number ASC`
    ).bind(patientId).all<any>();

    lines.push('Session,Effect Type,Severity,Description,Resolved');
    for (const row of effects) {
      lines.push(`${row.session_number},${row.effect_type ?? ''},${row.severity ?? ''},"${(row.description ?? '').replace(/"/g, '""')}",${row.resolved ? 'Yes' : 'No'}`);
    }
    lines.push('');
  }

  if (sections.includes('predictions') || sections.length === 0) {
    const preds = await env.DB.prepare(
      `SELECT tp.session_number, tp.predicted_mood, tp.predicted_overall, tp.confidence, tp.risk_score
       FROM twin_predictions tp
       WHERE tp.patient_id = ? ORDER BY tp.session_number ASC`
    ).bind(patientId).all<any>();

    lines.push('Session,Predicted Mood,Predicted Overall,Confidence,Risk Score');
    for (const row of preds) {
      lines.push(`${row.session_number},${row.predicted_mood ?? ''},${row.predicted_overall ?? ''},${row.confidence ?? ''},${row.risk_score ?? ''}`);
    }
  }

  return lines.join('\n');
}

export async function getReportHistory(env: Env, patientId: number) {
  const profiles = await env.DB.prepare(
    `SELECT id, patient_id, assigned_diagnosis, status, start_date, end_date
     FROM tms_patient_profiles
     WHERE patient_id = ? ORDER BY id DESC`
  ).bind(patientId).all<any>();

  const sessions = await env.DB.prepare(
    `SELECT id, profile_id, session_number, status, completed_at
     FROM tms_sessions
     WHERE profile_id IN (SELECT id FROM tms_patient_profiles WHERE patient_id = ?)
     ORDER BY completed_at DESC`
  ).bind(patientId).all<any>();

  const scores = await env.DB.prepare(
    `SELECT id, mood_score, overall_response, created_at
     FROM clinical_response_tracking
     WHERE patient_id = ? ORDER BY created_at DESC`
  ).bind(patientId).all<any>();

  return {
    patient_id: patientId,
    treatment_cycles: profiles.map((p: any) => ({
      profile_id: p.id,
      diagnosis: p.assigned_diagnosis,
      status: p.status,
      start_date: p.start_date,
      end_date: p.end_date,
    })),
    total_sessions: sessions.length,
    latest_sessions: sessions.slice(0, 10),
    latest_scores: scores.slice(0, 10),
  };
}
