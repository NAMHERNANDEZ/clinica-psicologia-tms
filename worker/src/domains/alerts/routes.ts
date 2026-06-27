import type { Env, User } from '../../types';
import { validateAlertCreate } from './validators';
import * as service from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGetAlerts(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const alerts = await service.getAlerts(env, user.clinic_id, unreadOnly);
    return json({ success: true, data: alerts }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetAlertSummary(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const summary = await service.getAlertSummary(env, user.clinic_id);
    return json({ success: true, data: summary }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleCreateAlert(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const validated = validateAlertCreate(body);
    const alert = await service.createAlert(env, user.clinic_id, validated);
    return json({ success: true, data: alert }, 201, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleMarkAlertRead(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = parseInt(url.pathname.split('/').pop() || '', 10);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid alert ID' }, 400, corsHeaders);
    }
    await service.markRead(env, id);
    return json({ success: true, data: { message: 'Alert marked as read' } }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleMarkAllRead(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    await service.markAllRead(env, user.clinic_id);
    return json({ success: true, data: { message: 'All alerts marked as read' } }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleDeleteAlert(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = parseInt(url.pathname.split('/').pop() || '', 10);
    if (isNaN(id)) {
      return json({ success: false, error: 'Invalid alert ID' }, 400, corsHeaders);
    }
    await service.deleteAlert(env, id);
    return json({ success: true, data: { message: 'Alert deleted' } }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
