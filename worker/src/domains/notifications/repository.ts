import type { Env } from '../../types';

export async function logNotification(
  env: Env,
  clinicId: number,
  userId: number,
  appointmentId: number | null,
  type: string,
  message: string,
  channel: string
): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO notification_logs (clinic_id, user_id, appointment_id, type, message, channel, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'sent', datetime('now'))`
  ).bind(clinicId, userId, appointmentId, type, message, channel).run();

  return result.meta.last_row_id as number;
}

export async function getNotificationsByClinic(env: Env, clinicId: number, limit: number = 50) {
  const result = await env.DB.prepare(
    `SELECT nl.*, u.email as user_email
     FROM notification_logs nl
     LEFT JOIN users u ON nl.user_id = u.id
     WHERE nl.clinic_id = ?
     ORDER BY nl.created_at DESC
     LIMIT ?`
  ).bind(clinicId, limit).all();

  return result.results;
}

export async function getNotificationsByAppointment(env: Env, appointmentId: number) {
  const result = await env.DB.prepare(
    `SELECT nl.*, u.email as user_email
     FROM notification_logs nl
     LEFT JOIN users u ON nl.user_id = u.id
     WHERE nl.appointment_id = ?
     ORDER BY nl.created_at DESC`
  ).bind(appointmentId).all();

  return result.results;
}
