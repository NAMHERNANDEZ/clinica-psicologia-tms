import type { Env } from '../../types';
import * as repo from './repository';
import * as leadRepo from '../leads/repository';
import * as patientRepo from '../patients/repository';
import * as therapistRepo from '../therapists/repository';
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
  patient_id?: number; lead_id?: number; therapist_id?: number; date: string; time: string; duration?: number; notes?: string; type?: string;
}, ip: string) {
  let patientId = data.patient_id;
  let linkedLeadId: number | null = data.lead_id ?? null;
  let promoted = false;

  // Resolver terapeuta: usar el provisto o el primero activo de la clínica
  let therapistId = data.therapist_id ?? null;
  if (!therapistId) {
    therapistId = await therapistRepo.findFirstActiveTherapist(env, clinicId);
  }
  if (!therapistId) {
    return { success: false, error: 'No hay terapeuta activo en la clínica', status: 400 };
  }

  // Promoción Lead -> Paciente cuando la cita se origina de un lead
  if (!patientId && data.lead_id) {
    const lead = await leadRepo.getLead(env, data.lead_id, clinicId) as unknown as { id: number; nombre?: string | null; telefono?: string | null; email?: string | null; estado?: string; deleted_at?: string | null };
    if (!lead || lead.deleted_at) return { success: false, error: 'Lead no encontrado', status: 404 };

    const name = (lead.nombre || `Lead ${lead.id}`).trim();
    const phone = (lead.telefono || '').trim();
    const email = (lead.email || undefined) as string | undefined;

    if (!name || !phone) {
      return { success: false, error: 'El lead necesita nombre y teléfono para crear un paciente', status: 400 };
    }
    // Política: si ya hay un paciente con el mismo teléfono, reutilizarlo
    const existing = await patientRepo.findPatientByPhone(env, clinicId, phone);
    patientId = existing
      ? existing.id
      : await patientRepo.createPatient(env, clinicId, { name, phone, email: email || undefined });
    promoted = true;

    // Actualizar estado del lead a CONTACTADO y registrar en su auditoría
    const leadAny = lead as unknown as { estado?: string };
    if (leadAny.estado !== 'CONTACTADO') {
      await leadRepo.updateLeadEstado(env, data.lead_id, clinicId, 'CONTACTADO');
      await leadRepo.recordLeadAudit(env, {
        leadId: data.lead_id,
        accion: 'creacion_cita',
        estadoAnterior: leadAny.estado || null,
        estadoNuevo: 'CONTACTADO',
        usuarioId: userId,
      });
    }
  }

  const id = await repo.createAppointment(env, clinicId, {
    patient_id: patientId as number,
    therapist_id: therapistId,
    date: data.date,
    time: data.time,
    duration: data.duration,
    notes: data.notes,
    lead_id: linkedLeadId,
    type: data.type,
  });

  await logAudit(env, clinicId, userId, 'appointments', 'create', 'appointments', id, undefined, JSON.stringify({ ...data, patient_id: patientId, lead_id: linkedLeadId }), ip, undefined, 'info');
  return { success: true, data: { id, patient_id: patientId, lead_id: linkedLeadId, promoted } };
}

export async function updateAppointment(env: Env, clinicId: number, userId: number, id: number, data: Record<string, unknown>, ip: string) {
  const before = await repo.findAppointmentById(env, clinicId, id);
  const success = await repo.updateAppointment(env, clinicId, id, data as any);
  if (!success) return { success: false, error: 'Cita no encontrada', status: 404 };
  await logAudit(env, clinicId, userId, 'appointments', 'update', 'appointments', id, JSON.stringify(before), JSON.stringify(data), ip, undefined, 'info');
  return { success: true, data: null };
}

export async function deleteAppointment(env: Env, clinicId: number, userId: number, id: number, ip: string) {
  const before = await repo.findAppointmentById(env, clinicId, id);
  const success = await repo.softDeleteAppointment(env, clinicId, id);
  if (!success) return { success: false, error: 'Cita no encontrada', status: 404 };
  await logAudit(env, clinicId, userId, 'appointments', 'delete', 'appointments', id, JSON.stringify(before), undefined, ip, undefined, 'info');
  return { success: true, data: null };
}