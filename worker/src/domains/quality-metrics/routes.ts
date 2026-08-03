import type { Env, User } from '../../types';
import { requirePermission } from '../../middleware/require-role';
import { validateQualityMetric, parseDateRange } from './validators';
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

export async function handleListMetrics(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const url = new URL(request.url);
  const { from, to } = parseDateRange(url.searchParams);
  const result = await service.listMetrics(env, user.clinic_id, from, to);
  return json(result, 200, corsHeaders);
}

export async function handleGetMetric(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const result = await service.getMetric(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 404, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleCreateMetric(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const body = await request.json();
  const validation = validateQualityMetric(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, validation.status, corsHeaders);

  const result = await service.createMetric(env, user.clinic_id, validation.data);
  return json(result, 201, corsHeaders);
}

export async function handleDeleteMetric(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
  const result = await service.deleteMetric(env, user.clinic_id, id);
  if (!result.success) return json(result, result.status || 404, corsHeaders);
  return json(result, 200, corsHeaders);
}

export async function handleGetSummary(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const result = await service.getSummary(env, user.clinic_id);
  return json(result, 200, corsHeaders);
}

export async function handleGetDashboard(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const err = requirePermission(user, 'admin:access');
  if (err) return applyCors(err, corsHeaders);

  const result = await service.getDashboard(env, user.clinic_id);
  return json(result, 200, corsHeaders);
}
