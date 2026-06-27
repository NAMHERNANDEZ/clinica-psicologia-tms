import type { Env } from '../../types';

export interface Treatment {
  id: number;
  clinic_id: number;
  patient_id: number;
  therapist_id: number;
  name: string;
  protocol?: string;
  total_sessions: number;
  completed_sessions: number;
  status: string;
  start_date: string;
  end_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  therapist_name?: string;
}

export async function findTreatmentsByClinic(env: Env, clinicId: number): Promise<Treatment[]> {
  const result = await env.DB.prepare(`
    SELECT t.*, p.name as patient_name, th.name as therapist_name
    FROM treatments t
    LEFT JOIN patients p ON t.patient_id = p.id
    LEFT JOIN therapists th ON t.therapist_id = th.id
    WHERE t.clinic_id = ?
    ORDER BY t.created_at DESC
  `).bind(clinicId).all();
  return result.results as unknown as Treatment[];
}

export async function findTreatmentById(env: Env, clinicId: number, id: number): Promise<Treatment | null> {
  const row = await env.DB.prepare(`
    SELECT t.*, p.name as patient_name, th.name as therapist_name
    FROM treatments t
    LEFT JOIN patients p ON t.patient_id = p.id
    LEFT JOIN therapists th ON t.therapist_id = th.id
    WHERE t.id = ? AND t.clinic_id = ?
  `).bind(id, clinicId).first();
  return (row as unknown as Treatment) || null;
}

export async function findTreatmentsByPatient(env: Env, clinicId: number, patientId: number): Promise<Treatment[]> {
  const result = await env.DB.prepare(`
    SELECT t.*, p.name as patient_name, th.name as therapist_name
    FROM treatments t
    LEFT JOIN patients p ON t.patient_id = p.id
    LEFT JOIN therapists th ON t.therapist_id = th.id
    WHERE t.clinic_id = ? AND t.patient_id = ?
    ORDER BY t.created_at DESC
  `).bind(clinicId, patientId).all();
  return result.results as unknown as Treatment[];
}

export async function createTreatment(env: Env, clinicId: number, data: {
  patient_id: number;
  therapist_id: number;
  name: string;
  protocol?: string;
  total_sessions?: number;
  start_date: string;
}): Promise<number> {
  const result = await env.DB.prepare(`
    INSERT INTO treatments (clinic_id, patient_id, therapist_id, name, protocol, total_sessions, start_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    clinicId,
    data.patient_id,
    data.therapist_id,
    data.name,
    data.protocol || null,
    data.total_sessions || 20,
    data.start_date
  ).run();
  return result.meta.last_row_id as number;
}

export async function updateTreatment(env: Env, clinicId: number, id: number, data: Partial<Treatment>): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && key !== 'id' && key !== 'clinic_id' && key !== 'created_at' && key !== 'updated_at') {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return false;
  fields.push('updated_at = datetime("now")');
  values.push(id, clinicId);

  const result = await env.DB.prepare(
    `UPDATE treatments SET ${fields.join(', ')} WHERE id = ? AND clinic_id = ?`
  ).bind(...values).run();

  return result.meta.changes > 0;
}

export async function updateCompletedSessions(env: Env, clinicId: number, id: number, completedSessions: number): Promise<boolean> {
  const result = await env.DB.prepare(
    'UPDATE treatments SET completed_sessions = ?, updated_at = datetime("now") WHERE id = ? AND clinic_id = ?'
  ).bind(completedSessions, id, clinicId).run();
  return result.meta.changes > 0;
}

export async function deleteTreatment(env: Env, clinicId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    'DELETE FROM treatments WHERE id = ? AND clinic_id = ?'
  ).bind(id, clinicId).run();
  return result.meta.changes > 0;
}
