import type { Env, User } from '../../types';
import * as service from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGetPatientMeasurements(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const patientId = parseInt(pathParts[pathParts.length - 1], 10);
    if (isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient_id' }, 400, corsHeaders);
    }
    const measurements = await service.getPatientMeasurements(env, patientId);
    return json({ success: true, data: measurements }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetClinicMeasurements(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const measurements = await service.getClinicMeasurements(env, user.clinic_id);
    return json({ success: true, data: measurements }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleRecordMeasurement(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const measurement = await service.recordMeasurement(env, user.clinic_id, body);
    return json({ success: true, data: measurement }, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    const message = 'Error de validación';
    return json({ success: false, error: message }, 400, corsHeaders);
  }
}

export async function handleDeleteMeasurement(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = parseInt(pathParts[pathParts.length - 1], 10);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid measurement id' }, 400, corsHeaders);
    }
    await service.deleteMeasurement(env, id);
    return json({ success: true, data: null }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
