import type { Env } from '../../types';

export interface MotorThreshold {
  id: number;
  clinic_id: number;
  patient_id: number;
  therapist_id?: number;
  mt_pct: number;
  measured_at: string;
  coil_type?: string;
  stimulation_site: string;
  method: 'relative' | 'active' | 'resting';
  notes?: string;
  created_at: string;
}

export interface MotorThresholdWithPatient extends MotorThreshold {
  patient_name?: string;
}

export async function findByPatient(env: Env, patientId: number): Promise<MotorThreshold[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM motor_thresholds WHERE patient_id = ? ORDER BY measured_at DESC'
  ).bind(patientId).all<MotorThreshold>();
  return results;
}

export async function findLatest(env: Env, patientId: number): Promise<MotorThreshold | null> {
  const result = await env.DB.prepare(
    'SELECT * FROM motor_thresholds WHERE patient_id = ? ORDER BY measured_at DESC LIMIT 1'
  ).bind(patientId).first<MotorThreshold>();
  return result || null;
}

export async function create(
  env: Env,
  clinicId: number,
  data: {
    patient_id: number;
    therapist_id?: number;
    mt_pct: number;
    measured_at: string;
    coil_type?: string;
    stimulation_site?: string;
    method?: string;
    notes?: string;
  }
): Promise<MotorThreshold> {
  const stimulationSite = data.stimulation_site || 'M1';
  const method = data.method || 'active';
  const result = await env.DB.prepare(
    `INSERT INTO motor_thresholds (clinic_id, patient_id, therapist_id, mt_pct, measured_at, coil_type, stimulation_site, method, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     RETURNING *`
  )
    .bind(
      clinicId,
      data.patient_id,
      data.therapist_id || null,
      data.mt_pct,
      data.measured_at,
      data.coil_type || null,
      stimulationSite,
      method,
      data.notes || null
    )
    .first<MotorThreshold>();
  if (!result) throw new Error('Failed to create motor threshold');
  return result;
}

export async function remove(env: Env, id: number): Promise<void> {
  await env.DB.prepare('DELETE FROM motor_thresholds WHERE id = ?').bind(id).run();
}

export async function getByClinic(env: Env, clinicId: number): Promise<MotorThresholdWithPatient[]> {
  const { results } = await env.DB.prepare(
    `SELECT mt.*, p.name as patient_name
     FROM motor_thresholds mt
     LEFT JOIN patients p ON mt.patient_id = p.id
     WHERE mt.clinic_id = ?
     ORDER BY mt.measured_at DESC`
  ).bind(clinicId).all<MotorThresholdWithPatient>();
  return results;
}
