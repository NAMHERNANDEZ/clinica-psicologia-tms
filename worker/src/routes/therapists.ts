import type { Env, User } from '../types';
import { logAudit } from '../lib/audit';
import { getClientIP } from '../lib/rate-limit';

export async function handleGetTherapists(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const result = await env.DB.prepare(
      "SELECT id, name, email, phone, specialty, license_number, bio, is_active FROM therapists ORDER BY name"
    ).all();

    return jsonResponse(result.results, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al obtener terapeutas' }, 500, origin);
  }
}

export async function handleGetTherapist(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse({ error: 'ID requerido' }, 400, origin);
    }

    if (user.role === 'therapist' && user.therapist_id !== parseInt(id)) {
      return jsonResponse({ error: 'Sin permisos' }, 403, origin);
    }

    const therapist = await env.DB.prepare(
      "SELECT id, name, email, phone, specialty, license_number, bio, is_active FROM therapists WHERE id = ?"
    ).bind(id).first();

    if (!therapist) {
      return jsonResponse({ error: 'Terapeuta no encontrado' }, 404, origin);
    }

    return jsonResponse(therapist, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al obtener terapeuta' }, 500, origin);
  }
}

export async function handleCreateTherapist(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const data = await request.json() as {
      name: string;
      email: string;
      phone?: string;
      specialty: string;
      license_number?: string;
      bio?: string;
      password?: string;
    };

    if (!data.name || !data.email || !data.specialty) {
      return jsonResponse({ error: 'Nombre, email y especialidad requeridos' }, 400, origin);
    }

    const existing = await env.DB.prepare("SELECT id FROM therapists WHERE email = ?").bind(data.email).first();
    if (existing) {
      return jsonResponse({ error: 'Email ya registrado' }, 409, origin);
    }

    const result = await env.DB.prepare(
      "INSERT INTO therapists (name, email, phone, specialty, license_number, bio) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(data.name, data.email, data.phone || null, data.specialty, data.license_number || null, data.bio || null)
      .run();

    if (data.password) {
      const { hashPassword } = await import('../lib/auth');
      const passwordHash = await hashPassword(data.password);
      await env.DB.prepare(
        "INSERT INTO users (email, password_hash, role, therapist_id) VALUES (?, ?, 'therapist', ?)"
      ).bind(data.email, passwordHash, result.meta.last_row_id).run();
    }

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id, 'create', 'therapists', result.meta.last_row_id as number, `Terapeuta: ${data.name}`, ip, ua);

    return jsonResponse({ id: result.meta.last_row_id, ...data }, 201, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al crear terapeuta' }, 500, origin);
  }
}

export async function handleUpdateTherapist(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse({ error: 'ID requerido' }, 400, origin);
    }

    const existing = await env.DB.prepare("SELECT id FROM therapists WHERE id = ?").bind(id).first();
    if (!existing) {
      return jsonResponse({ error: 'Terapeuta no encontrado' }, 404, origin);
    }

    const data = await request.json() as {
      name?: string;
      email?: string;
      phone?: string;
      specialty?: string;
      license_number?: string;
      bio?: string;
      is_active?: number;
    };

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return jsonResponse({ error: 'Sin cambios' }, 400, origin);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await env.DB.prepare(
      `UPDATE therapists SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id, 'update', 'therapists', parseInt(id), `Campos: ${Object.keys(data).join(', ')}`, ip, ua);

    return jsonResponse({ success: true }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al actualizar terapeuta' }, 500, origin);
  }
}

export async function handleDeleteTherapist(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse({ error: 'ID requerido' }, 400, origin);
    }

    const existing = await env.DB.prepare("SELECT id, name FROM therapists WHERE id = ?").bind(id).first();
    if (!existing) {
      return jsonResponse({ error: 'Terapeuta no encontrado' }, 404, origin);
    }

    await env.DB.prepare("UPDATE therapists SET is_active = 0 WHERE id = ?").bind(id).run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id, 'delete', 'therapists', parseInt(id), `Terapeuta: ${existing.name}`, ip, ua);

    return jsonResponse({ success: true }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al eliminar terapeuta' }, 500, origin);
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
