import type { Env } from '../types';

const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = 15 * 60;

export function getClientIP(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
}

export async function checkRateLimit(env: Env, ip: string, endpoint: string): Promise<{ allowed: boolean; remaining: number }> {
  const now = new Date().toISOString();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW * 1000).toISOString();

  await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(windowStart).run();

  const existing = await env.DB.prepare(
    "SELECT id, request_count FROM rate_limits WHERE ip_address = ? AND endpoint = ? AND window_start > ?"
  ).bind(ip, endpoint, windowStart).first();

  if (existing) {
    const count = existing.request_count as number;
    if (count >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0 };
    await env.DB.prepare("UPDATE rate_limits SET request_count = request_count + 1 WHERE id = ?").bind(existing.id).run();
    return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1 };
  }

  await env.DB.prepare(
    "INSERT INTO rate_limits (ip_address, endpoint, request_count, window_start) VALUES (?, ?, 1, ?)"
  ).bind(ip, endpoint, now).run();

  return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
}

export function rateLimitHeaders(remaining: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
    'X-RateLimit-Remaining': String(remaining),
  };
}
