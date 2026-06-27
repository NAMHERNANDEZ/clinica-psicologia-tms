import type { Env } from '../../types';
import {
  logNotification,
  getNotificationsByClinic,
  getNotificationsByAppointment,
} from './repository';
import type { LogNotificationInput } from './validators';

export async function createNotificationLog(
  env: Env,
  clinicId: number,
  userId: number,
  data: LogNotificationInput
) {
  const id = await logNotification(
    env,
    clinicId,
    userId,
    data.appointment_id ?? null,
    data.type,
    data.message,
    data.channel
  );
  return { id };
}

export async function getNotifications(env: Env, clinicId: number) {
  return getNotificationsByClinic(env, clinicId);
}

export async function getAppointmentNotifications(env: Env, appointmentId: number) {
  return getNotificationsByAppointment(env, appointmentId);
}
