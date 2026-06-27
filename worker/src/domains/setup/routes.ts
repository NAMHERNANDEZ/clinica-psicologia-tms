import type { Env } from '../../types';
import { hashPassword } from '../../lib/auth';

export async function handleSetup(env: Env, request: Request, corsHeaders: Record<string, string>, requestId: string): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const { email, password, name, clinic_name } = body as {
    email: string; password: string; name: string; clinic_name: string;
  };

  if (!email || !password) {
    return new Response(JSON.stringify({ success: false, error: 'email y password requeridos', requestId }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) {
      const hash = await hashPassword(password);
      await env.DB.prepare('UPDATE users SET password_hash = ? WHERE email = ?').bind(hash, email).run();
      return new Response(JSON.stringify({ success: true, data: { message: `Password actualizado para ${email}`, requestId } }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let clinicId = 1;
    if (clinic_name) {
      const clinic = await env.DB.prepare('INSERT INTO clinics (name) VALUES (?) RETURNING id').bind(clinic_name).first<{ id: number }>();
      if (clinic) clinicId = clinic.id;
    }

    const hash = await hashPassword(password);
    const result = await env.DB.prepare(
      'INSERT INTO users (clinic_id, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).bind(clinicId, email, hash, 'admin').run();

    return new Response(JSON.stringify({ success: true, data: { userId: result.meta.last_row_id, clinicId, message: `Usuario ${email} creado`, requestId } }), {
      status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    console.error(`[${requestId}] Setup error:`, err);
    return new Response(JSON.stringify({ success: false, error: String(err), requestId }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
