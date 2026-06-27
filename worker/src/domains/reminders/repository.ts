import type { Env } from '../../types';

export async function findPendingReminders(env: Env, clinicId: number) {
  const result = await env.DB.prepare(
    `SELECT rq.*, p.name as patient_name, p.phone as patient_phone, t.name as therapist_name
     FROM reminders_queue rq
     JOIN patients p ON rq.patient_id = p.id
     JOIN therapists t ON rq.therapist_id = t.id
     WHERE rq.clinic_id = ? AND rq.status = 'pending'
     ORDER BY rq.scheduled_at ASC`
  ).bind(clinicId).all();

  return result.results;
}

export async function createReminder(
  env: Env,
  clinicId: number,
  appointmentId: number,
  patientId: number,
  therapistId: number,
  type: '24h' | '1h',
  scheduledAt: string
): Promise<number> {
  const result = await env.DB.prepare(
    `INSERT INTO reminders_queue (clinic_id, appointment_id, patient_id, therapist_id, type, status, scheduled_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(clinicId, appointmentId, patientId, therapistId, type, scheduledAt).run();

  return result.meta.last_row_id as number;
}

export async function markReminderSent(env: Env, id: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE reminders_queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?`
  ).bind(id).run();
}

export async function deleteRemindersForAppointment(env: Env, appointmentId: number): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM reminders_queue WHERE appointment_id = ?`
  ).bind(appointmentId).run();
}

export async function regenerateReminders(
  env: Env,
  clinicId: number,
  appointmentId: number,
  patientId: number,
  therapistId: number,
  date: string,
  time: string
): Promise<{ reminder24hId: number; reminder1hId: number }> {
  await deleteRemindersForAppointment(env, appointmentId);

  const appointmentDateTime = new Date(`${date}T${time}`);

  const scheduled24h = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
  const scheduled1h = new Date(appointmentDateTime.getTime() - 1 * 60 * 60 * 1000);

  const reminder24hId = await createReminder(
    env, clinicId, appointmentId, patientId, therapistId, '24h', scheduled24h.toISOString()
  );
  const reminder1hId = await createReminder(
    env, clinicId, appointmentId, patientId, therapistId, '1h', scheduled1h.toISOString()
  );

  return { reminder24hId, reminder1hId };
}
