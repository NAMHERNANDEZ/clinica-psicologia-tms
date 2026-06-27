import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateAppointment } from './validators';
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

export async function handleListAppointments(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'appointments:read');
  if (err) return applyCors(err, corsHeaders);

  const url = new URL(request.url);
  const filters = {
    date: url.searchParams.get('date') || undefined,
    therapist_id: url.searchParams.get('therapist_id') ? parseInt(url.searchParams.get('therapist_id')!) : undefined,
    patient_id: url.searchParams.get('patient_id') ? parseInt(url.searchParams.get('patient_id')!) : undefined,
  };

  const result = await service.listAppointments(env, user.clinic_id, filters);
  return json(result, 200, corsHeaders);
}

export async function handleGetAppointment(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'appointments:read');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const result = await service.getAppointment(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleCreateAppointment(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'appointments:write');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validateAppointment(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.createAppointment(env, user.clinic_id, user.id, validation.data, ip);
  return json(result, 201, corsHeaders);
}

export async function handleUpdateAppointment(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'appointments:write');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const body = await request.json();
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.updateAppointment(env, user.clinic_id, user.id, id, body, ip);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleDeleteAppointment(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'appointments:delete');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.deleteAppointment(env, user.clinic_id, user.id, id, ip);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}
