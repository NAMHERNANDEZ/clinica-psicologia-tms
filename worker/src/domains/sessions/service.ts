import type { Env } from '../../types';
import * as repo from './repository';

export async function getTreatmentSessions(env: Env, treatmentId: number) {
  const sessions = await repo.getSessionsByTreatment(env, treatmentId);
  return { success: true, data: { sessions } };
}

export async function completeSession(env: Env, sessionId: number) {
  const session = await repo.getSessionById(env, sessionId);
  if (!session) return { success: false, error: 'Sesión no encontrada', status: 404 };

  const completedAt = new Date().toISOString();
  const updated = await repo.updateSession(env, sessionId, 'completed', session.notes || null, completedAt);
  if (!updated) return { success: false, error: 'Error al actualizar sesión', status: 500 };

  const completedCount = await repo.getCompletedCount(env, session.treatment_id);

  await env.DB.prepare(`
    UPDATE treatments SET completed_sessions = ?, updated_at = datetime("now")
    WHERE id = ?
  `).bind(completedCount, session.treatment_id).run();

  const treatment = await env.DB.prepare('SELECT * FROM treatments WHERE id = ?').bind(session.treatment_id).first() as {
    total_sessions: number;
    completed_sessions: number;
  } | null;

  if (treatment && treatment.completed_sessions >= treatment.total_sessions) {
    await env.DB.prepare(`
      UPDATE treatments SET status = 'completed', end_date = date('now'), updated_at = datetime("now")
      WHERE id = ?
    `).bind(session.treatment_id).run();
  }

  const updatedSession = await repo.getSessionById(env, sessionId);
  return { success: true, data: { session: updatedSession } };
}

export async function updateSessionStatus(env: Env, sessionId: number, status: string, notes?: string) {
  const session = await repo.getSessionById(env, sessionId);
  if (!session) return { success: false, error: 'Sesión no encontrada', status: 404 };

  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  const updatedNotes = notes !== undefined ? notes : session.notes || null;
  const updated = await repo.updateSession(env, sessionId, status, updatedNotes, completedAt);
  if (!updated) return { success: false, error: 'Error al actualizar sesión', status: 500 };

  if (status === 'completed') {
    const completedCount = await repo.getCompletedCount(env, session.treatment_id);

    await env.DB.prepare(`
      UPDATE treatments SET completed_sessions = ?, updated_at = datetime("now")
      WHERE id = ?
    `).bind(completedCount, session.treatment_id).run();

    const treatment = await env.DB.prepare('SELECT * FROM treatments WHERE id = ?').bind(session.treatment_id).first() as {
      total_sessions: number;
      completed_sessions: number;
    } | null;

    if (treatment && treatment.completed_sessions >= treatment.total_sessions) {
      await env.DB.prepare(`
        UPDATE treatments SET status = 'completed', end_date = date('now'), updated_at = datetime("now")
        WHERE id = ?
      `).bind(session.treatment_id).run();
    }
  }

  const updatedSession = await repo.getSessionById(env, sessionId);
  return { success: true, data: { session: updatedSession } };
}

export async function createSession(env: Env, clinicId: number, treatmentId: number, appointmentId: number | null, sessionNumber: number) {
  const id = await repo.createSession(env, clinicId, treatmentId, appointmentId, sessionNumber);
  return { success: true, data: { id } };
}
