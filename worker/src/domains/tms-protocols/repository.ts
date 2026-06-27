import type { Env } from '../../types';
import type { TmsProtocolInput, StimulationType, EvidenceLevel } from './validators';

export interface TmsProtocol {
  id: number;
  clinic_id: number;
  name: string;
  description: string | null;
  indication: string;
  target_area: string;
  frequency_hz: number;
  intensity_pct_mt: number;
  pulses_per_session: number;
  session_duration_min: number;
  total_sessions: number;
  rest_period_sec: number;
  stimulation_type: StimulationType;
  evidence_level: EvidenceLevel;
  active: number;
  created_at: string;
}

const COLUMNS = 'id, clinic_id, name, description, indication, target_area, frequency_hz, intensity_pct_mt, pulses_per_session, session_duration_min, total_sessions, rest_period_sec, stimulation_type, evidence_level, active, created_at';

export async function findAllByClinic(env: Env, clinicId: number): Promise<TmsProtocol[]> {
  const result = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM tms_protocols WHERE clinic_id = ? ORDER BY indication, name`
  ).bind(clinicId).all();
  return result.results as unknown as TmsProtocol[];
}

export async function findById(env: Env, id: number): Promise<TmsProtocol | null> {
  const row = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM tms_protocols WHERE id = ?`
  ).bind(id).first();
  return (row as unknown as TmsProtocol) || null;
}

export async function findByIndication(env: Env, clinicId: number, indication: string): Promise<TmsProtocol[]> {
  const result = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM tms_protocols WHERE clinic_id = ? AND indication = ? AND active = 1 ORDER BY name`
  ).bind(clinicId, indication).all();
  return result.results as unknown as TmsProtocol[];
}

export async function create(env: Env, clinicId: number, data: TmsProtocolInput): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO tms_protocols (clinic_id, name, description, indication, target_area, frequency_hz, intensity_pct_mt, pulses_per_session, session_duration_min, total_sessions, rest_period_sec, stimulation_type, evidence_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    clinicId,
    data.name,
    data.description || null,
    data.indication,
    data.target_area,
    data.frequency_hz,
    data.intensity_pct_mt,
    data.pulses_per_session,
    data.session_duration_min,
    data.total_sessions,
    data.rest_period_sec,
    data.stimulation_type,
    data.evidence_level
  ).run();
  return result.meta.last_row_id as number;
}

export async function update(env: Env, id: number, data: Partial<TmsProtocolInput>): Promise<boolean> {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return false;
  values.push(id);

  const result = await env.DB.prepare(
    `UPDATE tms_protocols SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  return result.meta.changes > 0;
}

export async function deactivate(env: Env, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    'UPDATE tms_protocols SET active = 0 WHERE id = ?'
  ).bind(id).run();
  return result.meta.changes > 0;
}

export async function getProtocolStats(env: Env, clinicId: number): Promise<{ indication: string; count: number; avg_sessions: number }[]> {
  const result = await env.DB.prepare(
    `SELECT indication, COUNT(*) as count, AVG(total_sessions) as avg_sessions FROM tms_protocols WHERE clinic_id = ? GROUP BY indication ORDER BY indication`
  ).bind(clinicId).all();
  return result.results as { indication: string; count: number; avg_sessions: number }[];
}
