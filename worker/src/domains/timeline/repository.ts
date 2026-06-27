import type { Env } from '../../types';
import type { TimelineEventInput } from './validators';

export interface TimelineEvent {
  id: number;
  clinic_id: number;
  patient_id: number;
  type: string;
  title: string;
  description: string | null;
  entity: string | null;
  entity_id: number | null;
  created_at: string;
}

export async function getTimelineByPatient(env: Env, patientId: number): Promise<TimelineEvent[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM patient_timeline_events WHERE patient_id = ? ORDER BY created_at DESC"
  ).bind(patientId).all();
  return result.results as unknown as TimelineEvent[];
}

export async function getTimelineByClinic(env: Env, clinicId: number, limit = 100): Promise<TimelineEvent[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM patient_timeline_events WHERE clinic_id = ? ORDER BY created_at DESC LIMIT ?"
  ).bind(clinicId, limit).all();
  return result.results as unknown as TimelineEvent[];
}

export async function createEvent(env: Env, clinicId: number, data: TimelineEventInput): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO patient_timeline_events (clinic_id, patient_id, type, title, description, entity, entity_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    clinicId,
    data.patient_id,
    data.type,
    data.title,
    data.description || null,
    data.entity || null,
    data.entity_id || null
  ).run();
  return result.meta.last_row_id as number;
}

export async function deleteEvent(env: Env, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM patient_timeline_events WHERE id = ?"
  ).bind(id).run();
  return result.meta.changes > 0;
}
