import type { Env } from '../../types';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';

export async function listTherapists(env: Env, clinicId: number) {
  const therapists = await repo.findTherapists(env, clinicId);
  return { success: true, data: { therapists } };
}

export async function getTherapist(env: Env, clinicId: number, id: number) {
  const therapist = await repo.findTherapistById(env, clinicId, id);
  if (!therapist) return { success: false, error: 'Terapeuta no encontrado', status: 404 };
  return { success: true, data: { therapist } };
}

export async function createTherapist(env: Env, clinicId: number, userId: number, data: { name: string; email: string; phone?: string; specialty: string }, ip: string) {
  const id = await repo.createTherapist(env, clinicId, data);
  await logAudit(env, clinicId, userId, 'create', 'therapists', id, undefined, JSON.stringify(data), ip);
  return { success: true, data: { id } };
}

export async function updateTherapist(env: Env, clinicId: number, userId: number, id: number, data: Record<string, unknown>, ip: string) {
  const before = await repo.findTherapistById(env, clinicId, id);
  const success = await repo.updateTherapist(env, clinicId, id, data as any);
  if (!success) return { success: false, error: 'Terapeuta no encontrado', status: 404 };
  await logAudit(env, clinicId, userId, 'update', 'therapists', id, JSON.stringify(before), JSON.stringify(data), ip);
  return { success: true, data: null };
}

export async function deleteTherapist(env: Env, clinicId: number, userId: number, id: number, ip: string) {
  const before = await repo.findTherapistById(env, clinicId, id);
  const success = await repo.deleteTherapist(env, clinicId, id);
  if (!success) return { success: false, error: 'Terapeuta no encontrado', status: 404 };
  await logAudit(env, clinicId, userId, 'delete', 'therapists', id, JSON.stringify(before), undefined, ip);
  return { success: true, data: null };
}
