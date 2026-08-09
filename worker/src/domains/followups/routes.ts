import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateFollowup, validateCompleteFollowup } from './validators';
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

// /api/followups/3 -> parts[3] = '3'
// /api/followups/3/complete -> parts[3] = '3'
function extractFollowupId(request: Request): number {
  const parts = request.url.split('/');
  return parseInt(parts[3] || '0');
}

export async function handleListFollowups(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'followups:read');
  if (err) return applyCors(err, corsHeaders);

  const url = new URL(request.url);
  const filters = {
    patient_id: url.searchParams.get('patient_id') ? parseInt(url.searchParams.get('patient_id')!) : undefined,
    status: url.searchParams.get('status') || undefined,
    type: url.searchParams.get('type') || undefined,
  };

  const result = await service.listFollowups(env, user.clinic_id, filters);
  return json(result, 200, corsHeaders);
}

export async function handleGetFollowup(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'followups:read');
  if (err) return applyCors(err, corsHeaders);

  const id = extractFollowupId(request);
  if (!id) return json({ success: false, error: 'ID invalido' }, 400, corsHeaders);

  const result = await service.getFollowup(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleCreateFollowup(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'followups:write');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validateFollowup(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.createFollowup(env, user.clinic_id, user.id, validation.data, ip);
  return json(result, 201, corsHeaders);
}

export async function handleUpdateFollowup(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'followups:write');
  if (err) return applyCors(err, corsHeaders);

  const id = extractFollowupId(request);
  if (!id) return json({ success: false, error: 'ID invalido' }, 400, corsHeaders);

  const body = await request.json() as Record<string, unknown>;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.updateFollowup(env, user.clinic_id, user.id, id, body, ip);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleCompleteFollowup(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'followups:write');
  if (err) return applyCors(err, corsHeaders);

  const id = extractFollowupId(request);
  if (!id) return json({ success: false, error: 'ID invalido' }, 400, corsHeaders);

  const body = await request.json();
  const validation = validateCompleteFollowup(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.completeFollowup(env, user.clinic_id, user.id, id, validation.data.outcome, validation.data.outcome_notes, ip);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleDeleteFollowup(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'followups:delete');
  if (err) return applyCors(err, corsHeaders);

  const id = extractFollowupId(request);
  if (!id) return json({ success: false, error: 'ID invalido' }, 400, corsHeaders);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.deleteFollowup(env, user.clinic_id, user.id, id, ip);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}
