import type { Env } from '../../types';
import type { ClinicalNoteInput } from './validators';

export interface ClinicalNote {
  id: number;
  clinic_id: number;
  patient_id: number;
  therapist_id: number;
  appointment_id: number | null;
  treatment_id: number | null;
  note: string;
  note_type: string;
  created_at: string;
  therapist_name?: string;
}

export async function findNotesByPatient(env: Env, patientId: number): Promise<ClinicalNote[]> {
  const result = await env.DB.prepare(
    `SELECT cn.*, t.name as therapist_name
     FROM clinical_notes cn
     LEFT JOIN therapists t ON t.id = cn.therapist_id
     WHERE cn.patient_id = ?
     ORDER BY cn.created_at DESC`
  ).bind(patientId).all();
  return result.results as unknown as ClinicalNote[];
}

export async function findNotesByClinic(env: Env, clinicId: number, limit: number = 50): Promise<ClinicalNote[]> {
  const result = await env.DB.prepare(
    `SELECT cn.*, t.name as therapist_name
     FROM clinical_notes cn
     LEFT JOIN therapists t ON t.id = cn.therapist_id
     WHERE cn.clinic_id = ?
     ORDER BY cn.created_at DESC
     LIMIT ?`
  ).bind(clinicId, limit).all();
  return result.results as unknown as ClinicalNote[];
}

export async function createNote(env: Env, clinicId: number, data: ClinicalNoteInput & { therapist_id: number }): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO clinical_notes (clinic_id, patient_id, therapist_id, appointment_id, treatment_id, note, note_type)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    clinicId,
    data.patient_id,
    data.therapist_id,
    data.appointment_id || null,
    data.treatment_id || null,
    data.note,
    data.note_type || 'session'
  ).run();
  return result.meta.last_row_id as number;
}

export async function deleteNote(env: Env, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM clinical_notes WHERE id = ?"
  ).bind(id).run();
  return result.meta.changes > 0;
}
