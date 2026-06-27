import type { Env, User } from '../types';
import { verifyToken, parseCookies } from '../lib/auth';

export async function authenticate(env: Env, request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else {
    const cookies = parseCookies(request.headers.get('Cookie'));
    token = cookies['access_token'] || null;
  }

  if (!token) return null;

  const payload = await verifyToken(env.JWT_SECRET, token);
  if (!payload || payload.type !== 'access') return null;

  const dbUser = await env.DB.prepare(
    "SELECT id, clinic_id, email, role FROM users WHERE id = ?"
  ).bind(payload.sub).first();

  if (!dbUser) return null;

  return {
    id: dbUser.id as number,
    clinic_id: dbUser.clinic_id as number,
    email: dbUser.email as string,
    role: dbUser.role as User['role'],
    password_hash: '',
    created_at: '',
  };
}
