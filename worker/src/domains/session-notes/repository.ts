import type { Env, SessionNote } from '../../types';

export async function findNotes(env: Env, clinicId: number): Promise<SessionNote[]> {
  const result = await env.DB.prepare(
    "SELECT id, clinic_id, patient_id, therapist_id, session_date, subjective, objective, assessment, plan, signature, created_at, updated_at FROM session_notes WHERE clinic_id = ? ORDER BY session_date DESC"
  ).bind(clinicId).all();
  return result.results as unknown as SessionNote[];
}

export async function findNotesByPatient(env: Env, clinicId: number, patientId: number): Promise<SessionNote[]> {
  const result = await env.DB.prepare(
    "SELECT id, clinic_id, patient_id, therapist_id, session_date, subjective, objective, assessment, plan, signature, created_at, updated_at FROM session_notes WHERE clinic_id = ? AND patient_id = ? ORDER BY session_date DESC"
  ).bind(clinicId, patientId).all();
  return result.results as unknown as SessionNote[];
}

export async function findNoteById(env: Env, clinicId: number, id: number): Promise<SessionNote | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, patient_id, therapist_id, session_date, subjective, objective, assessment, plan, signature, created_at, updated_at FROM session_notes WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return (row as unknown as SessionNote) || null;
}

export async function createNote(env: Env, clinicId: number, userId: number, data: { patient_id: number; session_date: string; subjective?: string; objective?: string; assessment?: string; plan?: string; signature?: string }): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO session_notes (clinic_id, patient_id, therapist_id, session_date, subjective, objective, assessment, plan, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(clinicId, data.patient_id, userId, data.session_date, data.subjective || null, data.objective || null, data.assessment || null, data.plan || null, data.signature || null).run();
  return result.meta.last_row_id as number;
}

export async function updateNote(env: Env, clinicId: number, id: number, data: Partial<SessionNote>): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];
  const allowed = ['subjective', 'objective', 'assessment', 'plan', 'signature', 'session_date'];
  for (const key of allowed) {
    if (data[key as keyof typeof data] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key as keyof typeof data]);
    }
  }
  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  values.push(id, clinicId);
  const result = await env.DB.prepare(
    `UPDATE session_notes SET ${fields.join(', ')} WHERE id = ? AND clinic_id = ?`
  ).bind(...values).run();
  return result.meta.changes > 0;
}

export async function deleteNote(env: Env, clinicId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM session_notes WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).run();
  return result.meta.changes > 0;
}