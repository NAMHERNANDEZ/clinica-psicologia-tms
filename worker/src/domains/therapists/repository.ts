import type { Env, Therapist } from '../../types';

export async function findTherapists(env: Env, clinicId: number): Promise<Therapist[]> {
  const result = await env.DB.prepare(
    "SELECT id, clinic_id, user_id, name, email, phone, specialty, active, created_at FROM therapists WHERE clinic_id = ? ORDER BY name"
  ).bind(clinicId).all();
  return result.results as unknown as Therapist[];
}

export async function findTherapistById(env: Env, clinicId: number, id: number): Promise<Therapist | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, user_id, name, email, phone, specialty, active, created_at FROM therapists WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return (row as unknown as Therapist) || null;
}

export async function createTherapist(env: Env, clinicId: number, data: { name: string; email: string; phone?: string; specialty: string }): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO therapists (clinic_id, name, email, phone, specialty) VALUES (?, ?, ?, ?, ?)"
  ).bind(clinicId, data.name, data.email, data.phone || null, data.specialty).run();
  return result.meta.last_row_id as number;
}

export async function updateTherapist(env: Env, clinicId: number, id: number, data: Partial<Therapist>): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'clinic_id' && key !== 'created_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return false;
  values.push(id, clinicId);

  const result = await env.DB.prepare(
    `UPDATE therapists SET ${fields.join(', ')} WHERE id = ? AND clinic_id = ?`
  ).bind(...values).run();

  return result.meta.changes > 0;
}

export async function deleteTherapist(env: Env, clinicId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE therapists SET active = 0 WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).run();
  return result.meta.changes > 0;
}
