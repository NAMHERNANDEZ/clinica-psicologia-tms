import type { Env, User } from '../../types';
import { hashPassword, verifyPassword, createAccessToken, createRefreshToken, setCookie, clearCookie, verifyToken } from '../../lib/auth';
import { findUserByEmail, createUser, createClinic, updateRefreshToken, findUserById } from './repository';
import { logAudit } from '../../lib/audit';

export async function register(env: Env, email: string, password: string, name: string, clinicName: string, ip: string) {
  const existing = await findUserByEmail(env, email);
  if (existing) return { error: 'Email ya registrado', status: 409 };

  const clinicId = await createClinic(env, clinicName);
  const passwordHash = await hashPassword(password);
  const userId = await createUser(env, clinicId, email, passwordHash, 'admin');

  await logAudit(env, clinicId, userId, 'register', 'users', userId, undefined, undefined, ip);

  return { success: true, userId };
}

export async function login(env: Env, email: string, password: string, ip: string) {
  const user = await findUserByEmail(env, email);
  if (!user) return { error: 'Credenciales inválidas', status: 401 };

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return { error: 'Credenciales inválidas', status: 401 };

  const accessToken = await createAccessToken(env, user);
  const refreshToken = await createRefreshToken(env, user);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await updateRefreshToken(env, user.id, refreshToken, expiresAt);
  await logAudit(env, user.clinic_id, user.id, 'login', 'users', user.id, undefined, undefined, ip);

  return {
    user: { id: user.id, email: user.email, role: user.role, clinic_id: user.clinic_id },
    accessToken,
    refreshTokenCookie: setCookie('refresh_token', refreshToken, 30 * 24 * 60 * 60),
    accessTokenCookie: setCookie('access_token', accessToken, 15 * 60),
  };
}

export async function refresh(env: Env, refreshToken: string | undefined) {
  if (!refreshToken) return { error: 'Refresh token requerido', status: 401 };

  const payload = await verifyToken(env.REFRESH_SECRET, refreshToken);
  if (!payload || payload.type !== 'refresh') return { error: 'Token inválido', status: 401 };

  const user = await findUserById(env, payload.sub);
  if (!user) return { error: 'Usuario no encontrado', status: 401 };

  const newAccessToken = await createAccessToken(env, { ...user, password_hash: '' } as User);
  const newRefreshToken = await createRefreshToken(env, { ...user, password_hash: '' } as User);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await updateRefreshToken(env, user.id, newRefreshToken, expiresAt);

  return {
    accessToken: newAccessToken,
    refreshTokenCookie: setCookie('refresh_token', newRefreshToken, 30 * 24 * 60 * 60),
    accessTokenCookie: setCookie('access_token', newAccessToken, 15 * 60),
  };
}

export async function logout(env: Env, userId: number, clinicId: number, ip: string) {
  await updateRefreshToken(env, userId, null, null);
  await logAudit(env, clinicId, userId, 'logout', 'users', userId, undefined, undefined, ip);
  return {
    accessTokenCookie: clearCookie('access_token'),
    refreshTokenCookie: clearCookie('refresh_token'),
  };
}

export async function getMe(env: Env, userId: number) {
  const user = await findUserById(env, userId);
  if (!user) return { error: 'Usuario no encontrado', status: 404 };
  return { user };
}
