import type { Env } from '../../types';

export async function getReceptionQueue(env: Env, clinicId: number) {
  const { results } = await env.DB.prepare(`
    SELECT 
      rq.id,
      rq.appointment_id,
      rq.patient_id,
      rq.priority,
      rq.status,
      rq.notes,
      rq.created_at,
      rq.updated_at,
      p.name as patient_name,
      p.phone as patient_phone,
      a.date as appointment_date,
      a.time as appointment_time,
      a.duration as appointment_duration,
      t.name as therapist_name
    FROM reception_queue rq
    JOIN patients p ON rq.patient_id = p.id AND p.clinic_id = rq.clinic_id
    LEFT JOIN appointments a ON rq.appointment_id = a.id AND a.clinic_id = rq.clinic_id
    LEFT JOIN therapists t ON a.therapist_id = t.id AND t.clinic_id = rq.clinic_id
    WHERE rq.clinic_id = ? AND rq.status IN ('waiting', 'in_progress')
    ORDER BY 
      CASE rq.priority 
        WHEN 'urgent' THEN 0 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
      END,
      rq.created_at ASC
  `).bind(clinicId).all();

  return results;
}

export async function addToQueue(
  env: Env,
  clinicId: number,
  appointmentId: number | null,
  patientId: number,
  priority: string,
  notes: string | null
) {
  const now = new Date().toISOString();
  const { meta } = await env.DB.prepare(`
    INSERT INTO reception_queue (clinic_id, appointment_id, patient_id, priority, status, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'waiting', ?, ?, ?)
  `).bind(clinicId, appointmentId, patientId, priority, notes, now, now).run();

  return meta.last_row_id;
}

export async function updateQueueStatus(env: Env, id: number, status: string) {
  const now = new Date().toISOString();
  const { changes } = await env.DB.prepare(`
    UPDATE reception_queue
    SET status = ?, updated_at = ?
    WHERE id = ?
  `).bind(status, now, id).run();

  return changes > 0;
}

export async function removeFromQueue(env: Env, id: number) {
  const { changes } = await env.DB.prepare(`
    DELETE FROM reception_queue WHERE id = ?
  `).bind(id).run();

  return changes > 0;
}

export async function getTodaysAppointments(env: Env, clinicId: number) {
  const today = new Date().toISOString().split('T')[0];
  const { results } = await env.DB.prepare(`
    SELECT 
      a.id,
      a.patient_id,
      a.therapist_id,
      a.date,
      a.time,
      a.duration,
      a.status,
      p.name as patient_name,
      p.phone as patient_phone,
      t.name as therapist_name,
      t.specialty as therapist_specialty
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id AND p.clinic_id = a.clinic_id
    JOIN therapists t ON a.therapist_id = t.id AND t.clinic_id = a.clinic_id
    WHERE a.clinic_id = ? AND a.date = ?
    ORDER BY a.time ASC
  `).bind(clinicId, today).all();

  return results;
}

export async function getUrgentItems(env: Env, clinicId: number) {
  const oneHourFromNow = new Date();
  oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
  const oneHourTime = oneHourFromNow.toTimeString().split(' ')[0];

  const { results } = await env.DB.prepare(`
    SELECT 
      rq.id,
      rq.appointment_id,
      rq.patient_id,
      rq.priority,
      rq.status,
      rq.notes,
      rq.created_at,
      p.name as patient_name,
      a.date as appointment_date,
      a.time as appointment_time,
      t.name as therapist_name
    FROM reception_queue rq
    JOIN patients p ON rq.patient_id = p.id AND p.clinic_id = rq.clinic_id
    LEFT JOIN appointments a ON rq.appointment_id = a.id AND a.clinic_id = rq.clinic_id
    LEFT JOIN therapists t ON a.therapist_id = t.id AND t.clinic_id = rq.clinic_id
    WHERE rq.clinic_id = ? 
      AND (rq.priority = 'urgent' OR (a.date = ? AND a.time <= ? AND a.time > ?))
      AND rq.status IN ('waiting', 'in_progress')
    ORDER BY rq.priority = 'urgent' DESC, rq.created_at ASC
  `).bind(
    clinicId,
    new Date().toISOString().split('T')[0],
    oneHourTime,
    new Date().toTimeString().split(' ')[0]
  ).all();

  return results;
}

export async function getUnconfirmedAppointments(env: Env, clinicId: number) {
  const today = new Date().toISOString().split('T')[0];
  const { results } = await env.DB.prepare(`
    SELECT 
      a.id,
      a.patient_id,
      a.therapist_id,
      a.date,
      a.time,
      a.duration,
      a.status,
      p.name as patient_name,
      p.phone as patient_phone,
      t.name as therapist_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id AND p.clinic_id = a.clinic_id
    JOIN therapists t ON a.therapist_id = t.id AND t.clinic_id = a.clinic_id
    WHERE a.clinic_id = ? 
      AND a.status = 'scheduled' 
      AND a.reminder_24h_sent = 0
      AND a.date >= ?
    ORDER BY a.date ASC, a.time ASC
  `).bind(clinicId, today).all();

  return results;
}
