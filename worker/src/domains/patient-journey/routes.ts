import type { Env, User } from '../../types';
import { validateSessionCompletion, validateStartTreatment, validateDischarge } from './validators';
import * as service from './service';
import * as orchestrator from './orchestrator';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGetPatientJourney(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const patientId = parseInt(segments[segments.length - 1] || '', 10);
    if (isNaN(patientId)) {
      return json({ success: false, error: 'ID de paciente inválido', requestId: crypto.randomUUID() }, 400, corsHeaders);
    }

    const journey = await orchestrator.getPatientJourney(env, user.clinic_id, patientId);
    return json({ success: true, data: journey, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err: any) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleStartTreatment(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateStartTreatment(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.errors.join(', '), requestId: crypto.randomUUID() }, 400, corsHeaders);
    }

    const result = await service.handleStartTreatment(env, user.clinic_id, validation.data!);
    return json({ success: true, data: result, requestId: crypto.randomUUID() }, 201, corsHeaders);
  } catch (err: any) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleCompleteSession(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateSessionCompletion(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.errors.join(', '), requestId: crypto.randomUUID() }, 400, corsHeaders);
    }

    const result = await service.handleSessionCompletion(env, user.clinic_id, validation.data!);
    return json({ success: true, data: result, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err: any) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleGetReceptionView(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const result = await service.getReceptionView(env, user.clinic_id);
    return json({ success: true, data: result, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err: any) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleGetTherapistView(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const therapistIdParam = url.searchParams.get('therapist_id');
    const therapistId = therapistIdParam ? parseInt(therapistIdParam, 10) : undefined;

    if (!therapistId || isNaN(therapistId)) {
      return json({ success: false, error: 'therapist_id es requerido', requestId: crypto.randomUUID() }, 400, corsHeaders);
    }

    const result = await service.getTherapistView(env, user.clinic_id, therapistId);
    return json({ success: true, data: result, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err: any) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleDischargePatient(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const patientId = parseInt(segments[segments.length - 1] || '', 10);
    if (isNaN(patientId)) {
      return json({ success: false, error: 'ID de paciente inválido', requestId: crypto.randomUUID() }, 400, corsHeaders);
    }

    let finalNotes: string | undefined;
    try {
      const body = await request.json();
      const validation = validateDischarge({ patient_id: patientId, ...body });
      if (!validation.valid) {
        return json({ success: false, error: validation.errors.join(', '), requestId: crypto.randomUUID() }, 400, corsHeaders);
      }
      finalNotes = body.final_notes;
    } catch {
      // No body is fine for discharge
    }

    const result = await service.handleDischarge(env, user.clinic_id, patientId, finalNotes);
    return json({ success: true, data: result, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err: any) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}
