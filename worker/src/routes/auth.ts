import type { Env } from '../types';
import { hashPassword, verifyPassword, createAccessToken, createRefreshToken, verifyToken, setCookie, clearCookie } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getClientIP } from '../lib/rate-limit';

export async function handleLogin(env: Env, request: Request, origin: string): Promise<Response> {
  try {
    const { email, password } = await request.json() as { email: string; password: string };

    if (!email || !password) {
      return jsonResponse({ error: 'Email y contraseña requeridos' }, 400, origin);
    }

    const user = await env.DB.prepare(
      "SELECT id, email, password_hash, role, patient_id, therapist_id FROM users WHERE email = ?"
    ).bind(email).first();

    if (!user) {
      return jsonResponse({ error: 'Credenciales inválidas' }, 401, origin);
    }

    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return jsonResponse({ error: 'Credenciales inválidas' }, 401, origin);
    }

    const userData = {
      id: user.id as number,
      email: user.email as string,
      role: user.role as 'admin' | 'therapist' | 'patient',
      patient_id: user.patient_id as number | undefined,
      therapist_id: user.therapist_id as number | undefined,
    };

    const accessToken = await createAccessToken(env, userData);
    const refreshToken = await createRefreshToken(env, userData);
    const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(
      "UPDATE users SET refresh_token = ?, refresh_token_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(refreshToken, refreshExpires, user.id).run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id as number, 'login', 'auth', user.id as number, `Login exitoso`, ip, ua);

    const response = jsonResponse({
      user: { id: userData.id, email: userData.email, role: userData.role },
      accessToken,
    }, 200, origin);

    response.headers.append('Set-Cookie', setCookie('access_token', accessToken, 15 * 60));
    response.headers.append('Set-Cookie', setCookie('refresh_token', refreshToken, 30 * 24 * 60 * 60));

    return response;
  } catch (error) {
    return jsonResponse({ error: 'Error al iniciar sesión' }, 500, origin);
  }
}

export async function handleLogout(env: Env, request: Request, origin: string): Promise<Response> {
  try {
    const cookies = request.headers.get('Cookie') || '';
    const cookieMap: Record<string, string> = {};
    cookies.split(';').forEach((c) => {
      const [k, ...v] = c.trim().split('=');
      if (k) cookieMap[k.trim()] = v.join('=');
    });

    const refreshToken = cookieMap['refresh_token'];
    if (refreshToken) {
      const payload = await verifyToken(env.REFRESH_SECRET, refreshToken);
      if (payload) {
        await env.DB.prepare(
          "UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = ?"
        ).bind(payload.sub).run();

        const ip = getClientIP(request);
        const ua = request.headers.get('User-Agent') || '';
        await logAudit(env, payload.sub, 'logout', 'auth', payload.sub, 'Logout', ip, ua);
      }
    }

    const response = jsonResponse({ success: true }, 200, origin);
    response.headers.append('Set-Cookie', clearCookie('access_token'));
    response.headers.append('Set-Cookie', clearCookie('refresh_token'));
    return response;
  } catch (error) {
    return jsonResponse({ error: 'Error al cerrar sesión' }, 500, origin);
  }
}

export async function handleRefresh(env: Env, request: Request, origin: string): Promise<Response> {
  try {
    const cookies = request.headers.get('Cookie') || '';
    const cookieMap: Record<string, string> = {};
    cookies.split(';').forEach((c) => {
      const [k, ...v] = c.trim().split('=');
      if (k) cookieMap[k.trim()] = v.join('=');
    });

    const refreshToken = cookieMap['refresh_token'];
    if (!refreshToken) {
      return jsonResponse({ error: 'Refresh token requerido' }, 401, origin);
    }

    const payload = await verifyToken(env.REFRESH_SECRET, refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return jsonResponse({ error: 'Refresh token inválido' }, 401, origin);
    }

    const user = await env.DB.prepare(
      "SELECT id, email, role, patient_id, therapist_id FROM users WHERE id = ? AND refresh_token = ?"
    ).bind(payload.sub, refreshToken).first();

    if (!user) {
      return jsonResponse({ error: 'Refresh token inválido' }, 401, origin);
    }

    const userData = {
      id: user.id as number,
      email: user.email as string,
      role: user.role as 'admin' | 'therapist' | 'patient',
      patient_id: user.patient_id as number | undefined,
      therapist_id: user.therapist_id as number | undefined,
    };

    const newAccessToken = await createAccessToken(env, userData);
    const newRefreshToken = await createRefreshToken(env, userData);
    const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(
      "UPDATE users SET refresh_token = ?, refresh_token_expires_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(newRefreshToken, refreshExpires, user.id).run();

    const response = jsonResponse({ accessToken: newAccessToken }, 200, origin);
    response.headers.append('Set-Cookie', setCookie('access_token', newAccessToken, 15 * 60));
    response.headers.append('Set-Cookie', setCookie('refresh_token', newRefreshToken, 30 * 24 * 60 * 60));

    return response;
  } catch (error) {
    return jsonResponse({ error: 'Error al refrescar token' }, 500, origin);
  }
}

export async function handleRegister(env: Env, request: Request, origin: string): Promise<Response> {
  try {
    const { email, password, name, phone, role } = await request.json() as {
      email: string;
      password: string;
      name: string;
      phone: string;
      role?: string;
    };

    if (!email || !password || !name || !phone) {
      return jsonResponse({ error: 'Email, password, nombre y teléfono requeridos' }, 400, origin);
    }

    if (password.length < 8) {
      return jsonResponse({ error: 'Mínimo 8 caracteres' }, 400, origin);
    }

    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) {
      return jsonResponse({ error: 'Email ya registrado' }, 409, origin);
    }

    const passwordHash = await hashPassword(password);
    const userRole = role === 'admin' ? 'admin' : 'patient';

    const patientResult = await env.DB.prepare(
      "INSERT INTO patients (name, phone, email) VALUES (?, ?, ?)"
    ).bind(name, phone, email).run();

    const patientId = patientResult.meta.last_row_id;

    const userResult = await env.DB.prepare(
      "INSERT INTO users (email, password_hash, role, patient_id) VALUES (?, ?, ?, ?)"
    ).bind(email, passwordHash, userRole, patientId).run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, userResult.meta.last_row_id as number, 'register', 'auth', patientId as number, 'Registro de paciente', ip, ua);

    return jsonResponse({ success: true, userId: userResult.meta.last_row_id }, 201, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al registrar' }, 500, origin);
  }
}

export async function handleGetMe(env: Env, request: Request, origin: string): Promise<Response> {
  try {
    const cookies = request.headers.get('Cookie') || '';
    const cookieMap: Record<string, string> = {};
    cookies.split(';').forEach((c) => {
      const [k, ...v] = c.trim().split('=');
      if (k) cookieMap[k.trim()] = v.join('=');
    });

    const token = cookieMap['access_token'] || request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return jsonResponse({ error: 'No autenticado' }, 401, origin);
    }

    const payload = await verifyToken(env.JWT_SECRET, token);
    if (!payload) {
      return jsonResponse({ error: 'Token inválido' }, 401, origin);
    }

    const user = await env.DB.prepare(
      "SELECT id, email, role, patient_id, therapist_id FROM users WHERE id = ?"
    ).bind(payload.sub).first();

    if (!user) {
      return jsonResponse({ error: 'Usuario no encontrado' }, 404, origin);
    }

    return jsonResponse({
      id: user.id,
      email: user.email,
      role: user.role,
      patient_id: user.patient_id,
      therapist_id: user.therapist_id,
    }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al obtener usuario' }, 500, origin);
  }
}

function jsonResponse(data: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
