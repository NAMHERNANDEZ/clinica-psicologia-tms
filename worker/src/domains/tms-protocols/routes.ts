import type { Env, User } from '../../types';
import { validateTmsProtocol } from './validators';
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

export async function handleGetProtocols(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const result = await service.getProtocols(env, user.clinic_id);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetProtocol(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
    if (isNaN(id) || id <= 0) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);

    const result = await service.getProtocol(env, id);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleCreateProtocol(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateTmsProtocol(body);
    if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

    const result = await service.createProtocol(env, user.clinic_id, validation.data);
    return json(result, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleUpdateProtocol(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = parseInt(new URL(request.url).pathname.split('/')[3] || '0');
    if (isNaN(id) || id <= 0) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);

    const body = await request.json();
    const result = await service.updateProtocol(env, id, body);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleDeactivateProtocol(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = parseInt(new URL(request.url).pathname.split('/')[3] || '0');
    if (isNaN(id) || id <= 0) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);

    const result = await service.deactivateProtocol(env, id);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleSuggestProtocol(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json();
    const { indication, motorThreshold } = body as { indication?: string; motorThreshold?: number };

    if (!indication || typeof indication !== 'string') {
      return json({ success: false, error: 'Indicación requerida' }, 400, corsHeaders);
    }
    if (motorThreshold === undefined || typeof motorThreshold !== 'number' || motorThreshold <= 0) {
      return json({ success: false, error: 'Umbral motor requerido y debe ser mayor a 0' }, 400, corsHeaders);
    }

    const result = await service.suggestProtocol(env, user.clinic_id, indication, motorThreshold);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
