import type { Env, User } from '../types';
import { logAudit } from '../lib/audit';
import { getClientIP } from '../lib/rate-limit';

export async function handleGetAppointments(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end');
    const patientId = url.searchParams.get('patient_id');
    const therapistId = url.searchParams.get('therapist_id');
    const status = url.searchParams.get('status');

    let query = `SELECT a.*, p.name as patient_name, p.phone as patient_phone, t.name as therapist_name, t.specialty as therapist_specialty
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 JOIN therapists t ON a.therapist_id = t.id`;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (date) {
      conditions.push("a.date = ?");
      params.push(date);
    }
    if (startDate) {
      conditions.push("a.date >= ?");
      params.push(startDate);
    }
    if (endDate) {
      conditions.push("a.date <= ?");
      params.push(endDate);
    }
    if (patientId) {
      conditions.push("a.patient_id = ?");
      params.push(patientId);
    }
    if (therapistId) {
      conditions.push("a.therapist_id = ?");
      params.push(therapistId);
    }
    if (status) {
      conditions.push("a.status = ?");
      params.push(status);
    }

    if (user.role === 'therapist' && user.therapist_id) {
      conditions.push("a.therapist_id = ?");
      params.push(user.therapist_id);
    }

    if (user.role === 'patient' && user.patient_id) {
      conditions.push("a.patient_id = ?");
      params.push(user.patient_id);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY a.date ASC, a.time ASC";

    const result = await env.DB.prepare(query).bind(...params).all();

    return jsonResponse(result.results, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al obtener citas' }, 500, origin);
  }
}

export async function handleGetAppointment(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse({ error: 'ID requerido' }, 400, origin);
    }

    const appointment = await env.DB.prepare(
      `SELECT a.*, p.name as patient_name, p.phone as patient_phone, t.name as therapist_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN therapists t ON a.therapist_id = t.id
       WHERE a.id = ?`
    ).bind(id).first();

    if (!appointment) {
      return jsonResponse({ error: 'Cita no encontrada' }, 404, origin);
    }

    return jsonResponse(appointment, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al obtener cita' }, 500, origin);
  }
}

export async function handleCreateAppointment(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const data = await request.json() as {
      patient_id: number;
      therapist_id: number;
      date: string;
      time: string;
      duration?: number;
      status?: string;
      type?: string;
      notes?: string;
    };

    if (!data.patient_id || !data.therapist_id || !data.date || !data.time) {
      return jsonResponse({ error: 'patient_id, therapist_id, date y time requeridos' }, 400, origin);
    }

    const patient = await env.DB.prepare("SELECT id FROM patients WHERE id = ?").bind(data.patient_id).first();
    if (!patient) {
      return jsonResponse({ error: 'Paciente no encontrado' }, 404, origin);
    }

    const therapist = await env.DB.prepare("SELECT id FROM therapists WHERE id = ?").bind(data.therapist_id).first();
    if (!therapist) {
      return jsonResponse({ error: 'Terapeuta no encontrado' }, 404, origin);
    }

    const result = await env.DB.prepare(
      `INSERT INTO appointments (patient_id, therapist_id, date, time, duration, status, type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.patient_id, data.therapist_id, data.date, data.time,
        data.duration || 60, data.status || 'scheduled', data.type || 'session', data.notes || null
      )
      .run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id, 'create', 'appointments', result.meta.last_row_id as number, `Cita: ${data.date} ${data.time}`, ip, ua);

    return jsonResponse({ id: result.meta.last_row_id, ...data }, 201, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al crear cita' }, 500, origin);
  }
}

export async function handleUpdateAppointment(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse({ error: 'ID requerido' }, 400, origin);
    }

    const existing = await env.DB.prepare("SELECT id FROM appointments WHERE id = ?").bind(id).first();
    if (!existing) {
      return jsonResponse({ error: 'Cita no encontrada' }, 404, origin);
    }

    const data = await request.json() as {
      patient_id?: number;
      therapist_id?: number;
      date?: string;
      time?: string;
      duration?: number;
      status?: string;
      type?: string;
      notes?: string;
      diagnosis?: string;
      treatment_plan?: string;
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
      `UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id, 'update', 'appointments', parseInt(id), `Campos: ${Object.keys(data).join(', ')}`, ip, ua);

    return jsonResponse({ success: true }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al actualizar cita' }, 500, origin);
  }
}

export async function handleDeleteAppointment(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return jsonResponse({ error: 'ID requerido' }, 400, origin);
    }

    const existing = await env.DB.prepare(
      "SELECT id, date, time FROM appointments WHERE id = ?"
    ).bind(id).first();

    if (!existing) {
      return jsonResponse({ error: 'Cita no encontrada' }, 404, origin);
    }

    await env.DB.prepare("DELETE FROM appointments WHERE id = ?").bind(id).run();

    const ip = getClientIP(request);
    const ua = request.headers.get('User-Agent') || '';
    await logAudit(env, user.id, 'delete', 'appointments', parseInt(id), `Cita: ${existing.date} ${existing.time}`, ip, ua);

    return jsonResponse({ success: true }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al eliminar cita' }, 500, origin);
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
