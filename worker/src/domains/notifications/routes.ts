import type { Env, User } from '../../types';
import { validateLogNotification } from './validators';
import { createNotificationLog, getNotifications } from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleLogNotification(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateLogNotification(body);
    if (!validation.valid) {
      return json({ success: false, error: validation.error }, 400, corsHeaders);
    }
    const result = await createNotificationLog(env, user.clinic_id, user.id, validation.data);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGetNotifications(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const notifications = await getNotifications(env, user.clinic_id);
    return json({ success: true, data: notifications }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
