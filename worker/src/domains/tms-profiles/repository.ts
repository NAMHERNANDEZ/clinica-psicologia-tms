import type { Env } from '../../types';
import type { TmsProfileInput, TmsProfileStatus } from './validators';

export interface TmsPatientProfile {
  id: number;
  clinic_id: number;
  patient_id: number;
  protocol_id: number;
  therapist_id: number;
  motor_threshold_id: number;
  assigned_diagnosis: string;
  baseline_bdi: number | null;
  baseline_gad7: number | null;
  baseline_phq9: number | null;
  status: TmsProfileStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = 'id, clinic_id, patient_id, protocol_id, therapist_id, motor_threshold_id, assigned_diagnosis, baseline_bdi, baseline_gad7, baseline_phq9, status, start_date, end_date, created_at, updated_at';

export async function findByPatient(env: Env, patientId: number): Promise<TmsPatientProfile[]> {
  const result = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM tms_patient_profiles WHERE patient_id = ? ORDER BY created_at DESC`
  ).bind(patientId).all();
  return result.results as unknown as TmsPatientProfile[];
}

export async function findByClinic(env: Env, clinicId: number): Promise<(TmsPatientProfile & { patient_name: string; protocol_name: string })[]> {
  const result = await env.DB.prepare(
    `SELECT p.*, pt.name as patient_name, pr.name as protocol_name
     FROM tms_patient_profiles p
     LEFT JOIN patients pt ON pt.id = p.patient_id
     LEFT JOIN tms_protocols pr ON pr.id = p.protocol_id
     WHERE p.clinic_id = ?
     ORDER BY p.created_at DESC`
  ).bind(clinicId).all();
  return result.results as unknown as (TmsPatientProfile & { patient_name: string; protocol_name: string })[];
}

export async function findById(env: Env, id: number): Promise<(TmsPatientProfile & { patient_name: string; protocol_name: string; therapist_name: string; mt_pct: number | null }) | null> {
  const row = await env.DB.prepare(
    `SELECT p.*, pt.name as patient_name, pr.name as protocol_name, th.name as therapist_name, mt.mt_pct
     FROM tms_patient_profiles p
     LEFT JOIN patients pt ON pt.id = p.patient_id
     LEFT JOIN tms_protocols pr ON pr.id = p.protocol_id
     LEFT JOIN therapists th ON th.id = p.therapist_id
     LEFT JOIN motor_thresholds mt ON mt.id = p.motor_threshold_id
     WHERE p.id = ?`
  ).bind(id).first();
  return (row as unknown as TmsPatientProfile & { patient_name: string; protocol_name: string; therapist_name: string; mt_pct: number | null }) || null;
}

export async function findActiveByPatient(env: Env, patientId: number): Promise<TmsPatientProfile | null> {
  const row = await env.DB.prepare(
    `SELECT ${COLUMNS} FROM tms_patient_profiles WHERE patient_id = ? AND status = 'active' LIMIT 1`
  ).bind(patientId).first();
  return (row as unknown as TmsPatientProfile) || null;
}

export async function create(env: Env, clinicId: number, data: TmsProfileInput): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO tms_patient_profiles (clinic_id, patient_id, protocol_id, therapist_id, motor_threshold_id, assigned_diagnosis, baseline_bdi, baseline_gad7, baseline_phq9, start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    clinicId,
    data.patient_id,
    data.protocol_id,
    data.therapist_id,
    data.motor_threshold_id,
    data.assigned_diagnosis,
    data.baseline_bdi || null,
    data.baseline_gad7 || null,
    data.baseline_phq9 || null,
    data.start_date || null
  ).run();
  return result.meta.last_row_id as number;
}

export async function updateStatus(env: Env, id: number, status: TmsProfileStatus): Promise<boolean> {
  const endDateTime = (status === 'completed' || status === 'discontinued') ? new Date().toISOString() : undefined;
  if (endDateTime) {
    const result = await env.DB.prepare(
      `UPDATE tms_patient_profiles SET status = ?, end_date = ?, updated_at = ? WHERE id = ?`
    ).bind(status, endDateTime, new Date().toISOString(), id).run();
    return result.meta.changes > 0;
  }
  const result = await env.DB.prepare(
    `UPDATE tms_patient_profiles SET status = ?, updated_at = ? WHERE id = ?`
  ).bind(status, new Date().toISOString(), id).run();
  return result.meta.changes > 0;
}

export async function deleteProfile(env: Env, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    `DELETE FROM tms_patient_profiles WHERE id = ?`
  ).bind(id).run();
  return result.meta.changes > 0;
}
