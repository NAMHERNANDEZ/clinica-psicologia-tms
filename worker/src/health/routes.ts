import type { Env } from '../types';
import { HealthService } from './service';

function json(data: unknown, status: number, corsHeaders: Record<string, string>, requestId: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function handleHealth(env: Env, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  try {
    const service = new HealthService();
    const summary = await service.checkAll(env);
    const status = summary.overall === 'HEALTHY' ? 200 : summary.overall === 'DEGRADED' ? 200 : 503;
    return json({ success: true, data: summary }, status, corsHeaders, requestId);
  } catch (err) {
    console.error(`[${requestId}] Health check error:`, err);
    return json({ success: false, error: 'Health check failed', requestId }, 500, corsHeaders, requestId);
  }
}
