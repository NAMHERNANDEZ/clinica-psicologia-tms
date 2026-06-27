import type { Env, JWTPayload, User } from '../types';

const encoder = new TextEncoder();

function base64url(data: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(data)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return base64url(sig);
}

export async function createAccessToken(env: Env, user: User): Promise<string> {
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: user.id, email: user.email, role: user.role,
    clinic_id: user.clinic_id, type: 'access',
    exp: now + 15 * 60, iat: now,
  };
  const payloadEncoded = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmacSign(env.JWT_SECRET, `${header}.${payloadEncoded}`);
  return `${header}.${payloadEncoded}.${signature}`;
}

export async function createRefreshToken(env: Env, user: User): Promise<string> {
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    sub: user.id, email: user.email, role: user.role,
    clinic_id: user.clinic_id, type: 'refresh',
    exp: now + 30 * 24 * 60 * 60, iat: now,
  };
  const payloadEncoded = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await hmacSign(env.REFRESH_SECRET, `${header}.${payloadEncoded}`);
  return `${header}.${payloadEncoded}.${signature}`;
}

export async function verifyToken(secret: string, token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payloadEncoded, providedSig] = parts;
    const expectedSig = await hmacSign(secret, `${header}.${payloadEncoded}`);
    if (providedSig !== expectedSig) return null;
    const payload: JWTPayload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadEncoded)));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-512', salt: encoder.encode(saltHex), iterations: 100000 },
    keyMaterial, 512
  );
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHash] = stored.split(':');
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-512', salt: encoder.encode(saltHex), iterations: 100000 },
    keyMaterial, 512
  );
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === expectedHash;
}

export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  header.split(';').forEach(c => {
    const [name, ...rest] = c.trim().split('=');
    if (name) cookies[name.trim()] = rest.join('=').trim();
  });
  return cookies;
}

export function setCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearCookie(name: string): string {
  return `${name}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
