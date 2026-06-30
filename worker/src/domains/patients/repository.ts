import type { Env, Patient } from '../../types';
import { sanitizeUpdateFields } from '../../lib/sql-safe';

export async function findPatients(env: Env, clinicId: number, search?: string): Promise<Patient[]> {
  let query = "SELECT id, clinic_id, name, phone, email, birthdate, status, created_at FROM patients WHERE clinic_id = ?";
  const params: unknown[] = [clinicId];

  if (search) {
    query += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)";
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += " ORDER BY created_at DESC";
  const result = await env.DB.prepare(query).bind(...params).all();
  return result.results as unknown as Patient[];
}

export async function findPatientById(env: Env, clinicId: number, id: number): Promise<Patient | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, name, phone, email, birthdate, status, created_at FROM patients WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return (row as unknown as Patient) || null;
}

export async function createPatient(env: Env, clinicId: number, data: { name: string; phone: string; email?: string; birthdate?: string }): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO patients (clinic_id, name, phone, email, birthdate) VALUES (?, ?, ?, ?, ?)"
  ).bind(clinicId, data.name, data.phone, data.email || null, data.birthdate || null).run();
  return result.meta.last_row_id as number;
}

export async function updatePatient(env: Env, clinicId: number, id: number, data: Partial<Patient>): Promise<boolean> {
  const { fields, values } = sanitizeUpdateFields('patients', data as Record<string, unknown>);

  if (fields.length === 0) return false;
  values.push(id, clinicId);

  const result = await env.DB.prepare(
    `UPDATE patients SET ${fields.join(', ')} WHERE id = ? AND clinic_id = ?`
  ).bind(...values).run();

  return result.meta.changes > 0;
}

export async function deletePatient(env: Env, clinicId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM patients WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).run();
  return result.meta.changes > 0;
}
