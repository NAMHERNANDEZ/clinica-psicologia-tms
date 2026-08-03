import type { Env, User } from '../../types';
import { getDashboardMetrics } from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleDashboardOverview(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const metrics = await getDashboardMetrics(env, user.clinic_id);
    return json({ success: true, data: metrics }, 200, corsHeaders);
  } catch (err) {
    console.error('Dashboard handler error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
