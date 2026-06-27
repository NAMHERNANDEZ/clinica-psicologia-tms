import type { Env, User } from '../../types';
import { validateTmsProfile } from './validators';
import * as service from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGetPatientProfiles(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split('/');
    const patientId = parseInt(segments[segments.length - 1] || '0');
    if (isNaN(patientId) || patientId <= 0) return json({ success: false, error: 'ID de paciente inválido' }, 400, corsHeaders);

    const result = await service.getPatientProfiles(env, patientId);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetClinicProfiles(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const result = await service.getClinicProfiles(env, user.clinic_id);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetProfile(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = parseInt(new URL(request.url).pathname.split('/').pop() || '0');
    if (isNaN(id) || id <= 0) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);

    const result = await service.getProfile(env, id);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleCreateProfile(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateTmsProfile(body);
    if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

    const result = await service.createProfile(env, user.clinic_id, validation.data);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleActivateProfile(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = parseInt(new URL(request.url).pathname.split('/')[4] || '0');
    if (isNaN(id) || id <= 0) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);

    const result = await service.activateProfile(env, id);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleCompleteProfile(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = parseInt(new URL(request.url).pathname.split('/')[4] || '0');
    if (isNaN(id) || id <= 0) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);

    const result = await service.completeProfile(env, id);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleDiscontinueProfile(env: Env, request: Request, user: User, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const id = parseInt(new URL(request.url).pathname.split('/')[4] || '0');
    if (isNaN(id) || id <= 0) return json({ success: false, error: 'ID inválido' }, 400, corsHeaders);

    const result = await service.discontinueProfile(env, id);
    if (!result.success) return json(result, result.status || 400, corsHeaders);
    return json(result, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
