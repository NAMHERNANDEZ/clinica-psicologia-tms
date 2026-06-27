import type { Env, User } from '../../types';
import * as service from './service';
import { validateReceptionEntry } from './validators';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGetReceptionQueue(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const dashboard = await service.getReceptionDashboard(env, user.clinic_id);
    return json({ success: true, data: dashboard }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleAddToQueue(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateReceptionEntry(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error }, 400, corsHeaders);
    }

    const result = await service.addToQueue(env, user.clinic_id, validation.data!);
    return json({ success: true, data: result }, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleUpdateQueueStatus(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = parseInt(pathParts[pathParts.length - 1]);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid ID' }, 400, corsHeaders);
    }

    const body = await request.json();
    const { status } = body;
    if (!status || !['waiting', 'in_progress', 'done'].includes(status)) {
      return json({ success: false, error: 'Invalid status' }, 400, corsHeaders);
    }

    const result = await service.updateStatus(env, id, status);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
