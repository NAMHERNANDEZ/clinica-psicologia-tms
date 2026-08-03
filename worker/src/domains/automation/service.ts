import type { Env } from '../../types';
import { logNotification } from '../notifications/repository';
import { TEMPLATES } from './templates';
import type { Event } from './events';

function replacePlaceholders(template: string, map: Record<string, string>): string {
  return template.replace(/{{([^}]+)}}/g, (match, key: string) => map[key?.trim()] || '');
}

function buildPlaceholderMap(eventType: string, data: unknown): Record<string, string> {
  const d = (data || {}) as {
    patient_id?: number;
    id?: number;
    appointment_id?: number;
    nombre?: string;
    patient_name?: string;
    time?: string;
    date?: string;
    type?: string;
    servicio_interesado?: string;
    patient?: { name?: string };
    reminder?: { scheduled_at?: string };
  };

  const nombre = d.nombre || d.patient_name || d.patient?.name || 'Paciente';
  const hora = d.time || d.reminder?.scheduled_at || 'tu hora';
  const fecha = d.date || '';
  const servicio = d.type || d.servicio_interesado || 'Consulta';

  const map: Record<string, string> = {
    nombre: String(nombre || 'Paciente'),
    hora: String(hora || ''),
    fecha: String(fecha || ''),
    servicio: String(servicio || 'Consulta'),
  };
  if (d.patient_id !== undefined) map.patient_id = String(d.patient_id);
  return map;
}

export async function triggerAutomationEvent(
  env: Env,
  event: Event
): Promise<{ success: boolean; notificationId?: number; error?: string }> {
  try {
    const template = TEMPLATES.find((t) => t.event_type === event.type);
    if (!template) {
      return { success: false, error: `Template no encontrado para ${event.type}` };
    }

    const placeholderMap = buildPlaceholderMap(event.type, event.data);
    const message = replacePlaceholders(template.body, placeholderMap);
    const subject = replacePlaceholders(template.subject, placeholderMap);

    let clinicId = 1;
    let patientId: number | null = null;
    let appointmentId: number | null = null;

    const data = event.data as Record<string, unknown>;
    if (event.type.startsWith('LEAD_CREATED')) {
      patientId = null;
      appointmentId = null;
    } else {
      if (data?.patient_id !== undefined) patientId = Number(data.patient_id);
      if (data?.id !== undefined) patientId = patientId ?? Number(data.id);
      if (data?.appointment_id !== undefined) appointmentId = Number(data.appointment_id);
    }

    const notificationId = await logNotification(
      env,
      clinicId,
      patientId ?? 0,
      appointmentId,
      event.type,
      `${subject}\n${message}`,
      template.channel
    );

    console.log(`[automation] Evento ${event.type} -> notificacion ${notificationId}`);
    return { success: true, notificationId };
  } catch (error) {
    console.error(`[automation] Error en triggerAutomationEvent ${event.type}:`, error);
    return { success: false, error: String(error) };
  }
}

export async function triggerAutomationForReminder(
  env: Env,
  appointmentId: number,
  patientName?: string,
  therapistName?: string,
  date?: string,
  time?: string,
  reminderType: '24h' | '1h' = '24h',
  reminderId?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[automation] Trigger para recordatorio ${reminderType} cita ${appointmentId}`);

    const result = await env.DB.prepare(
      `SELECT a.*, p.name as patient_name, t.name as therapist_name
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN therapists t ON a.therapist_id = t.id
       WHERE a.id = ? AND a.status = 'scheduled'`
    ).bind(appointmentId).first() as {
      clinic_id: number;
      patient_id: number;
      patient_name?: string;
      therapist_name?: string;
      date?: string;
      time?: string;
      type?: string;
    } | null;

    if (!result) {
      return { success: false, error: 'Cita no encontrada' };
    }

    const eventType = reminderType === '24h' ? 'REMINDER_24H' : 'REMINDER_1H';
    const placeholderMap: Record<string, string> = {
      nombre: patientName || result.patient_name || 'Paciente',
      hora: time || result.time || '',
      fecha: date || result.date || '',
      servicio: result.type || 'Consulta',
    };

    const template = TEMPLATES.find((t) => t.event_type === eventType);
    if (!template) {
      return { success: false, error: `Template no encontrado: ${eventType}` };
    }

    const message = replacePlaceholders(template.body, placeholderMap);
    const subject = replacePlaceholders(template.subject, placeholderMap);

    const notificationId = await logNotification(
      env,
      result.clinic_id,
      result.patient_id,
      appointmentId,
      eventType,
      `${subject}\n${message}`,
      template.channel
    );

    console.log(`[automation] Recordatorio ${eventType} -> notificacion ${notificationId}`);
    return { success: true };
  } catch (error) {
    console.error(`[automation] Error en triggerAutomationForReminder ${reminderType}:`, error);
    return { success: false, error: String(error) };
  }
}
