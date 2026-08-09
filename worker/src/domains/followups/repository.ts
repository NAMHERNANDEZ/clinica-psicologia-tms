import type { Env, Followup } from '../../types';
import { sanitizeUpdateFields } from '../../lib/sql-safe';

export async function findFollowups(env: Env, clinicId: number, filters: { patient_id?: number; status?: string; type?: string }): Promise<Followup[]> {
  let query = "SELECT * FROM followups WHERE clinic_id = ?";
  const params: unknown[] = [clinicId];

  if (filters.patient_id) {
    query += " AND patient_id = ?";
    params.push(filters.patient_id);
  }
  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.type) {
    query += " AND type = ?";
    params.push(filters.type);
  }

  query += " ORDER BY scheduled_at ASC";
  const result = await env.DB.prepare(query).bind(...params).all();
  return result.results as unknown as Followup[];
}

export async function findFollowupById(env: Env, clinicId: number, id: number): Promise<Followup | null> {
  const row = await env.DB.prepare(
    "SELECT * FROM followups WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return (row as unknown as Followup) || null;
}

export async function createFollowup(env: Env, clinicId: number, data: {
  patient_id: number;
  type: string;
  scheduled_at: string;
  priority?: string;
  notes?: string;
  created_by?: number | null;
}): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO followups (clinic_id, patient_id, type, scheduled_at, priority, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(clinicId, data.patient_id, data.type, data.scheduled_at, data.priority || 'NORMAL', data.notes || null, data.created_by ?? null).run();
  return result.meta.last_row_id as number;
}

export async function updateFollowup(env: Env, clinicId: number, id: number, data: Partial<Followup>): Promise<boolean> {
  const { fields, values } = sanitizeUpdateFields('followups', data as Record<string, unknown>);

  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  values.push(id, clinicId);

  const result = await env.DB.prepare(
    `UPDATE followups SET ${fields.join(', ')} WHERE id = ? AND clinic_id = ?`
  ).bind(...values).run();

  return result.meta.changes > 0;
}

export async function completeFollowup(env: Env, clinicId: number, id: number, outcome: string, outcomeNotes?: string): Promise<boolean> {
  const result = await env.DB.prepare(
    `UPDATE followups SET status = 'COMPLETADO', completed_at = datetime('now'), outcome = ?, outcome_notes = ?, updated_at = datetime('now')
     WHERE id = ? AND clinic_id = ?`
  ).bind(outcome, outcomeNotes || null, id, clinicId).run();
  return result.meta.changes > 0;
}

export async function deleteFollowup(env: Env, clinicId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE followups SET status = 'CANCELADO', updated_at = datetime('now') WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).run();
  return result.meta.changes > 0;
}
