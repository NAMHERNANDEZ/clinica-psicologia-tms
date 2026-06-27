import type { Env } from '../../types';
import type { TimelineEventInput } from './validators';
import * as repo from './repository';

export async function getPatientTimeline(env: Env, patientId: number) {
  const events = await repo.getTimelineByPatient(env, patientId);
  return { success: true, data: { events } };
}

export async function getClinicTimeline(env: Env, clinicId: number, limit?: number) {
  const events = await repo.getTimelineByClinic(env, clinicId, limit);
  return { success: true, data: { events } };
}

export async function createEvent(env: Env, clinicId: number, data: TimelineEventInput) {
  const id = await repo.createEvent(env, clinicId, data);
  return { success: true, data: { id } };
}

export async function addRegistrationEvent(env: Env, clinicId: number, patientId: number) {
  const id = await repo.createEvent(env, clinicId, {
    patient_id: patientId,
    type: 'registration',
    title: 'Paciente registrado',
    description: 'Alta inicial del paciente en el sistema',
  });
  return id;
}

export async function addSessionEvent(env: Env, clinicId: number, patientId: number, sessionNumber: number) {
  const id = await repo.createEvent(env, clinicId, {
    patient_id: patientId,
    type: 'session',
    title: `Sesión #${sessionNumber}`,
    description: `Sesión de terapia número ${sessionNumber}`,
    entity: 'appointment',
  });
  return id;
}

export async function deleteEvent(env: Env, id: number) {
  const deleted = await repo.deleteEvent(env, id);
  if (!deleted) return { success: false, error: 'Evento no encontrado', status: 404 };
  return { success: true, data: null };
}
