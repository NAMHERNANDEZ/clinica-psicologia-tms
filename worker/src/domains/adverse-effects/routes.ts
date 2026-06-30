import type { Env, User } from '../../types';
import * as service from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGetPatientEffects(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const patientId = parseInt(pathParts[pathParts.length - 1], 10);
    if (isNaN(patientId)) {
      return json({ success: false, error: 'Invalid patient_id' }, 400, corsHeaders);
    }
    const effects = await service.getPatientEffects(env, patientId);
    return json({ success: true, data: effects }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleRecordEffect(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const effect = await service.recordEffect(env, user.clinic_id, body);
    return json({ success: true, data: effect }, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 400, corsHeaders);
  }
}

export async function handleResolveEffect(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = parseInt(pathParts[pathParts.length - 2], 10);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid effect id' }, 400, corsHeaders);
    }
    const body = await request.json();
    await service.resolveEffect(env, id, body.action_taken);
    return json({ success: true, data: null }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 400, corsHeaders);
  }
}

export async function handleGetEffectStats(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const stats = await service.getEffectStats(env, user.clinic_id);
    return json({ success: true, data: stats }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}