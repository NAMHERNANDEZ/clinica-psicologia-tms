import type { Env } from '../../types';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';

export async function getTreatments(env: Env, clinicId: number) {
  const treatments = await repo.findTreatmentsByClinic(env, clinicId);
  return { success: true, data: { treatments } };
}

export async function getTreatment(env: Env, clinicId: number, id: number) {
  const treatment = await repo.findTreatmentById(env, clinicId, id);
  if (!treatment) return { success: false, error: 'Tratamiento no encontrado', status: 404 };
  const progress = treatment.total_sessions > 0
    ? Math.round((treatment.completed_sessions / treatment.total_sessions) * 100)
    : 0;
  return { success: true, data: { treatment: { ...treatment, progress } } };
}

export async function createTreatment(env: Env, clinicId: number, userId: number, data: {
  patient_id: number;
  therapist_id: number;
  name: string;
  protocol?: string;
  total_sessions?: number;
  start_date: string;
}, ip: string) {
  const id = await repo.createTreatment(env, clinicId, data);
  await logAudit(env, clinicId, userId, 'create', 'treatments', id, undefined, JSON.stringify(data), ip);
  return { success: true, data: { id } };
}

export async function updateTreatment(env: Env, clinicId: number, userId: number, id: number, data: Record<string, unknown>, ip: string) {
  const before = await repo.findTreatmentById(env, clinicId, id);
  const success = await repo.updateTreatment(env, clinicId, id, data as any);
  if (!success) return { success: false, error: 'Tratamiento no encontrado', status: 404 };
  await logAudit(env, clinicId, userId, 'update', 'treatments', id, JSON.stringify(before), JSON.stringify(data), ip);
  return { success: true, data: null };
}

export async function deleteTreatment(env: Env, clinicId: number, userId: number, id: number, ip: string) {
  const before = await repo.findTreatmentById(env, clinicId, id);
  const success = await repo.deleteTreatment(env, clinicId, id);
  if (!success) return { success: false, error: 'Tratamiento no encontrado', status: 404 };
  await logAudit(env, clinicId, userId, 'delete', 'treatments', id, JSON.stringify(before), undefined, ip);
  return { success: true, data: null };
}

export async function getPatientTreatments(env: Env, clinicId: number, patientId: number) {
  const treatments = await repo.findTreatmentsByPatient(env, clinicId, patientId);
  return { success: true, data: { treatments } };
}
