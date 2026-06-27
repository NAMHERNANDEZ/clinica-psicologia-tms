import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateSessionUpdate } from './validators';
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

export async function handleGetSessions(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'sessions:read');
  if (err) return applyCors(err, corsHeaders);

  const treatmentId = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  if (!treatmentId) return json({ success: false, error: 'ID de tratamiento requerido' }, 400, corsHeaders);

  const result = await service.getTreatmentSessions(env, treatmentId);
  return json(result, 200, corsHeaders);
}

export async function handleCompleteSession(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'sessions:write');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validateSessionUpdate(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);
  if (validation.data.status !== 'completed') return json({ success: false, error: 'Use POST con status completed' }, 400, corsHeaders);

  const result = await service.completeSession(env, validation.data.session_id);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleUpdateSession(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'sessions:write');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validateSessionUpdate(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const result = await service.updateSessionStatus(env, validation.data.session_id, validation.data.status, validation.data.notes);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}
