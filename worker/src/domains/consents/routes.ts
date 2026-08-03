import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateConsent } from './validators';
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

export async function handleListConsents(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:read');
  if (err) return applyCors(err, corsHeaders);

  const url = new URL(request.url);
  const patientId = parseInt(url.searchParams.get('patient_id') || '0');
  const result = await service.listConsents(env, user.clinic_id, patientId);
  return json(result, 200, corsHeaders);
}

export async function handleCreateConsent(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validateConsent(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const result = await service.createConsent(env, user.clinic_id, validation.data, ip);
  return json(result, 201, corsHeaders);
}

export async function handleGetConsent(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:read');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const result = await service.getConsent(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 404, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleRevokeConsent(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'clinical:write');
  if (err) return applyCors(err, corsHeaders);

  try {
    const parts = request.url.split('/');
    const id = parseInt(parts[parts.length - 2] || '0');
    if (!id) return json({ success: false, 'ID requerido': true }, 400, corsHeaders);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const result = await env.DB.prepare(
      `UPDATE consents SET status = 'revoked', revoked_at = datetime('now'), revoked_by = ?, updated_at = datetime('now') WHERE id = ? AND clinic_id = ?`
    ).bind(user.id, id, user.clinic_id).run();

    if (result.meta?.changes === 0) return json({ success: false, error: 'Consentimiento no encontrado' }, 404, corsHeaders);
    return json({ success: true, data: { id, status: 'revoked' } }, 200, corsHeaders);
  } catch (err) {
    console.error('Revoke consent error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}