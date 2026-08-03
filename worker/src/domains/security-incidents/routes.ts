import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateIncident } from './validators';
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

export async function handleListIncidents(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const result = await service.listIncidents(env, user.clinic_id);
  return json(result, 200, corsHeaders);
}

export async function handleGetIncident(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const result = await service.getIncident(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 404, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleCreateIncident(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validateIncident(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const result = await service.createIncident(env, user.clinic_id, validation.data);
  return json(result, 201, corsHeaders);
}

export async function handleResolveIncident(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/')[3] || '0');
  const result = await service.resolveIncident(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 404, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleDeleteIncident(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const result = await service.deleteIncident(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 404, corsHeaders);
  return json(result, 200, corsHeaders);
}