import type { Env, User } from '../../../types';
import { getMarketingAnalytics } from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// GET /api/marketing/analytics — KPIs de marketing desde datos de CRM/citas
export async function handleMarketingAnalytics(
  env: Env,
  request: Request,
  user: User,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const analytics = await getMarketingAnalytics(env, user.clinic_id);
    return json({ success: true, data: analytics }, 200, corsHeaders);
  } catch (err) {
    console.error('Marketing analytics error:', err);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
