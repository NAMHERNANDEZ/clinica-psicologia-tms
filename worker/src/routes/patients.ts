import type { Env, User } from '../types';
import { logAudit } from '../lib/audit';
import { getClientIP } from '../lib/rate-limit';

export async function handleGetPatients(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = "SELECT * FROM patients";
    const params: unknown[] = [];

    if (search) {
      query += " WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?";
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += " ORDER BY created_at DESC";
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    const result = await env.DB.prepare(query).bind(...params).all();

    const countQuery = search
      ? "SELECT COUNT(*) as total FROM patients WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?"
      : "SELECT COUNT(*) as total FROM patients";
    const countParams = search ? [
      `%${search}%`, `%${search}%`, `%${search}%`
    ] : [];
    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();

    return jsonResponse({
      patients: result.results,
      total: countResult?.total || 0,
      limit,
      offset,
    }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al obtener pacientes' }, 500, origin);
  }
}

export async function handleGetPatient(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse({ error: 'ID requerido' }, 400, origin);
    }

    if (user.role === 'patient' && user.patient_id !== parseInt(id)) {
      return jsonResponse({ error: 'Sin permisos' }, 403, origin);
    }

    const patient = await env.DB.prepare("SELECT * FROM patients WHERE id = ?").bind(id).first();

    if (!patient) {
      return jsonResponse({ error: 'Paciente no encontrado' }, 404, origin);
    }

    return jsonResponse(patient, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al obtener paciente' }, 500, origin);
  }
}

export async function handleCreatePatient(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const data = await request.json() as {
      name: string;
      phone: string;
      email?: string;
      date_of_birth?: string;
      address?: string;
      emergency_contact?: string;
      emergency_phone?: string;
      insurance?: string;
      diagnosis?: string;
      notes?: string;
    };

    if (!data.name || !data.phone) {
      return jsonResponse({ error: 'Nombre y teléfono requeridos' }, 400, origin);
    }

    const result = await env.DB.prepare(
      `INSERT INTO patients (name, phone, email, date_of_birth, address, emergency_contact, emergency_phone, insurance, diagnosis, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.name, data.phone, data.email || null, data.date_of_birth || null,
        data.address || null, data.emergency_contact || null, data.emergency_phone || null,
        data.insurance || null, data.diagnosis || null, data.notes || null
      )
      .run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id, 'create', 'patients', result.meta.last_row_id as number, `Paciente: ${data.name}`, ip, ua);

    return jsonResponse({ id: result.meta.last_row_id, ...data }, 201, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al crear paciente' }, 500, origin);
  }
}

export async function handleUpdatePatient(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse({ error: 'ID requerido' }, 400, origin);
    }

    const existing = await env.DB.prepare("SELECT id FROM patients WHERE id = ?").bind(id).first();
    if (!existing) {
      return jsonResponse({ error: 'Paciente no encontrado' }, 404, origin);
    }

    const data = await request.json() as {
      name?: string;
      phone?: string;
      email?: string;
      date_of_birth?: string;
      address?: string;
      emergency_contact?: string;
      emergency_phone?: string;
      insurance?: string;
      diagnosis?: string;
      notes?: string;
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
      `UPDATE patients SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id, 'update', 'patients', parseInt(id), `Campos: ${Object.keys(data).join(', ')}`, ip, ua);

    return jsonResponse({ success: true }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al actualizar paciente' }, 500, origin);
  }
}

export async function handleDeletePatient(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse({ error: 'ID requerido' }, 400, origin);
    }

    const existing = await env.DB.prepare("SELECT id, name FROM patients WHERE id = ?").bind(id).first();
    if (!existing) {
      return jsonResponse({ error: 'Paciente no encontrado' }, 404, origin);
    }

    await env.DB.prepare("DELETE FROM patients WHERE id = ?").bind(id).run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id, 'delete', 'patients', parseInt(id), `Paciente: ${existing.name}`, ip, ua);

    return jsonResponse({ success: true }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al eliminar paciente' }, 500, origin);
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
