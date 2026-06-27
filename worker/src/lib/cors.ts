import type { Env } from '../types';

export function getAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
}

export function getCorsHeaders(env: Env, origin: string | null): Record<string, string> {
  const allowed = getAllowedOrigins(env);
  const isAllowed = origin && allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed[0] || '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function isOriginAllowed(env: Env, origin: string | null): boolean {
  if (!origin) return true;
  return getAllowedOrigins(env).includes(origin);
}
