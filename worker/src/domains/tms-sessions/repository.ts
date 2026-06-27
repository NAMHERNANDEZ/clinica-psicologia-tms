import type { Env } from '../../types';
import type { TmsSessionInput, TmsSessionStatus } from './validators';

export interface TmsSession {
  id: number;
  clinic_id: number;
  profile_id: number;
  session_number: number;
  appointment_id: number | null;
  motor_threshold_pct: number;
  intensity_pct_mt: number;
  effective_intensity: number | null;
  target_area: string;
  coil_position: string | null;
  frequency_hz: number;
  pulses_delivered: number;
  session_duration_min: number;
  stimulation_type: string | null;
  status: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

const COLUMNS = 'id, clinic_id, profile_id, session_number, appointment_id, motor_threshold_pct, intensity_pct_mt, effective_intensity, target_area, coil_position, frequency_hz, pulses_delivered, session_duration_min, stimulation_type, status, notes, completed_at, created_at';

export async function findByProfile(env: Env, profileId: number): Promise<TmsSession[]> {
  const result = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM tms_sessions WHERE profile_id = ? ORDER BY session_number ASC`
  ).bind(profileId).all();
  return result.results as unknown as TmsSession[];
}

export async function findById(env: Env, id: number): Promise<TmsSession | null> {
  const row = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM tms_sessions WHERE id = ?`
  ).bind(id).first();
  return (row as unknown as TmsSession) || null;
}

export async function create(env: Env, clinicId: number, data: TmsSessionInput): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO tms_sessions (clinic_id, profile_id, session_number, appointment_id, motor_threshold_pct, intensity_pct_mt, effective_intensity, target_area, coil_position, frequency_hz, pulses_delivered, session_duration_min, stimulation_type, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    clinicId,
    data.profile_id,
    data.session_number,
    data.appointment_id || null,
    data.motor_threshold_pct,
    data.intensity_pct_mt,
    data.effective_intensity || null,
    data.target_area,
    data.coil_position || null,
    data.frequency_hz,
    data.pulses_delivered,
    data.session_duration_min,
    data.stimulation_type || null,
    data.status || 'scheduled',
    data.notes || null
  ).run();
  return result.meta.last_row_id as number;
}

export async function updateStatus(env: Env, id: number, status: TmsSessionStatus, notes?: string): Promise<boolean> {
  const session = await findById(env, id);
  if (!session) return false;

  const updatedNotes = notes !== undefined ? notes : session.notes;
  const result = await env.DB.prepare(
    `UPDATE tms_sessions SET status = ?, notes = ? WHERE id = ?`
  ).bind(status, updatedNotes, id).run();
  return result.meta.changes > 0;
}

export async function completeSession(env: Env, id: number): Promise<boolean> {
  const completedAt = new Date().toISOString();
  const result = await env.DB.prepare(
    `UPDATE tms_sessions SET status = 'completed', completed_at = ? WHERE id = ?`
  ).bind(completedAt, id).run();
  return result.meta.changes > 0;
}

export async function getLatestSession(env: Env, profileId: number): Promise<TmsSession | null> {
  const row = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM tms_sessions WHERE profile_id = ? AND status = 'completed' ORDER BY session_number DESC LIMIT 1`
  ).bind(profileId).first();
  return (row as unknown as TmsSession) || null;
}

export async function getCompletedCount(env: Env, profileId: number): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM tms_sessions WHERE profile_id = ? AND status = 'completed'`
  ).bind(profileId).first() as { count: number } | null;
  return row?.count ?? 0;
}
