import type { Env } from '../../types';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';
import type { FollowupStatus, FollowupPriority } from './validators';

export async function listFollowups(env: Env, clinicId: number, filters: { patient_id?: number; status?: string; type?: string }) {
  const followups = await repo.findFollowups(env, clinicId, filters);
  return { success: true, data: { followups } };
}

export async function getFollowup(env: Env, clinicId: number, id: number) {
  const followup = await repo.findFollowupById(env, clinicId, id);
  if (!followup) return { success: false, error: 'Seguimiento no encontrado', status: 404 };
  return { success: true, data: { followup } };
}

export async function createFollowup(env: Env, clinicId: number, userId: number, data: {
  patient_id: number;
  type: string;
  scheduled_at: string;
  priority?: string;
  notes?: string;
  created_by?: number | null;
}, ip: string) {
  const id = await repo.createFollowup(env, clinicId, {
    patient_id: data.patient_id,
    type: data.type,
    scheduled_at: data.scheduled_at,
    priority: (data.priority as FollowupPriority) || 'NORMAL',
    notes: data.notes,
    created_by: data.created_by ?? userId,
  });

  await logAudit(env, clinicId, userId, 'followups', 'create', 'followups', id, undefined, JSON.stringify(data), ip, undefined, 'info');
  return { success: true, data: { id } };
}

export async function updateFollowup(env: Env, clinicId: number, userId: number, id: number, data: Record<string, unknown>, ip: string) {
  const before = await repo.findFollowupById(env, clinicId, id);
  if (!before) return { success: false, error: 'Seguimiento no encontrado', status: 404 };

  const success = await repo.updateFollowup(env, clinicId, id, data as any);
  if (!success) return { valid: false, error: 'Sin cambios', status: 400 };

  await logAudit(env, clinicId, userId, 'followups', 'update', 'followups', id, JSON.stringify(before), JSON.stringify(data), ip, undefined, 'info');
  return { success: true, data: { id } };
}

export async function completeFollowup(env: Env, clinicId: number, userId: number, id: number, outcome: string, outcomeNotes: string | undefined, ip: string) {
  const before = await repo.findFollowupById(env, clinicId, id);
  if (!before) return { success: false, error: 'Seguimiento no encontrado', status: 404 };

  const success = await repo.completeFollowup(env, clinicId, id, outcome, outcomeNotes);
  if (!success) return { success: false, error: 'No se pudo completar', status: 400 };

  await logAudit(env, clinicId, userId, 'followups', 'complete', 'followups', id, JSON.stringify({ status: before.status }), JSON.stringify({ status: 'COMPLETADO', outcome }), ip, undefined, 'info');
  return { success: true, data: { id } };
}

export async function deleteFollowup(env: Env, clinicId: number, userId: number, id: number, ip: string) {
  const before = await repo.findFollowupById(env, clinicId, id);
  if (!before) return { success: false, error: 'Seguimiento no encontrado', status: 404 };

  const success = await repo.deleteFollowup(env, clinicId, id);
  if (!success) return { success: false, error: 'No se pudo cancelar', status: 400 };

  await logAudit(env, clinicId, userId, 'followups', 'delete', 'followups', id, JSON.stringify({ status: before.status }), JSON.stringify({ status: 'CANCELADO' }), ip, undefined, 'info');
  return { success: true, data: { id } };
}
