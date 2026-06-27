import type { Env, User } from '../../types';
import { validatePatientId } from './validators';
import * as service from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function getRequestId(): string {
  return crypto.randomUUID();
}

function getPatientIdFromUrl(request: Request): number | null {
  const path = new URL(request.url).pathname;
  const segments = path.split('/');
  const lastSegment = segments[segments.length - 1];
  const id = parseInt(lastSegment);
  return isNaN(id) ? null : id;
}

export async function handleGetPatientDashboard(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const patientId = getPatientIdFromUrl(request);
    if (patientId === null) {
      return json({ success: false, error: 'patient_id inválido', requestId }, 400, corsHeaders);
    }

    const validation = validatePatientId(patientId);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    const result = await service.getPatientDashboard(env, validation.data);
    const status = (result as { status?: number }).status || 200;
    return json({ ...result, requestId }, status, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleAnalyzeResponse(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const patientId = getPatientIdFromUrl(request);
    if (patientId === null) {
      return json({ success: false, error: 'patient_id inválido', requestId }, 400, corsHeaders);
    }

    const validation = validatePatientId(patientId);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    const result = await service.analyzeResponse(env, validation.data);
    const status = (result as { status?: number }).status || 200;
    return json({ ...result, requestId }, status, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleSuggestAdjustment(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const patientId = getPatientIdFromUrl(request);
    if (patientId === null) {
      return json({ success: false, error: 'patient_id inválido', requestId }, 400, corsHeaders);
    }

    const validation = validatePatientId(patientId);
    if (!validation.valid) {
      return json({ success: false, error: validation.error, requestId }, 400, corsHeaders);
    }

    const result = await service.suggestAdjustment(env, validation.data);
    const status = (result as { status?: number }).status || 200;
    return json({ ...result, requestId }, status, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleGetProtocolEfficiency(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const result = await service.getProtocolEfficiency(env, user.clinic_id);
    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}

export async function handleGetTmsDashboard(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  const requestId = getRequestId();
  try {
    const result = await service.getTmsDashboard(env, user.clinic_id);
    return json({ ...result, requestId }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error', requestId }, 500, corsHeaders);
  }
}
