import type { Env } from '../../types';
import { authenticate } from '../../middleware/authenticate';
import { validateRegister, validateLogin } from './validators';
import { register, login, refresh, logout, getMe } from './service';
import { parseCookies } from '../../lib/auth';
import { getClientIP, getUserAgent, checkLoginRateLimit } from '../../lib/rate-limit';

function json(data: unknown, status: number, corsHeaders: Record<string, string>, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...extraHeaders },
  });
}

export async function handleRegister(env: Env, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const body = await request.json();
  const validation = validateRegister(body);
  if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

  const ip = getClientIP(request);
  const result = await register(env, validation.data.email, validation.data.password, validation.data.name, validation.data.clinic_name, ip);

  if ('error' in result) return json({ success: false, error: result.error }, result.status!, corsHeaders);
  return json({ success: true, data: { userId: result.userId } }, 201, corsHeaders);
}

export async function handleLogin(env: Env, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const body = await request.json();
    const validation = validateLogin(body);
    if (!validation.valid) return json({ success: false, error: validation.error }, 400, corsHeaders);

    const ip = getClientIP(request);
    const userAgent = getUserAgent(request);
    const rl = await checkLoginRateLimit(env, ip, validation.data.email);
    if (!rl.allowed) {
      try {
        await env.DB.prepare(
          "INSERT INTO security_incidents (clinic_id, type, description, severity) VALUES (?, ?, ?, ?)"
        ).bind(1, 'RATE_LIMIT_LOGIN', `Login rate limit exceeded for ${validation.data.email} from ${ip}`, 'medium').run();
      } catch (_e) { /* best-effort */ }
      return json({ success: false, error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' }, 429, corsHeaders);
    }

    const result = await login(env, validation.data.email, validation.data.password, ip);

    if ('error' in result) return json({ success: false, error: result.error }, result.status!, corsHeaders);

    return json({ success: true, data: { user: result.user, accessToken: result.accessToken } }, 200, corsHeaders, {
      'Set-Cookie': `${result.accessTokenCookie}; ${result.refreshTokenCookie}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("handleLogin error:", msg, err instanceof Error ? err.stack : '');
    return json({ success: false, error: "Error interno: " + msg }, 500, corsHeaders);
  }
}

export async function handleRefresh(env: Env, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const result = await refresh(env, cookies.refresh_token);

  if ('error' in result) return json({ success: false, error: result.error }, result.status!, corsHeaders);
  return json({ success: true, data: { accessToken: result.accessToken } }, 200, corsHeaders, {
    'Set-Cookie': `${result.accessTokenCookie}; ${result.refreshTokenCookie}`,
  });
}

export async function handleLogout(env: Env, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const user = await authenticate(env, request);
  if (!user) return json({ success: false, error: 'No autenticado' }, 401, corsHeaders);

  const ip = getClientIP(request);
  const userAgent = getUserAgent(request);
  const result = await logout(env, user.id, user.clinic_id, ip);

  return json({ success: true, data: null }, 200, corsHeaders, {
    'Set-Cookie': `${result.accessTokenCookie}; ${result.refreshTokenCookie}`,
  });
}

export async function handleGetMe(env: Env, request: Request, corsHeaders: Record<string, string>): Promise<Response> {
  const user = await authenticate(env, request);
  if (!user) return json({ success: false, error: 'No autenticado' }, 401, corsHeaders);

  const result = await getMe(env, user.id);
  if ('error' in result) return json({ success: false, error: result.error }, result.status!, corsHeaders);
  return json({ success: true, data: result.user }, 200, corsHeaders);
}
