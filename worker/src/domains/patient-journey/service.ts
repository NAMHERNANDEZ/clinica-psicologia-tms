import type { Env } from '../../types';
import type { SessionCompletionData, StartTreatmentInput } from './types';
import * as orchestrator from './orchestrator';

export async function getUnifiedDashboard(env: Env, clinicId: number, patientId: number) {
  const journey = await orchestrator.getPatientJourney(env, clinicId, patientId);

  const profile = await env.DB.prepare(
    'SELECT id, protocol_id, therapist_id, status, assigned_diagnosis, start_date, end_date FROM tms_patient_profiles WHERE patient_id = ? AND clinic_id = ? ORDER BY id DESC LIMIT 1'
  ).bind(patientId, clinicId).first();

  let protocol = null;
  if (profile && (profile as any).protocol_id) {
    protocol = await env.DB.prepare(
      'SELECT id, name, target_area, frequency_hz, intensity_pct_mt, total_sessions, stimulation_type FROM tms_protocols WHERE id = ?'
    ).bind((profile as any).protocol_id).first();
  }

  let therapist = null;
  if (profile && (profile as any).therapist_id) {
    therapist = await env.DB.prepare(
      'SELECT id, name, specialty FROM therapists WHERE id = ?'
    ).bind((profile as any).therapist_id).first();
  }

  const sessions = await env.DB.prepare(
    'SELECT id, session_number, status, completed_at, motor_threshold_pct, intensity_pct_mt FROM tms_sessions WHERE profile_id = ? ORDER BY session_number ASC'
  ).bind((profile as any)?.id ?? 0).all();

  const responses = await env.DB.prepare(
    'SELECT id, mood_score, anxiety_score, energy_score, sleep_score, concentration_score, overall_response, created_at FROM clinical_response_tracking WHERE patient_id = ? AND clinic_id = ? ORDER BY created_at ASC'
  ).bind(patientId, clinicId).all();

  const predictions = await env.DB.prepare(
    'SELECT session_number, predicted_mood, predicted_anxiety, predicted_energy, predicted_sleep, predicted_concentration, predicted_overall, confidence, risk_score FROM twin_predictions WHERE patient_id = ? AND clinic_id = ? ORDER BY session_number ASC'
  ).bind(patientId, clinicId).all();

  const adverseEffects = await env.DB.prepare(
    'SELECT effect_type, severity, description, resolved, created_at FROM adverse_effects WHERE patient_id = ? AND clinic_id = ? ORDER BY created_at DESC'
  ).bind(patientId, clinicId).all();

  const milestones = await orchestrator.generateMilestones(env, clinicId, patientId);

  return {
    journey,
    profile: profile ?? null,
    protocol,
    therapist,
    sessions: sessions.results ?? [],
    responses: responses.results ?? [],
    predictions: predictions.results ?? [],
    adverse_effects: adverseEffects.results ?? [],
    milestones,
  };
}

export async function getReceptionView(env: Env, clinicId: number) {
  const today = new Date().toISOString().split('T')[0];

  const appointments = await env.DB.prepare(
    `SELECT a.id, a.patient_id, a.therapist_id, a.date, a.time, a.status, a.duration,
            p.name as patient_name, t.name as therapist_name
     FROM appointments a
     LEFT JOIN patients p ON p.id = a.patient_id
     LEFT JOIN therapists t ON t.id = a.therapist_id
     WHERE a.clinic_id = ? AND a.date = ? AND a.status IN ('scheduled', 'completed', 'no_show')
     ORDER BY a.time ASC`
  ).bind(clinicId, today).all();

  const results = [];
  for (const apt of (appointments.results ?? []) as any[]) {
    const journey = await orchestrator.getPatientJourney(env, clinicId, apt.patient_id);
    results.push({
      appointment: {
        id: apt.id,
        time: apt.time,
        duration: apt.duration,
        status: apt.status,
        therapist_name: apt.therapist_name,
      },
      patient: {
        id: apt.patient_id,
        name: apt.patient_name,
      },
      journey_stage: journey.current_stage,
      journey_progress: journey.progress_pct,
      alerts: journey.alerts,
    });
  }

  return { date: today, appointments: results };
}

export async function getTherapistView(env: Env, clinicId: number, therapistId: number) {
  const profiles = await env.DB.prepare(
    `SELECT pp.id as profile_id, pp.patient_id, pp.status as profile_status, pp.assigned_diagnosis, pp.start_date,
            p.name as patient_name,
            pr.name as protocol_name, pr.total_sessions
     FROM tms_patient_profiles pp
     LEFT JOIN patients p ON p.id = pp.patient_id
     LEFT JOIN tms_protocols pr ON pr.id = pp.protocol_id
     WHERE pp.clinic_id = ? AND pp.therapist_id = ?
     ORDER BY pp.status ASC, pp.created_at DESC`
  ).bind(clinicId, therapistId).all();

  const results = [];
  for (const profile of (profiles.results ?? []) as any[]) {
    const completedCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM tms_sessions WHERE profile_id = ? AND status = \'completed\''
    ).bind(profile.profile_id).first<{ count: number }>();

    const nextSession = await env.DB.prepare(
      'SELECT id, session_number, status FROM tms_sessions WHERE profile_id = ? AND status IN (\'scheduled\', \'in_progress\') ORDER BY session_number ASC LIMIT 1'
    ).bind(profile.profile_id).first<{ id: number; session_number: number; status: string }>();

    const journey = await orchestrator.getPatientJourney(env, clinicId, profile.patient_id);

    const latestResponse = await env.DB.prepare(
      'SELECT mood_score, anxiety_score, overall_response, created_at FROM clinical_response_tracking WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(profile.patient_id).first();

    results.push({
      profile_id: profile.profile_id,
      patient_id: profile.patient_id,
      patient_name: profile.patient_name,
      protocol_name: profile.protocol_name,
      diagnosis: profile.assigned_diagnosis,
      profile_status: profile.profile_status,
      start_date: profile.start_date,
      sessions: {
        completed: completedCount?.count ?? 0,
        total: profile.total_sessions,
        percentage: profile.total_sessions > 0 ? Math.round(((completedCount?.count ?? 0) / profile.total_sessions) * 100) : 0,
      },
      next_session: nextSession ?? null,
      journey_stage: journey.current_stage,
      journey_progress: journey.progress_pct,
      latest_scores: latestResponse ?? null,
      alerts: journey.alerts,
    });
  }

  return { therapist_id: therapistId, patients: results };
}

export async function handleSessionCompletion(
  env: Env,
  clinicId: number,
  completionData: SessionCompletionData
) {
  return orchestrator.completeSessionWithIntegration(
    env,
    clinicId,
    completionData.session_id,
    completionData
  );
}

export async function handleStartTreatment(
  env: Env,
  clinicId: number,
  data: StartTreatmentInput
) {
  return orchestrator.startTreatment(
    env,
    clinicId,
    data.patient_id,
    data.protocol_id,
    data.therapist_id,
    data.motor_threshold_id,
    data.assigned_diagnosis,
    data.baseline_bdi,
    data.baseline_gad7,
    data.baseline_phq9
  );
}

export async function handleDischarge(
  env: Env,
  clinicId: number,
  patientId: number,
  finalNotes?: string
) {
  return orchestrator.dischargePatient(env, clinicId, patientId, finalNotes);
}
