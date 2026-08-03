import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateSessionNote } from './validators';
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

export async function handleListNotes(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:read');
  if (err) return applyCors(err, corsHeaders);

  const url = new URL(request.url);
  const patientId = parseInt(url.searchParams.get('patient_id') || '0');
  const result = await service.listNotes(env, user.clinic_id, patientId);
  return json(result, 200, corsHeaders);
}

export async function handleGetNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:read');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const result = await service.getNote(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 404, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleCreateNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validateSessionNote(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.createNote(env, user.clinic_id, user.id, validation.data, ip);
  return json(result, 201, corsHeaders);
}

export async function handleUpdateNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const body = await request.json() as any;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.updateNote(env, user.clinic_id, user.id, id, body, ip);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleDeleteNote(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.deleteNote(env, user.clinic_id, user.id, id, ip);
  if (!result.success) return json(result, result.status || 404, corsHeaders);
  return json(result, 200, corsHeaders);
}