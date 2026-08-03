import type { Env } from '../types';

export function getAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS || '';
  return raw.split(',').map(o => o.trim()).filter(o => o.length > 0);
}

export function getCorsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins(env);
  const isAllowed = origin && allowed.some(a => origin === a || origin.endsWith('.' + a.replace(/^https?:\/\//, '')));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : (allowed[0] || '*'),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function isOriginAllowed(env: Env, origin: string | null): boolean {
  if (!origin) return true;
  const allowed = getAllowedOrigins(env);
  return allowed.some(a => origin === a || origin.endsWith('.' + a.replace(/^https?:\/\//, '')));
}
