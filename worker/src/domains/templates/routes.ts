import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateTemplate } from './validators';
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

export async function handleGetTemplates(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'templates:read');
  if (err) return applyCors(err, corsHeaders);

  const result = await service.getTemplates(env, user.clinic_id);
  return json(result, 200, corsHeaders);
}

export async function handleCreateTemplate(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'templates:write');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validateTemplate(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const result = await service.createTemplate(env, user.clinic_id, validation.data);
  return json(result, 201, corsHeaders);
}

export async function handleUpdateTemplate(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'templates:write');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const body = await request.json();
  const validation = validateTemplate(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const result = await service.updateTemplate(env, id, validation.data);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleDeleteTemplate(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'templates:delete');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const result = await service.deleteTemplate(env, id);
  if (!result.success) return json(result, result.status || 400, corsHeaders);
  return json(result, 200, corsHeaders);
}
