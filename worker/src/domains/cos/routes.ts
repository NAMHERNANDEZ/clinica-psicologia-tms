import type { Env, User } from '../../types';

function jsonSuccess(data: unknown, corsHeaders: Record<string, string>, requestId: string): Response {
  return new Response(JSON.stringify({ success: true, data, requestId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function jsonError(error: string, status: number, corsHeaders: Record<string, string>, requestId: string): Response {
  return new Response(JSON.stringify({ success: false, error, requestId }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleCosToday(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    const clinicId = user.clinic_id;

    const appointmentsResult = await env.DB.prepare(
      `SELECT a.*, p.name as patient_name, t.name as therapist_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN therapists t ON a.therapist_id = t.id
       WHERE a.date = ? AND a.clinic_id = ?`
    ).bind(date, clinicId).all();

    const appointments = (appointmentsResult.results || []) as Record<string, unknown>[];
    const patientsResult = await env.DB.prepare(
      `SELECT id, name FROM patients WHERE clinic_id = ?`
    ).bind(clinicId).all();
    const allPatients = (patientsResult.results || []) as { id: number; name: string }[];
    const patientsWithAppt = new Set(appointments.map(a => a.patient_id));
    const patientsWithoutAppt = allPatients.filter(p => !patientsWithAppt.has(p.id));

    return jsonSuccess({
      date,
      total_appointments: appointments.length,
      waiting: appointments.filter(a => a.status === 'scheduled'),
      in_session: appointments.filter(a => a.status === 'completed'),
      completed: appointments.filter(a => a.status === 'completed'),
      cancelled: appointments.filter(a => a.status === 'cancelled'),
      no_show: appointments.filter(a => a.status === 'no_show'),
      patients_without_appointment: patientsWithoutAppt,
      urgent_alerts: 0,
    }, corsHeaders, requestId);
  } catch (err) {
    return jsonError('Error obteniendo datos del día', 500, corsHeaders, requestId);
  }
}

export async function handleCosNextAction(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string) {
  try {
    const url = new URL(request.url);
    const patientId = Number(url.searchParams.get('id'));

    if (!patientId) return jsonError('patient_id required', 400, corsHeaders, requestId);

    const patient = await env.DB.prepare(
      `SELECT * FROM patients WHERE id = ? AND clinic_id = ?`
    ).bind(patientId, user.clinic_id).first() as Record<string, unknown> | null;
    if (!patient) return jsonError('Patient not found', 404, corsHeaders, requestId);

    const profiles = await env.DB.prepare(
      `SELECT * FROM tms_profiles WHERE patient_id = ? AND clinic_id = ? ORDER BY id DESC`
    ).bind(patientId, user.clinic_id).all();
    const activeProfiles = (profiles.results || []).filter((p: Record<string, unknown>) => p.status === 'active');

    const thresholds = await env.DB.prepare(
      `SELECT * FROM motor_thresholds WHERE patient_id = ? AND clinic_id = ?`
    ).bind(patientId, user.clinic_id).all();

    let state = 'REGISTERED';
    if (activeProfiles.length > 0) state = 'IN_TREATMENT';
    else if ((profiles.results || []).some((p: Record<string, unknown>) => p.status === 'completed')) state = 'UNDER_OBSERVATION';
    else if ((profiles.results || []).some((p: Record<string, unknown>) => p.status === 'evaluation')) state = 'PROTOCOL_ASSIGNED';
    else if ((thresholds.results || []).length > 0) state = 'MT_MEASURED';
    else if ((patient as Record<string, unknown>).status === 'active') state = 'EVALUATED';

    const actionMap: Record<string, string> = {
      REGISTERED: 'EVALUATION_REQUIRED',
      EVALUATED: 'MT_MEASUREMENT_REQUIRED',
      MT_MEASURED: 'ASSIGN_TMS_PROTOCOL',
      PROTOCOL_ASSIGNED: 'SCHEDULE_SESSIONS',
      IN_TREATMENT: 'CONTINUE_SESSIONS',
      UNDER_OBSERVATION: 'FOLLOW_UP',
      DISCHARGED: 'NO_ACTION',
    };

    const progressMap: Record<string, number> = {
      REGISTERED: 0, EVALUATED: 14, MT_MEASURED: 28, PROTOCOL_ASSIGNED: 42,
      IN_TREATMENT: 71, UNDER_OBSERVATION: 85, DISCHARGED: 100,
    };

    return jsonSuccess({
      patient_id: patientId,
      patient_name: patient.name,
      current_state: state,
      next_action: actionMap[state],
      workflow_progress: progressMap[state],
      can_proceed: true,
      blocking_reasons: [],
    }, corsHeaders, requestId);
  } catch (err) {
    return jsonError('Error obteniendo siguiente acción', 500, corsHeaders, requestId);
  }
}

export async function handleCosPatientStates(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string) {
  try {
    const clinicId = user.clinic_id;

    const patientsResult = await env.DB.prepare(
      `SELECT id, name, status FROM patients WHERE clinic_id = ?`
    ).bind(clinicId).all();
    const patients = (patientsResult.results || []) as { id: number; name: string; status: string }[];

    const states = await Promise.all(patients.map(async (p) => {
      const profiles = await env.DB.prepare(
        `SELECT status FROM tms_profiles WHERE patient_id = ? AND clinic_id = ?`
      ).bind(p.id, clinicId).all();
      const thresholds = await env.DB.prepare(
        `SELECT id FROM motor_thresholds WHERE patient_id = ? AND clinic_id = ?`
      ).bind(p.id, clinicId).all();

      let state = 'REGISTERED';
      const profileStatuses = (profiles.results || []).map((pr: Record<string, unknown>) => pr.status);
      if (profileStatuses.includes('active')) state = 'IN_TREATMENT';
      else if (profileStatuses.includes('completed')) state = 'UNDER_OBSERVATION';
      else if (profileStatuses.includes('evaluation')) state = 'PROTOCOL_ASSIGNED';
      else if ((thresholds.results || []).length > 0) state = 'MT_MEASURED';
      else if (p.status === 'active') state = 'EVALUATED';

      const progressMap: Record<string, number> = {
        REGISTERED: 0, EVALUATED: 14, MT_MEASURED: 28, PROTOCOL_ASSIGNED: 42,
        IN_TREATMENT: 71, UNDER_OBSERVATION: 85, DISCHARGED: 100,
      };

      return {
        patient_id: p.id,
        patient_name: p.name,
        clinical_state: state,
        workflow_progress: progressMap[state],
      };
    }));

    const dist: Record<string, number> = {};
    for (const s of states) {
      dist[s.clinical_state] = (dist[s.clinical_state] || 0) + 1;
    }

    return jsonSuccess({
      states,
      distribution: dist,
      total: states.length,
      needs_attention: states.filter(s => ['REGISTERED', 'EVALUATED', 'MT_MEASURED'].includes(s.clinical_state)).length,
    }, corsHeaders, requestId);
  } catch (err) {
    return jsonError('Error obteniendo estados de pacientes', 500, corsHeaders, requestId);
  }
}

export async function handleCosTasks(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string) {
  try {
    const clinicId = user.clinic_id;

    const patientsResult = await env.DB.prepare(
      `SELECT id, name, status FROM patients WHERE clinic_id = ?`
    ).bind(clinicId).all();
    const patients = (patientsResult.results || []) as { id: number; name: string; status: string }[];
    const tasks: Array<{ id: string; type: string; patient_id: number; patient_name: string; priority: string; title: string; description: string }> = [];

    for (const p of patients) {
      const profiles = await env.DB.prepare(
        `SELECT id, status FROM tms_profiles WHERE patient_id = ? AND clinic_id = ?`
      ).bind(p.id, clinicId).all();
      const activeProfiles = (profiles.results || []).filter((pr: Record<string, unknown>) => pr.status === 'active');
      const thresholds = await env.DB.prepare(
        `SELECT id FROM motor_thresholds WHERE patient_id = ? AND clinic_id = ?`
      ).bind(p.id, clinicId).all();

      let state = 'REGISTERED';
      const profileStatuses = (profiles.results || []).map((pr: Record<string, unknown>) => pr.status);
      if (profileStatuses.includes('active')) state = 'IN_TREATMENT';
      else if (profileStatuses.includes('completed')) state = 'UNDER_OBSERVATION';
      else if (profileStatuses.includes('evaluation')) state = 'PROTOCOL_ASSIGNED';
      else if ((thresholds.results || []).length > 0) state = 'MT_MEASURED';
      else if (p.status === 'active') state = 'EVALUATED';

      if (state === 'REGISTERED') {
        tasks.push({ id: `eval-${p.id}`, type: 'EVALUATION_DUE', patient_id: p.id, patient_name: p.name, priority: 'high', title: 'Evaluación pendiente', description: `${p.name} necesita evaluación clínica inicial.` });
      }
      if (state === 'EVALUATED') {
        tasks.push({ id: `mt-${p.id}`, type: 'MT_MEASUREMENT_DUE', patient_id: p.id, patient_name: p.name, priority: 'high', title: 'Umbral motor pendiente', description: `${p.name} necesita medición de umbral motor.` });
      }
      if (state === 'MT_MEASURED') {
        tasks.push({ id: `proto-${p.id}`, type: 'PROTOCOL_ASSIGNMENT', patient_id: p.id, patient_name: p.name, priority: 'medium', title: 'Asignar protocolo TMS', description: `${p.name} necesita protocolo TMS asignado.` });
      }
    }

    tasks.sort((a, b) => {
      const prio: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (prio[a.priority] || 4) - (prio[b.priority] || 4);
    });

    return jsonSuccess({
      tasks,
      stats: {
        total: tasks.length,
        urgent: tasks.filter(t => t.priority === 'urgent').length,
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length,
      },
    }, corsHeaders, requestId);
  } catch (err) {
    return jsonError('Error obteniendo tareas', 500, corsHeaders, requestId);
  }
}

export async function handleCosAlerts(env: Env, request: Request, user: User, corsHeaders: Record<string, string>, requestId: string) {
  try {
    const clinicId = user.clinic_id;

    const patientsResult = await env.DB.prepare(
      `SELECT id, name FROM patients WHERE clinic_id = ?`
    ).bind(clinicId).all();
    const patients = (patientsResult.results || []) as { id: number; name: string }[];
    const alerts: Array<{ id: string; severity: string; type: string; title: string; message: string; patient_id: number; patient_name: string }> = [];

    for (const p of patients) {
      const effects = await env.DB.prepare(
        `SELECT * FROM adverse_effects WHERE patient_id = ? AND clinic_id = ? AND severity = 'severe' AND resolved = 0`
      ).bind(p.id, clinicId).all();

      if ((effects.results || []).length > 0) {
        alerts.push({
          id: `severe-${p.id}`,
          severity: 'critical',
          type: 'UNRESOLVED_SEVERE_EFFECT',
          title: 'Efecto adverso severo',
          message: `${p.name} tiene efectos adversos severos sin resolver.`,
          patient_id: p.id,
          patient_name: p.name,
        });
      }

      const sessions = await env.DB.prepare(
        `SELECT ts.* FROM tms_sessions ts
         JOIN tms_profiles tp ON ts.profile_id = tp.id
         WHERE tp.patient_id = ? AND tp.clinic_id = ? AND ts.status = 'no_show'`
      ).bind(p.id, clinicId).all();

      if ((sessions.results || []).length >= 2) {
        alerts.push({
          id: `missed-${p.id}`,
          severity: 'warning',
          type: 'MULTIPLE_MISSED_SESSIONS',
          title: 'Múltiples sesiones perdidas',
          message: `${p.name} ha perdido ${(sessions.results || []).length} sesiones.`,
          patient_id: p.id,
          patient_name: p.name,
        });
      }
    }

    return jsonSuccess({
      alerts,
      stats: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
      },
    }, corsHeaders, requestId);
  } catch (err) {
    return jsonError('Error obteniendo alertas', 500, corsHeaders, requestId);
  }
}
