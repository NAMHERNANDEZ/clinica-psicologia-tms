import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateTimelineEvent } from './validators';
import * as service from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function applyCors(response: Response, corsHeaders: Record<string, string>): Response {
  Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export async function handleGetPatientTimeline(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const err = requirePermission(user, 'timeline:read');
    if (err) return applyCors(err, corsHeaders);

    const patientId = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
    if (!patientId) return json({ success: false, error: 'ID de paciente inválido' }, 400, corsHeaders);

    const result = await service.getPatientTimeline(env, patientId);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetClinicTimeline(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const err = requirePermission(user, 'timeline:read');
    if (err) return applyCors(err, corsHeaders);

    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 100;

    const result = await service.getClinicTimeline(env, user.clinic_id, limit);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleCreateEvent(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const err = requirePermission(user, 'timeline:write');
    if (err) return applyCors(err, corsHeaders);

    const body = await request.json();
    const validation = validateTimelineEvent(body);
    if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

    const result = await service.createEvent(env, user.clinic_id, validation.data);
    return json(result, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
