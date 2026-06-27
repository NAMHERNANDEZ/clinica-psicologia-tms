import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validatePatient } from './validators';
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

export async function handleListPatients(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'patients:read');
  if (err) return applyCors(err, corsHeaders);

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || undefined;
  const result = await service.listPatients(env, user.clinic_id, search);
  return json(result, 200, corsHeaders);
}

export async function handleGetPatient(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'patients:read');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const result = await service.getPatient(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleCreatePatient(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'patients:write');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validatePatient(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.createPatient(env, user.clinic_id, user.id, validation.data, ip);
  return json(result, 201, corsHeaders);
}

export async function handleUpdatePatient(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'patients:write');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const body = await request.json();
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.updatePatient(env, user.clinic_id, user.id, id, body, ip);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleDeletePatient(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'patients:delete');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.deletePatient(env, user.clinic_id, user.id, id, ip);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}
