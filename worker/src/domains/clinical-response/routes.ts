import type { Env, User } from '../../types';
import { validateClinicalResponseInput } from './validators';
import * as service from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGetPatientResponses(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const patientId = parseInt(url.pathname.split('/').pop() || '', 10);
    if (isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient ID', requestId: crypto.randomUUID() }, 400, corsHeaders);
    }
    const responses = await service.getPatientResponses(env, patientId);
    return json({ success: true, data: responses, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleGetSessionResponse(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const sessionId = parseInt(segments[segments.length - 1] || '', 10);
    if (isNaN(sessionId)) {
      return json({ success: false, error: 'Invalid session ID', requestId: crypto.randomUUID() }, 400, corsHeaders);
    }
    const response = await service.getSessionResponse(env, sessionId);
    if (!response) {
      return json({ success: false, error: 'Response not found', requestId: crypto.randomUUID() }, 404, corsHeaders);
    }
    return json({ success: true, data: response, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleRecordResponse(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateClinicalResponseInput(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.errors.join(', '), requestId: crypto.randomUUID() }, 400, corsHeaders);
    }
    const response = await service.recordResponse(env, user.clinic_id, validation.data!);
    return json({ success: true, data: response, requestId: crypto.randomUUID() }, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}

export async function handleGetProgressCurve(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const patientId = parseInt(segments[segments.length - 2] || '', 10);
    if (isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient ID', requestId: crypto.randomUUID() }, 400, corsHeaders);
    }
    const curve = await service.getProgressCurve(env, patientId);
    return json({ success: true, data: curve, requestId: crypto.randomUUID() }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId: crypto.randomUUID() }, 500, corsHeaders);
  }
}