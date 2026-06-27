import type { Env } from '../../types';

export interface Session {
  id: number;
  clinic_id: number;
  treatment_id: number;
  appointment_id?: number;
  session_number: number;
  status: string;
  notes?: string;
  completed_at?: string;
  created_at: string;
}

export async function getSessionsByTreatment(env: Env, treatmentId: number): Promise<Session[]> {
  const result = await env.DB.prepare(`
    SELECT * FROM sessions WHERE treatment_id = ? ORDER BY session_number ASC
  `).bind(treatmentId).all();
  return result.results as unknown as Session[];
}

export async function getSessionById(env: Env, id: number): Promise<Session | null> {
  const row = await env.DB.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first();
  return (row as unknown as Session) || null;
}

export async function createSession(env: Env, clinicId: number, treatmentId: number, appointmentId: number | null, sessionNumber: number): Promise<number> {
  const result = await env.DB.prepare(`
    INSERT INTO sessions (clinic_id, treatment_id, appointment_id, session_number, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).bind(clinicId, treatmentId, appointmentId, sessionNumber).run();
  return result.meta.last_row_id as number;
}

export async function updateSession(env: Env, id: number, status: string, notes: string | null, completedAt: string | null): Promise<boolean> {
  const result = await env.DB.prepare(`
    UPDATE sessions SET status = ?, notes = ?, completed_at = ? WHERE id = ?
  `).bind(status, notes, completedAt, id).run();
  return result.meta.changes > 0;
}

export async function getCompletedCount(env: Env, treatmentId: number): Promise<number> {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM sessions WHERE treatment_id = ? AND status = 'completed'
  `).bind(treatmentId).first() as { count: number } | null;
  return row?.count ?? 0;
}
