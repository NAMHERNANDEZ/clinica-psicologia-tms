import type { Env } from '../../types';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';
import { triggerCompliance } from '../../compliance/automation';

export async function listNotes(env: Env, clinicId: number, patientId: number) {
  const notes = patientId > 0
    ? await repo.findNotesByPatient(env, clinicId, patientId)
    : await repo.findNotes(env, clinicId);
  return { success: true, data: { notes } };
}

export async function getNote(env: Env, clinicId: number, id: number) {
  const note = await repo.findNoteById(env, clinicId, id);
  if (!note) return { success: false, error: 'Nota no encontrada', status: 404 };
  return { success: true, data: { note } };
}

export async function createNote(env: Env, clinicId: number, userId: number, data: { patient_id: number; session_date: string; subjective?: string; objective?: string; assessment?: string; plan?: string; signature?: string }, ip: string) {
  const id = await repo.createNote(env, clinicId, userId, data);
  await logAudit(env, clinicId, userId, 'clinical', 'create', 'session_notes', id, undefined, JSON.stringify(data), ip, undefined, 'info');
  triggerCompliance(env, data.patient_id);
  return { success: true, data: { id } };
}

export async function updateNote(env: Env, clinicId: number, userId: number, id: number, data: Record<string, unknown>, ip: string) {
  const before = await repo.findNoteById(env, clinicId, id);
  if (!before) return { success: false, error: 'Nota no encontrada', status: 404 };
  const patientId = (before as any).patient_id || 0;
  const success = await repo.updateNote(env, clinicId, id, data as any);
  if (!success) return { success: false, error: 'Nota no encontrada', status: 404 };
  await logAudit(env, clinicId, userId, 'clinical', 'update', 'session_notes', id, JSON.stringify(before), JSON.stringify(data), ip, undefined, 'info');
  if (patientId > 0) triggerCompliance(env, patientId);
  return { success: true, data: null };
}

export async function deleteNote(env: Env, clinicId: number, userId: number, id: number, ip: string) {
  const before = await repo.findNoteById(env, clinicId, id);
  if (!before) return { success: false, error: 'Nota no encontrada', status: 404 };
  const success = await repo.deleteNote(env, clinicId, id);
  if (!success) return { success: false, error: 'Nota no encontrada', status: 404 };
  await logAudit(env, clinicId, userId, 'clinical', 'delete', 'session_notes', id, JSON.stringify(before), undefined, ip, undefined, 'critical');
  return { success: true, data: null };
}