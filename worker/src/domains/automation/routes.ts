import type { Env, User } from '../../types';
import { executeAutomationForEvent } from './executor';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleAutomationEvent(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as { event_type: string; data: any };
    
    if (!body.event_type) {
      return json({ success: false, error: 'event_type requerido' }, 400, corsHeaders);
    }
    
    const result = await executeAutomationForEvent(env, body.event_type, body.data);
    
    if (!result.success) {
      return json({ success: false, error: result.error }, 500, corsHeaders);
    }
    
    return json({ success: true, data: { notification_id: result.notificationId } }, 200, corsHeaders);
    
  } catch (err) {
    console.error('Automation handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
