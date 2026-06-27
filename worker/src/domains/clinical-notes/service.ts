import type { Env } from '../../types';
import type { ClinicalNoteInput } from './validators';
import * as repo from './repository';

export async function getPatientNotes(env: Env, patientId: number) {
  const notes = await repo.findNotesByPatient(env, patientId);
  return { success: true, data: { notes } };
}

export async function getClinicNotes(env: Env, clinicId: number) {
  const notes = await repo.findNotesByClinic(env, clinicId);
  return { success: true, data: { notes } };
}

export async function createNote(env: Env, clinicId: number, therapistId: number, data: ClinicalNoteInput) {
  const id = await repo.createNote(env, clinicId, { ...data, therapist_id: therapistId });
  return { success: true, data: { id } };
}

export async function deleteNote(env: Env, id: number) {
  const deleted = await repo.deleteNote(env, id);
  if (!deleted) return { success: false, error: 'Nota no encontrada', status: 404 };
  return { success: true, data: null };
}
