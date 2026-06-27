import type { Env, User } from '../../types';
import { validateTmsSession, validateTmsSessionUpdateStatus } from './validators';
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

function getRequestId(): string {
  return crypto.randomUUID();
}

export async function handleGetProfileSessions(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const profileId = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
    if (isNaN(profileId) || profileId <= 0) {
      return json({ success: false, error: 'ID de perfil inválido', requestId }, 400, corsHeaders);
    }

    const result = await service.getProfileSessions(env, profileId);
    if (!result.success) return json({ ...result, requestId }, (result as { status?: number }).status || 400, corsHeaders);
    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleCreateSession(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json();
    const validation = validateTmsSession(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    const result = await service.createSession(env, user.clinic_id, validation.data);
    return json({ ...result, requestId }, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleCompleteSession(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json();
    const { session_id } = body as { session_id?: number };

    if (!session_id || typeof session_id !== 'number') {
      return json({ success: false, error: 'session_id requerido', requestId }, 400, corsHeaders);
    }

    const result = await service.completeSession(env, session_id);
    if (!result.success) return json({ ...result, requestId }, (result as { status?: number }).status || 400, corsHeaders);
    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleUpdateSession(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const body = await request.json();
    const validation = validateTmsSessionUpdateStatus(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    const result = await service.updateSessionStatus(env, validation.data.session_id, validation.data.status, validation.data.notes);
    if (!result.success) return json({ ...result, requestId }, (result as { status?: number }).status || 400, corsHeaders);
    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}
