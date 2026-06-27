import type { Env } from '../../types';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';

export async function listAppointments(env: Env, clinicId: number, filters: { date?: string; therapist_id?: number; patient_id?: number }) {
  const appointments = await repo.findAppointments(env, clinicId, filters);
  return { success: true, data: { appointments } };
}

export async function getAppointment(env: Env, clinicId: number, id: number) {
  const appointment = await repo.findAppointmentById(env, clinicId, id);
  if (!appointment) return { success: false, error: 'Cita no encontrada', status: 404 };
  return { success: true, data: { appointment } };
}

export async function createAppointment(env: Env, clinicId: number, userId: number, data: {
  patient_id: number; therapist_id: number; date: string; time: string; duration?: number; notes?: string;
}, ip: string) {
  const id = await repo.createAppointment(env, clinicId, data);
  await logAudit(env, clinicId, userId, 'create', 'appointments', id, undefined, JSON.stringify(data), ip);
  return { success: true, data: { id } };
}

export async function updateAppointment(env: Env, clinicId: number, userId: number, id: number, data: Record<string, unknown>, ip: string) {
  const before = await repo.findAppointmentById(env, clinicId, id);
  const success = await repo.updateAppointment(env, clinicId, id, data as any);
  if (!success) return { success: false, error: 'Cita no encontrada', status: 404 };
  await logAudit(env, clinicId, userId, 'update', 'appointments', id, JSON.stringify(before), JSON.stringify(data), ip);
  return { success: true, data: null };
}

export async function deleteAppointment(env: Env, clinicId: number, userId: number, id: number, ip: string) {
  const before = await repo.findAppointmentById(env, clinicId, id);
  const success = await repo.deleteAppointment(env, clinicId, id);
  if (!success) return { success: false, error: 'Cita no encontrada', status: 404 };
  await logAudit(env, clinicId, userId, 'delete', 'appointments', id, JSON.stringify(before), undefined, ip);
  return { success: true, data: null };
}
