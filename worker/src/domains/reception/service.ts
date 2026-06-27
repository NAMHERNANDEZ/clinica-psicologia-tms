import type { Env } from '../../types';
import * as repository from './repository';

export async function getReceptionDashboard(env: Env, clinicId: number) {
  const [queue, urgent, today, unconfirmed] = await Promise.all([
    repository.getReceptionQueue(env, clinicId),
    repository.getUrgentItems(env, clinicId),
    repository.getTodaysAppointments(env, clinicId),
    repository.getUnconfirmedAppointments(env, clinicId),
  ]);

  const stats = {
    waiting: queue.filter((item) => item.status === 'waiting').length,
    in_progress: queue.filter((item) => item.status === 'in_progress').length,
    done: queue.filter((item) => item.status === 'done').length,
  };

  return { queue, urgent, today, unconfirmed, stats };
}

export async function addToQueue(
  env: Env,
  clinicId: number,
  data: { patient_id: number; appointment_id?: number; priority?: string; notes?: string }
) {
  const priority = data.priority || 'medium';
  const id = await repository.addToQueue(
    env,
    clinicId,
    data.appointment_id || null,
    data.patient_id,
    priority,
    data.notes || null
  );
  return { id };
}

export async function updateStatus(env: Env, id: number, status: string) {
  const updated = await repository.updateQueueStatus(env, id, status);
  return { updated };
}

export async function removeFromQueue(env: Env, id: number) {
  const removed = await repository.removeFromQueue(env, id);
  return { removed };
}
