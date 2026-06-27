import type { Env, Appointment } from '../../types';

export async function findAppointments(env: Env, clinicId: number, filters: { date?: string; therapist_id?: number; patient_id?: number }): Promise<Appointment[]> {
  let query = "SELECT * FROM appointments WHERE clinic_id = ?";
  const params: unknown[] = [clinicId];

  if (filters.date) {
    query += " AND date = ?";
    params.push(filters.date);
  }
  if (filters.therapist_id) {
    query += " AND therapist_id = ?";
    params.push(filters.therapist_id);
  }
  if (filters.patient_id) {
    query += " AND patient_id = ?";
    params.push(filters.patient_id);
  }

  query += " ORDER BY date ASC, time ASC";
  const result = await env.DB.prepare(query).bind(...params).all();
  return result.results as unknown as Appointment[];
}

export async function findAppointmentById(env: Env, clinicId: number, id: number): Promise<Appointment | null> {
  const row = await env.DB.prepare(
    "SELECT * FROM appointments WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return (row as unknown as Appointment) || null;
}

export async function createAppointment(env: Env, clinicId: number, data: {
  patient_id: number; therapist_id: number; date: string; time: string; duration?: number; notes?: string;
}): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO appointments (clinic_id, patient_id, therapist_id, date, time, duration, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(clinicId, data.patient_id, data.therapist_id, data.date, data.time, data.duration || 60, data.notes || null).run();
  return result.meta.last_row_id as number;
}

export async function updateAppointment(env: Env, clinicId: number, id: number, data: Partial<Appointment>): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'clinic_id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  values.push(id, clinicId);

  const result = await env.DB.prepare(
    `UPDATE appointments SET ${fields.join(', ')} WHERE id = ? AND clinic_id = ?`
  ).bind(...values).run();

  return result.meta.changes > 0;
}

export async function deleteAppointment(env: Env, clinicId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM appointments WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).run();
  return result.meta.changes > 0;
}
