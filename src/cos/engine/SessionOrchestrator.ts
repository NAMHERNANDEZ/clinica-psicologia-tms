import { tmsSessions, tmsProfiles, clinicalResponse } from '../../lib/api';
import type { TmsSession, TmsProfile, ClinicalResponse } from '../../lib/api';
import type { SessionContext, SessionResult, SessionTimeline, SideEffect } from '../models/session';
import { ClinicalFlowEngine } from './ClinicalFlowEngine';

export class SessionOrchestrator {
  private flowEngine: ClinicalFlowEngine;

  constructor() {
    this.flowEngine = new ClinicalFlowEngine();
  }

  async getSessionContext(sessionId: number): Promise<SessionContext | null> {
    const sessionsRes = await tmsSessions.listByProfile(0);
    const allSessions = sessionsRes.data || [];
    const session = allSessions.find((s: TmsSession) => s.id === sessionId);

    if (!session) return null;

    const [profileRes, _patientRes, state] = await Promise.all([
      tmsProfiles.get(session.profile_id),
      import('../../lib/api').then(m => m.patients.get(0)),
      this.flowEngine.determineState(0),
    ]);

    const profile = profileRes.data;

    return {
      session_id: session.id,
      patient_id: profile.patient_id,
      patient_name: '',
      profile_id: session.profile_id,
      protocol_name: profile.protocol_name || `Protocolo #${profile.protocol_id}`,
      session_number: session.session_number,
      total_sessions: 0,
      motor_threshold_pct: session.motor_threshold_pct,
      intensity_pct_mt: session.intensity_pct_mt,
      frequency_hz: session.frequency_hz,
      pulses_delivered: session.pulses_delivered,
      target_area: session.target_area,
      scheduled_date: '',
      scheduled_time: '',
      status: session.status as SessionContext['status'],
      clinical_state: state,
      notes: session.notes || undefined,
    };
  }

  async completeSession(_sessionId: number, result: SessionResult): Promise<{ success: boolean; alerts: string[] }> {
    const alerts: string[] = [];

    if (result.mood_score < 3) {
      alerts.push('LOW_MOOD_SCORE: Puntuación de ánimo significativamente baja');
    }

    if (result.side_effects.some((se: SideEffect) => se.severity === 'severe')) {
      alerts.push('SEVERE_SIDE_EFFECT: Efecto adverso severo reportado');
    }

    if (result.anxiety_score != null && result.anxiety_score > 8) {
      alerts.push('HIGH_ANXIETY: Nivel de ansiedad elevado durante sesión');
    }

    return { success: true, alerts };
  }

  async getSessionTimeline(profileId: number): Promise<SessionTimeline[]> {
    const sessionsRes = await tmsSessions.listByProfile(profileId);
    const sessions = sessionsRes.data || [];

    const responsesRes = await clinicalResponse.listByPatient(0);
    const responses = responsesRes.data || [];

    return sessions.map((s: TmsSession) => {
      const response = responses.find((r: ClinicalResponse) => r.tms_session_id === s.id);
      return {
        session_number: s.session_number,
        date: s.completed_at || '',
        status: s.status as SessionTimeline['status'],
        mood_score: response?.mood_score,
        overall_response: response?.overall_response,
        has_side_effects: false,
      };
    });
  }

  async getActiveSessionsCount(): Promise<number> {
    const profilesRes = await tmsProfiles.list();
    const activeProfiles = (profilesRes.data || []).filter((p: TmsProfile) => p.status === 'active');

    let count = 0;
    for (const profile of activeProfiles) {
      const sessionsRes = await tmsSessions.listByProfile(profile.id);
      const activeSessions = (sessionsRes.data || []).filter((s: TmsSession) => s.status === 'in_progress' || s.status === 'scheduled');
      count += activeSessions.length;
    }

    return count;
  }

  async getSessionsSummary(profileId: number) {
    const sessionsRes = await tmsSessions.listByProfile(profileId);
    const sessions = sessionsRes.data || [];

    return {
      total: sessions.length,
      completed: sessions.filter((s: TmsSession) => s.status === 'completed').length,
      scheduled: sessions.filter((s: TmsSession) => s.status === 'scheduled').length,
      in_progress: sessions.filter((s: TmsSession) => s.status === 'in_progress').length,
      cancelled: sessions.filter((s: TmsSession) => s.status === 'cancelled').length,
      no_show: sessions.filter((s: TmsSession) => s.status === 'no_show').length,
    };
  }
}
