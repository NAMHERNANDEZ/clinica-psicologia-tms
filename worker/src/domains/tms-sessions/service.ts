import type { Env } from '../../types';
import * as repo from './repository';
import type { TmsSessionInput, TmsSessionStatus } from './validators';

export async function getProfileSessions(env: Env, profileId: number) {
  const sessions = await repo.findByProfile(env, profileId);
  const completedCount = await repo.getCompletedCount(env, profileId);
  const latestSession = await repo.getLatestSession(env, profileId);

  const profile = await env.DB.prepare(
    'SELECT id, protocol_id, total_sessions FROM tms_patient_profiles WHERE id = ?'
  ).bind(profileId).first() as { id: number; protocol_id: number; total_sessions?: number } | null;

  let totalSessions = 0;
  if (profile?.protocol_id) {
    const protocol = await env.DB.prepare(
      'SELECT total_sessions FROM tms_protocols WHERE id = ?'
    ).bind(profile.protocol_id).first() as { total_sessions: number } | null;
    totalSessions = protocol?.total_sessions ?? 0;
  }

  return {
    success: true,
    data: {
      sessions,
      progress: {
        completed: completedCount,
        total: totalSessions,
        percentage: totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0,
      },
      latest_session: latestSession,
    },
  };
}

export async function createSession(env: Env, clinicId: number, data: TmsSessionInput) {
  const id = await repo.create(env, clinicId, data);
  return { success: true, data: { id } };
}

export async function completeSession(env: Env, sessionId: number) {
  const session = await repo.findById(env, sessionId);
  if (!session) return { success: false, error: 'Sesión no encontrada', status: 404 };

  if (session.status === 'completed') {
    return { success: false, error: 'La sesión ya está completada', status: 400 };
  }

  const updated = await repo.completeSession(env, sessionId);
  if (!updated) return { success: false, error: 'Error al actualizar sesión', status: 500 };

  const completedCount = await repo.getCompletedCount(env, session.profile_id);

  const profile = await env.DB.prepare(
    'SELECT id, protocol_id, status FROM tms_patient_profiles WHERE id = ?'
  ).bind(session.profile_id).first() as { id: number; protocol_id: number; status: string } | null;

  if (profile && profile.status === 'active' && profile.protocol_id) {
    const protocol = await env.DB.prepare(
      'SELECT total_sessions FROM tms_protocols WHERE id = ?'
    ).bind(profile.protocol_id).first() as { total_sessions: number } | null;

    if (protocol && completedCount >= protocol.total_sessions) {
      await env.DB.prepare(
        `UPDATE tms_patient_profiles SET status = 'completed', end_date = date('now') WHERE id = ?`
      ).bind(session.profile_id).run();
    }
  }

  const updatedSession = await repo.findById(env, sessionId);
  return { success: true, data: { session: updatedSession } };
}

export async function updateSessionStatus(env: Env, sessionId: number, status: TmsSessionStatus, notes?: string) {
  const session = await repo.findById(env, sessionId);
  if (!session) return { success: false, error: 'Sesión no encontrada', status: 404 };

  if (status === 'completed') {
    const completedAt = new Date().toISOString();
    await env.DB.prepare(
      `UPDATE tms_sessions SET status = ?, completed_at = ?, notes = ? WHERE id = ?`
    ).bind(status, completedAt, notes !== undefined ? notes : session.notes, sessionId).run();

    const completedCount = await repo.getCompletedCount(env, session.profile_id);

    const profile = await env.DB.prepare(
      'SELECT id, protocol_id, status FROM tms_patient_profiles WHERE id = ?'
    ).bind(session.profile_id).first() as { id: number; protocol_id: number; status: string } | null;

    if (profile && profile.status === 'active' && profile.protocol_id) {
      const protocol = await env.DB.prepare(
        'SELECT total_sessions FROM tms_protocols WHERE id = ?'
      ).bind(profile.protocol_id).first() as { total_sessions: number } | null;

      if (protocol && completedCount >= protocol.total_sessions) {
        await env.DB.prepare(
          `UPDATE tms_patient_profiles SET status = 'completed', end_date = date('now') WHERE id = ?`
        ).bind(session.profile_id).run();
      }
    }
  } else {
    const updated = await repo.updateStatus(env, sessionId, status, notes);
    if (!updated) return { success: false, error: 'Error al actualizar sesión', status: 500 };
  }

  const updatedSession = await repo.findById(env, sessionId);
  return { success: true, data: { session: updatedSession } };
}
