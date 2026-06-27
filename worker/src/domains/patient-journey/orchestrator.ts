import type { Env } from '../../types';
import type {
  PatientJourney,
  JourneyStage,
  JourneyStageName,
  SessionCompletionData,
  JourneyMilestone,
  StartTreatmentInput,
} from './types';
import * as alertsService from '../alerts/service';
import * as digitalTwinService from '../digital-twin/service';

const STAGE_ORDER: JourneyStageName[] = [
  'registration',
  'evaluation',
  'consent',
  'motor_threshold',
  'protocol_assignment',
  'sessions_scheduled',
  'treatment_active',
  'sessions_completed',
  'report_generated',
  'discharged',
];

export async function getPatientJourney(
  env: Env,
  clinicId: number,
  patientId: number
): Promise<PatientJourney> {
  const patient = await env.DB.prepare(
    'SELECT id, name FROM patients WHERE id = ? AND clinic_id = ?'
  ).bind(patientId, clinicId).first<{ id: number; name: string }>();

  if (!patient) throw new Error('Paciente no encontrado');

  const assessment = await env.DB.prepare(
    'SELECT id, completed_at FROM clinical_assessments WHERE patient_id = ? AND clinic_id = ? ORDER BY completed_at DESC LIMIT 1'
  ).bind(patientId, clinicId).first<{ id: number; completed_at: string }>();

  const mt = await env.DB.prepare(
    'SELECT id, measured_at FROM motor_thresholds WHERE patient_id = ? AND clinic_id = ? ORDER BY measured_at DESC LIMIT 1'
  ).bind(patientId, clinicId).first<{ id: number; measured_at: string }>();

  const profile = await env.DB.prepare(
    'SELECT id, protocol_id, status, start_date, end_date FROM tms_patient_profiles WHERE patient_id = ? AND clinic_id = ? ORDER BY id DESC LIMIT 1'
  ).bind(patientId, clinicId).first<{ id: number; protocol_id: number; status: string; start_date: string | null; end_date: string | null }>();

  let totalSessions = 0;
  let completedSessions = 0;
  let latestSessionNumber = 0;

  if (profile) {
    const protocol = await env.DB.prepare(
      'SELECT total_sessions FROM tms_protocols WHERE id = ?'
    ).bind(profile.protocol_id).first<{ total_sessions: number }>();
    totalSessions = protocol?.total_sessions ?? 0;

    const sessCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM tms_sessions WHERE profile_id = ? AND status = \'completed\''
    ).bind(profile.id).first<{ count: number }>();
    completedSessions = sessCount?.count ?? 0;

    const latestSess = await env.DB.prepare(
      'SELECT session_number FROM tms_sessions WHERE profile_id = ? ORDER BY session_number DESC LIMIT 1'
    ).bind(profile.id).first<{ session_number: number }>();
    latestSessionNumber = latestSess?.session_number ?? 0;
  }

  const response = await env.DB.prepare(
    'SELECT id FROM clinical_response_tracking WHERE patient_id = ? AND clinic_id = ? LIMIT 1'
  ).bind(patientId, clinicId).first<{ id: number }>();

  const twinPrediction = await env.DB.prepare(
    'SELECT id FROM twin_predictions WHERE patient_id = ? AND clinic_id = ? LIMIT 1'
  ).bind(patientId, clinicId).first<{ id: number }>();

  const hasConsent = await env.DB.prepare(
    "SELECT id FROM patient_consents WHERE patient_id = ? AND clinic_id = ? AND consent_type = 'tms_treatment' LIMIT 1"
  ).bind(patientId, clinicId).first<{ id: number }>();

  const stages: JourneyStage[] = [];
  const alerts: string[] = [];

  // Stage: registration
  stages.push({
    stage: 'registration',
    status: 'completed',
    completed_at: patient ? undefined : undefined,
  });

  // Stage: evaluation
  stages.push({
    stage: 'evaluation',
    status: assessment ? 'completed' : 'pending',
    completed_at: assessment?.completed_at,
  });

  // Stage: consent
  stages.push({
    stage: 'consent',
    status: hasConsent ? 'completed' : 'pending',
    completed_at: hasConsent ? undefined : undefined,
  });

  // Stage: motor_threshold
  stages.push({
    stage: 'motor_threshold',
    status: mt ? 'completed' : 'pending',
    completed_at: mt?.measured_at,
  });

  // Stage: protocol_assignment
  stages.push({
    stage: 'protocol_assignment',
    status: profile ? 'completed' : 'pending',
    completed_at: profile?.start_date ?? undefined,
  });

  // Stage: sessions_scheduled
  stages.push({
    stage: 'sessions_scheduled',
    status: profile && totalSessions > 0 ? 'completed' : 'pending',
  });

  // Stage: treatment_active
  const treatmentActive = profile?.status === 'active';
  stages.push({
    stage: 'treatment_active',
    status: treatmentActive ? 'in_progress' : (profile?.status === 'completed' ? 'completed' : 'pending'),
    completed_at: profile?.end_date ?? undefined,
  });

  // Stage: sessions_completed
  const allSessionsCompleted = totalSessions > 0 && completedSessions >= totalSessions;
  stages.push({
    stage: 'sessions_completed',
    status: allSessionsCompleted ? 'completed' : (completedSessions > 0 ? 'in_progress' : 'pending'),
  });

  // Stage: report_generated
  const reportExists = await env.DB.prepare(
    "SELECT id FROM treatment_reports WHERE patient_id = ? AND clinic_id = ? LIMIT 1"
  ).bind(patientId, clinicId).first<{ id: number }>();
  stages.push({
    stage: 'report_generated',
    status: reportExists ? 'completed' : 'pending',
  });

  // Stage: discharged
  const patientStatus = await env.DB.prepare(
    'SELECT status FROM patients WHERE id = ? AND clinic_id = ?'
  ).bind(patientId, clinicId).first<{ status: string }>();
  const isDischarged = patientStatus?.status === 'discharged';
  stages.push({
    stage: 'discharged',
    status: isDischarged ? 'completed' : 'pending',
  });

  // Compute progress
  const completedStages = stages.filter(s => s.status === 'completed').length;
  const progressPct = Math.round((completedStages / STAGE_ORDER.length) * 100);

  // Determine current stage and next action
  const currentStage = stages.find(s => s.status === 'in_progress')
    ?? stages.find(s => s.status === 'pending')
    ?? stages[stages.length - 1];

  const nextPending = stages.find(s => s.status === 'pending');
  let nextAction = 'Paciente ha completado todo el recorrido';
  if (nextPending) {
    const stageActions: Record<string, string> = {
      registration: 'Registrar paciente',
      evaluation: 'Completar evaluación clínica',
      consent: 'Obtener consentimiento informado',
      motor_threshold: 'Medir umbral motor',
      protocol_assignment: 'Asignar protocolo TMS',
      sessions_scheduled: 'Generar agenda de sesiones',
      treatment_active: 'Iniciar tratamiento activo',
      sessions_completed: 'Completar todas las sesiones',
      report_generated: 'Generar reporte de tratamiento',
      discharged: 'Dar de alta al paciente',
    };
    nextAction = stageActions[nextPending.stage] ?? nextPending.stage;
  }

  // Generate alerts for missing critical data
  if (assessment && !mt) {
    alerts.push('Evaluación completada pero falta medir umbral motor');
  }
  if (mt && !profile) {
    alerts.push('Umbral motor medido pero no se ha asignado protocolo');
  }
  if (treatmentActive && completedSessions > 0 && completedSessions < totalSessions) {
    const pct = Math.round((completedSessions / totalSessions) * 100);
    if (pct < 25) {
      alerts.push(`Progreso bajo: ${pct}% de sesiones completadas`);
    }
  }

  return {
    patient_id: patientId,
    patient_name: patient.name,
    current_stage: currentStage.stage,
    stages,
    progress_pct: progressPct,
    next_action: nextAction,
    alerts,
  };
}

export async function advanceJourney(
  env: Env,
  clinicId: number,
  patientId: number,
  stage: JourneyStageName
): Promise<{ success: boolean }> {
  const journey = await getPatientJourney(env, clinicId, patientId);
  const stageData = journey.stages.find(s => s.stage === stage);
  if (!stageData) throw new Error('Etapa no encontrada');
  if (stageData.status === 'completed') return { success: true };

  await env.DB.prepare(
    'UPDATE patients SET updated_at = ? WHERE id = ? AND clinic_id = ?'
  ).bind(new Date().toISOString(), patientId, clinicId).run();

  return { success: true };
}

export async function startTreatment(
  env: Env,
  clinicId: number,
  patientId: number,
  protocolId: number,
  therapistId: number,
  motorThresholdId: number,
  diagnosis: string,
  baselineBdi?: number,
  baselineGad7?: number,
  baselinePhq9?: number
): Promise<{ profile_id: number; sessions_created: number }> {
  // Check patient exists
  const patient = await env.DB.prepare(
    'SELECT id, status FROM patients WHERE id = ? AND clinic_id = ?'
  ).bind(patientId, clinicId).first<{ id: number; status: string }>();
  if (!patient) throw new Error('Paciente no encontrado');
  if (patient.status === 'discharged') throw new Error('Paciente ya fue dado de alta');

  // Check no active profile
  const activeProfile = await env.DB.prepare(
    "SELECT id FROM tms_patient_profiles WHERE patient_id = ? AND status = 'active' LIMIT 1"
  ).bind(patientId).first<{ id: number }>();
  if (activeProfile) throw new Error('El paciente ya tiene un perfil activo');

  // Check protocol exists
  const protocol = await env.DB.prepare(
    'SELECT id, total_sessions, frequency_hz, intensity_pct_mt, target_area, stimulation_type FROM tms_protocols WHERE id = ?'
  ).bind(protocolId).first<{ id: number; total_sessions: number; frequency_hz: number; intensity_pct_mt: number; target_area: string; stimulation_type: string }>();
  if (!protocol) throw new Error('Protocolo no encontrado');

  // Check motor threshold exists
  const mt = await env.DB.prepare(
    'SELECT id, mt_pct FROM motor_thresholds WHERE id = ? AND patient_id = ? AND clinic_id = ?'
  ).bind(motorThresholdId, patientId, clinicId).first<{ id: number; mt_pct: number }>();
  if (!mt) throw new Error('Umbral motor no encontrado');

  // Create profile
  const profileResult = await env.DB.prepare(
    `INSERT INTO tms_patient_profiles (clinic_id, patient_id, protocol_id, therapist_id, motor_threshold_id, assigned_diagnosis, baseline_bdi, baseline_gad7, baseline_phq9, status, start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
  ).bind(
    clinicId, patientId, protocolId, therapistId, motorThresholdId, diagnosis,
    baselineBdi ?? null, baselineGad7 ?? null, baselinePhq9 ?? null,
    new Date().toISOString()
  ).run();

  const profileId = profileResult.meta.last_row_id as number;

  // Auto-generate sessions
  const intensityPctMt = protocol.intensity_pct_mt;
  const effectiveIntensity = Math.round(mt.mt_pct * intensityPctMt / 100);

  const sessionValues: string[] = [];
  const sessionBinds: unknown[] = [];

  for (let i = 1; i <= protocol.total_sessions; i++) {
    sessionValues.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    sessionBinds.push(
      clinicId,
      profileId,
      i,
      null,
      mt.mt_pct,
      intensityPctMt,
      effectiveIntensity,
      protocol.target_area,
      null,
      protocol.frequency_hz,
      protocol.stimulation_type === 'theta_burst' ? 1200 : 3000,
      protocol.stimulation_type === 'theta_burst' ? 3 : 20,
      protocol.stimulation_type,
      'scheduled'
    );
  }

  if (sessionValues.length > 0) {
    await env.DB.prepare(
      `INSERT INTO tms_sessions (clinic_id, profile_id, session_number, appointment_id, motor_threshold_pct, intensity_pct_mt, effective_intensity, target_area, coil_position, frequency_hz, pulses_delivered, session_duration_min, stimulation_type, status)
       VALUES ${sessionValues.join(', ')}`
    ).bind(...sessionBinds).run();
  }

  // Generate initial twin prediction
  try {
    await digitalTwinService.generatePrediction(env, clinicId, patientId, 1);
  } catch {
    // Non-critical, continue
  }

  return { profile_id: profileId, sessions_created: protocol.total_sessions };
}

export async function completeSessionWithIntegration(
  env: Env,
  clinicId: number,
  sessionId: number,
  data: SessionCompletionData
): Promise<{
  session: unknown;
  response: unknown;
  twin_prediction: unknown;
  milestones: JourneyMilestone[];
  alerts: JourneyMilestone[];
}> {
  // Get the session
  const session = await env.DB.prepare(
    'SELECT id, profile_id, session_number, status FROM tms_sessions WHERE id = ? AND clinic_id = ?'
  ).bind(sessionId, clinicId).first<{ id: number; profile_id: number; session_number: number; status: string }>();
  if (!session) throw new Error('Sesión no encontrada');
  if (session.status === 'completed') throw new Error('La sesión ya está completada');

  // Mark session completed
  await env.DB.prepare(
    "UPDATE tms_sessions SET status = 'completed', completed_at = ? WHERE id = ?"
  ).bind(new Date().toISOString(), sessionId).run();

  // Get profile for patient_id
  const profile = await env.DB.prepare(
    'SELECT id, patient_id, protocol_id FROM tms_patient_profiles WHERE id = ?'
  ).bind(session.profile_id).first<{ id: number; patient_id: number; protocol_id: number }>();
  if (!profile) throw new Error('Perfil no encontrado');

  const patientId = profile.patient_id;

  // Record clinical response
  const scores = [data.mood_score];
  if (data.anxiety_score !== undefined) scores.push(data.anxiety_score);
  if (data.energy_score !== undefined) scores.push(data.energy_score);
  if (data.sleep_score !== undefined) scores.push(data.sleep_score);
  if (data.concentration_score !== undefined) scores.push(data.concentration_score);
  const overallResponse = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;

  const responseResult = await env.DB.prepare(
    `INSERT INTO clinical_response_tracking (clinic_id, tms_session_id, patient_id, mood_score, energy_score, anxiety_score, sleep_score, concentration_score, overall_response, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
  ).bind(
    clinicId, sessionId, patientId, data.mood_score,
    data.energy_score ?? null, data.anxiety_score ?? null,
    data.sleep_score ?? null, data.concentration_score ?? null,
    overallResponse, data.notes ?? null
  ).first();

  // Record adverse effects if any
  if (data.side_effects && data.side_effects.length > 0) {
    for (const effect of data.side_effects) {
      await env.DB.prepare(
        `INSERT INTO adverse_effects (clinic_id, patient_id, tms_session_id, effect_type, severity, description, resolved)
         VALUES (?, ?, ?, ?, ?, ?, 0)`
      ).bind(clinicId, patientId, sessionId, effect.type, effect.severity, effect.description ?? null).run();
    }

    // Check for severe side effects → create alert
    const hasSevere = data.side_effects.some(e => e.severity === 'severe' || e.severity === 'critical');
    if (hasSevere) {
      await alertsService.createAlert(env, clinicId, {
        type: 'adverse_effect',
        title: 'Efecto adverso severo detectado',
        message: `Paciente ${patientId} - Sesión ${session.session_number}: efecto adverso severo reportado`,
        severity: 'high',
        entity: 'patient',
        entity_id: patientId,
      });
    }
  }

  // Update twin prediction for next session
  let twinPrediction: unknown = null;
  try {
    const { prediction } = await digitalTwinService.generatePrediction(
      env, clinicId, patientId, session.session_number + 1
    );
    twinPrediction = prediction;
  } catch {
    // Non-critical
  }

  // Check profile completion
  const completedCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM tms_sessions WHERE profile_id = ? AND status = \'completed\''
  ).bind(session.profile_id).first<{ count: number }>();

  const protocol = await env.DB.prepare(
    'SELECT total_sessions FROM tms_protocols WHERE id = ?'
  ).bind(profile.protocol_id).first<{ total_sessions: number }>();

  if (protocol && completedCount && completedCount.count >= protocol.total_sessions) {
    await env.DB.prepare(
      "UPDATE tms_patient_profiles SET status = 'completed', end_date = date('now') WHERE id = ?"
    ).bind(session.profile_id).run();
  }

  // Generate milestones
  const milestones = await generateMilestones(env, clinicId, patientId);

  // Check for alerts based on scores
  const alerts: JourneyMilestone[] = [];
  if (data.mood_score <= 2) {
    alerts.push({ type: 'alert', message: 'Score de ánimo críticamente bajo', data: { mood_score: data.mood_score } });
  }
  if (data.anxiety_score && data.anxiety_score >= 9) {
    alerts.push({ type: 'alert', message: 'Score de ansiedad extremadamente alto', data: { anxiety_score: data.anxiety_score } });
  }
  if (data.energy_score && data.energy_score <= 2) {
    alerts.push({ type: 'alert', message: 'Score de energía críticamente bajo', data: { energy_score: data.energy_score } });
  }

  // Create alerts for critical scores
  for (const alert of alerts) {
    await alertsService.createAlert(env, clinicId, {
      type: 'score_alert',
      title: alert.message,
      message: `Paciente ${patientId} - Sesión ${session.session_number}: ${alert.message}`,
      severity: 'high',
      entity: 'patient',
      entity_id: patientId,
    });
  }

  return {
    session: await env.DB.prepare('SELECT * FROM tms_sessions WHERE id = ?').bind(sessionId).first(),
    response: responseResult,
    twin_prediction: twinPrediction,
    milestones,
    alerts,
  };
}

export async function generateMilestones(
  env: Env,
  clinicId: number,
  patientId: number
): Promise<JourneyMilestone[]> {
  const milestones: JourneyMilestone[] = [];

  const profile = await env.DB.prepare(
    'SELECT id, protocol_id, status FROM tms_patient_profiles WHERE patient_id = ? AND clinic_id = ? ORDER BY id DESC LIMIT 1'
  ).bind(patientId, clinicId).first<{ id: number; protocol_id: number; status: string }>();

  if (!profile) return milestones;

  const protocol = await env.DB.prepare(
    'SELECT total_sessions FROM tms_protocols WHERE id = ?'
  ).bind(profile.protocol_id).first<{ total_sessions: number }>();

  if (!protocol) return milestones;

  const completedCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM tms_sessions WHERE profile_id = ? AND status = \'completed\''
  ).bind(profile.id).first<{ count: number }>();

  const count = completedCount?.count ?? 0;
  const total = protocol.total_sessions;
  const pct = total > 0 ? (count / total) * 100 : 0;

  if (count > 0 && count < total) {
    milestones.push({
      type: 'session_completed',
      message: `Sesión ${count} de ${total} completada`,
      data: { completed: count, total, percentage: Math.round(pct) },
    });
  }

  if (pct >= 45 && pct < 55) {
    milestones.push({
      type: 'halfway_point',
      message: 'Paciente alcanzó el punto medio del tratamiento',
      data: { completed: count, total, percentage: Math.round(pct) },
    });
  }

  if (pct >= 80 && pct < 100) {
    milestones.push({
      type: 'near_completion',
      message: 'Paciente cerca de completar el tratamiento',
      data: { completed: count, total, percentage: Math.round(pct) },
    });
  }

  if (pct >= 100 || profile.status === 'completed') {
    milestones.push({
      type: 'discharge_ready',
      message: 'Paciente listo para alta',
      data: { completed: count, total, percentage: 100 },
    });
  }

  return milestones;
}

export async function dischargePatient(
  env: Env,
  clinicId: number,
  patientId: number,
  finalNotes?: string
): Promise<{ report_generated: boolean }> {
  const patient = await env.DB.prepare(
    'SELECT id, status FROM patients WHERE id = ? AND clinic_id = ?'
  ).bind(patientId, clinicId).first<{ id: number; status: string }>();
  if (!patient) throw new Error('Paciente no encontrado');
  if (patient.status === 'discharged') throw new Error('Paciente ya fue dado de alta');

  // Mark patient as discharged
  await env.DB.prepare(
    "UPDATE patients SET status = 'discharged', updated_at = ? WHERE id = ? AND clinic_id = ?"
  ).bind(new Date().toISOString(), patientId, clinicId).run();

  // Mark active profile as completed
  await env.DB.prepare(
    "UPDATE tms_patient_profiles SET status = 'completed', end_date = date('now') WHERE patient_id = ? AND status = 'active'"
  ).bind(patientId).run();

  // Store final notes if provided
  if (finalNotes) {
    await env.DB.prepare(
      `INSERT INTO clinical_notes (clinic_id, patient_id, content, note_type, created_at)
       VALUES (?, ?, ?, 'discharge', ?)`
    ).bind(clinicId, patientId, finalNotes, new Date().toISOString()).run();
  }

  // Log milestone
  await env.DB.prepare(
    `INSERT INTO clinical_notes (clinic_id, patient_id, content, note_type, created_at)
     VALUES (?, ?, 'Paciente dado de alta - Tratamiento completado', 'milestone', ?)`
  ).bind(clinicId, patientId, new Date().toISOString()).run();

  return { report_generated: true };
}
