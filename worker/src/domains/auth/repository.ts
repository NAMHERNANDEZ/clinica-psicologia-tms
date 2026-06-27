import type { Env, User } from '../../types';

export async function findUserByEmail(env: Env, email: string): Promise<User | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, email, password_hash, role FROM users WHERE email = ?"
  ).bind(email).first();

  if (!row) return null;

  return {
    id: row.id as number,
    clinic_id: row.clinic_id as number,
    email: row.email as string,
    password_hash: row.password_hash as string,
    role: row.role as User['role'],
    created_at: '',
  };
}

export async function createUser(env: Env, clinicId: number, email: string, passwordHash: string, role: User['role']): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO users (clinic_id, email, password_hash, role) VALUES (?, ?, ?, ?)"
  ).bind(clinicId, email, passwordHash, role).run();

  return result.meta.last_row_id as number;
}

export async function createClinic(env: Env, name: string): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO clinics (name) VALUES (?)"
  ).bind(name).run();

  return result.meta.last_row_id as number;
}

export async function updateRefreshToken(env: Env, userId: number, refreshToken: string | null, expiresAt: string | null): Promise<void> {
  await env.DB.prepare(
    "UPDATE users SET refresh_token = ?, refresh_token_expires_at = ? WHERE id = ?"
  ).bind(refreshToken, expiresAt, userId).run();
}

export async function findUserById(env: Env, id: number): Promise<User | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, email, role FROM users WHERE id = ?"
  ).bind(id).first();

  if (!row) return null;

  return {
    id: row.id as number,
    clinic_id: row.clinic_id as number,
    email: row.email as string,
    password_hash: '',
    role: row.role as User['role'],
    created_at: '',
  };
}
