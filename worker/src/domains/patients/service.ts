import type { Env } from '../../types';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';

export async function listPatients(env: Env, clinicId: number, search?: string) {
  const patients = await repo.findPatients(env, clinicId, search);
  return { success: true, data: { patients } };
}

export async function getPatient(env: Env, clinicId: number, id: number) {
  const patient = await repo.findPatientById(env, clinicId, id);
  if (!patient) return { success: false, error: 'Paciente no encontrado', status: 404 };
  return { success: true, data: { patient } };
}

export async function createPatient(env: Env, clinicId: number, userId: number, data: { name: string; phone: string; email?: string; birthdate?: string }, ip: string) {
  const id = await repo.createPatient(env, clinicId, data);
  await logAudit(env, clinicId, userId, 'create', 'patients', id, undefined, JSON.stringify(data), ip);
  return { success: true, data: { id } };
}

export async function updatePatient(env: Env, clinicId: number, userId: number, id: number, data: Record<string, unknown>, ip: string) {
  const before = await repo.findPatientById(env, clinicId, id);
  const success = await repo.updatePatient(env, clinicId, id, data as any);
  if (!success) return { success: false, error: 'Paciente no encontrado', status: 404 };
  await logAudit(env, clinicId, userId, 'update', 'patients', id, JSON.stringify(before), JSON.stringify(data), ip);
  return { success: true, data: null };
}

export async function deletePatient(env: Env, clinicId: number, userId: number, id: number, ip: string) {
  const before = await repo.findPatientById(env, clinicId, id);
  const success = await repo.deletePatient(env, clinicId, id);
  if (!success) return { success: false, error: 'Paciente no encontrado', status: 404 };
  await logAudit(env, clinicId, userId, 'delete', 'patients', id, JSON.stringify(before), undefined, ip);
  return { success: true, data: null };
}
