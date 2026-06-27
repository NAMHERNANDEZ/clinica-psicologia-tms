import type { Env } from '../../types';
import {
  findPendingReminders,
  createReminder,
  markReminderSent,
  deleteRemindersForAppointment,
} from './repository';

export async function generateReminders(env: Env, clinicId: number) {
  const now = new Date();
  const window24hStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const window1hStart = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const window1hEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const formatTime = (d: Date) => d.toTimeString().split(' ')[0];

  const existingReminders = await env.DB.prepare(
    `SELECT appointment_id, type FROM reminders_queue WHERE clinic_id = ?`
  ).bind(clinicId).all();

  const existingSet = new Set(
    existingReminders.results.map((r) => `${r.appointment_id}-${r.type}`)
  );

  const created: Array<{ appointmentId: number; type: string; id: number }> = [];

  // 24h reminders: appointments between 24h and 25h from now
  const apt24h = await env.DB.prepare(
    `SELECT id, patient_id, therapist_id, date, time
     FROM appointments
     WHERE clinic_id = ? AND status = 'scheduled'
       AND date >= ? AND date <= ?
       AND time >= ? AND time <= ?`
  ).bind(clinicId, formatDate(window24hStart), formatDate(window24hEnd), formatTime(window24hStart), formatTime(window24hEnd)).all();

  for (const apt of apt24h.results) {
    if (existingSet.has(`${apt.id}-24h`)) continue;
    const scheduledAt = new Date(new Date(`${apt.date}T${apt.time}`).getTime() - 24 * 60 * 60 * 1000);
    const id = await createReminder(env, clinicId, apt.id as number, apt.patient_id as number, apt.therapist_id as number, '24h', scheduledAt.toISOString());
    created.push({ appointmentId: apt.id as number, type: '24h', id });
  }

  // 1h reminders: appointments between 1h and 2h from now
  const apt1h = await env.DB.prepare(
    `SELECT id, patient_id, therapist_id, date, time
     FROM appointments
     WHERE clinic_id = ? AND status = 'scheduled'
       AND date >= ? AND date <= ?
       AND time >= ? AND time <= ?`
  ).bind(clinicId, formatDate(window1hStart), formatDate(window1hEnd), formatTime(window1hStart), formatTime(window1hEnd)).all();

  for (const apt of apt1h.results) {
    if (existingSet.has(`${apt.id}-1h`)) continue;
    const scheduledAt = new Date(new Date(`${apt.date}T${apt.time}`).getTime() - 1 * 60 * 60 * 1000);
    const id = await createReminder(env, clinicId, apt.id as number, apt.patient_id as number, apt.therapist_id as number, '1h', scheduledAt.toISOString());
    created.push({ appointmentId: apt.id as number, type: '1h', id });
  }

  return { created, count: created.length };
}

export async function getReminders(env: Env, clinicId: number) {
  return findPendingReminders(env, clinicId);
}

export async function markOpened(env: Env, id: number) {
  await env.DB.prepare(
    `UPDATE reminders_queue SET status = 'opened' WHERE id = ?`
  ).bind(id).run();
}
