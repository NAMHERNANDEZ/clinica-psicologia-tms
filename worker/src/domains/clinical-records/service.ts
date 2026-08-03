import type { Env } from '../../types';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';
import { triggerCompliance } from '../../compliance/automation';

export async function listRecords(env: Env, clinicId: number, patientId: number) {
  const records = patientId > 0
    ? await repo.findRecordsByPatient(env, clinicId, patientId)
    : await repo.findRecords(env, clinicId);
  return { success: true, data: { records } };
}

export async function getRecord(env: Env, clinicId: number, id: number) {
  const record = await repo.findRecordById(env, clinicId, id);
  if (!record) return { success: false, error: 'Expediente no encontrado', status: 404 };
  return { success: true, data: { record } };
}

export async function createRecord(env: Env, clinicId: number, userId: number, data: { patient_id: number; reason_consultation: string; history?: string; evaluation?: string; diagnosis?: string; treatment_plan?: string }, ip: string) {
  const id = await repo.createRecord(env, clinicId, userId, data);
  await logAudit(env, clinicId, userId, 'clinical', 'create', 'clinical_records', id, undefined, JSON.stringify(data), ip, undefined, 'info');
  triggerCompliance(env, data.patient_id);
  return { success: true, data: { id } };
}

export async function updateRecord(env: Env, clinicId: number, userId: number, id: number, data: Record<string, unknown>, ip: string) {
  const before = await repo.findRecordById(env, clinicId, id);
  if (!before) return { success: false, error: 'Expediente no encontrado', status: 404 };
  const patientId = (before as any).patient_id || 0;
  const success = await repo.updateRecord(env, clinicId, id, data as any);
  if (!success) return { success: false, error: 'Expediente no encontrado', status: 404 };
  await logAudit(env, clinicId, userId, 'clinical', 'update', 'clinical_records', id, JSON.stringify(before), JSON.stringify(data), ip, undefined, 'info');
  if (patientId > 0) triggerCompliance(env, patientId);
  return { success: true, data: null };
}

export async function deleteRecord(env: Env, clinicId: number, userId: number, id: number, ip: string) {
  const before = await repo.findRecordById(env, clinicId, id);
  if (!before) return { success: false, error: 'Expediente no encontrado', status: 404 };
  const success = await repo.deleteRecord(env, clinicId, id);
  if (!success) return { success: false, error: 'Expediente no encontrado', status: 404 };
  await logAudit(env, clinicId, userId, 'clinical', 'delete', 'clinical_records', id, JSON.stringify(before), undefined, ip, undefined, 'warning');
  return { success: true, data: null };
}