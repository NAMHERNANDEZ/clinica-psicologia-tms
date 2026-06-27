import type { Env, User } from '../../types';
import { validateGenerateReminders } from './validators';
import { getReminders, generateReminders } from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleGetReminders(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const reminders = await getReminders(env, user.clinic_id);
    return json({ success: true, data: reminders }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleGenerateReminders(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const result = await generateReminders(env, user.clinic_id);
    return json({ success: true, data: result }, 200, corsHeaders);
  } catch (err) {
    console.error('Handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
