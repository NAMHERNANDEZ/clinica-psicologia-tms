import type { ClinicalAlert, AlertSeverity } from '../models/alert';
import { patients, tmsSessions, tmsProfiles, adverseEffects } from '../../lib/api';
import type { TmsSession, TmsProfile, AdverseEffect } from '../../lib/api';

export class AlertEngine {

  async evaluatePatient(patientId: number): Promise<ClinicalAlert[]> {
    const alerts: ClinicalAlert[] = [];

    const patientRes = await patients.get(patientId);
    const patient = patientRes.data;

    const profilesRes = await tmsProfiles.listByPatient(patientId);
    const profiles = (profilesRes.data || []) as TmsProfile[];
    const activeProfiles = profiles.filter((p: TmsProfile) => p.status === 'active');

    for (const profile of activeProfiles) {
      const sessionsRes = await tmsSessions.listByProfile(profile.id);
      const sessions = (sessionsRes.data || []) as TmsSession[];

      const missedSessions = sessions.filter((s: TmsSession) => s.status === 'no_show');
      if (missedSessions.length >= 2) {
        alerts.push({
          id: `alert-missed-${patientId}-${profile.id}`,
          category: 'clinical',
          severity: 'warning',
          type: 'MULTIPLE_MISSED_SESSIONS',
          title: 'Múltiples sesiones perdidas',
          message: `${patient.name} ha perdido ${missedSessions.length} sesiones del protocolo ${profile.protocol_name || 'TMS'}.`,
          patient_id: patientId,
          patient_name: patient.name,
          action_required: true,
          action_label: 'Reprogramar',
          dismissed: false,
          created_at: new Date().toISOString(),
        });
      }

      const completedSessions = sessions.filter((s: TmsSession) => s.status === 'completed');
      const lastSession = completedSessions.sort((a: TmsSession, b: TmsSession) => (b.session_number || 0) - (a.session_number || 0))[0];

      if (lastSession) {
        const responsesRes = await import('../../lib/api').then(m =>
          m.clinicalResponse.listByPatient(patientId)
        );
        const responses = (responsesRes.data || []) as { tms_session_id: number; mood_score: number }[];
        const lastResponse = responses.find((r: { tms_session_id: number }) => r.tms_session_id === lastSession.id);

        if (lastResponse && lastResponse.mood_score < 3) {
          alerts.push({
            id: `alert-low-mood-${patientId}-${lastSession.id}`,
            category: 'safety',
            severity: 'critical',
            type: 'LOW_MOOD_AFTER_SESSION',
            title: 'Ánimo bajo post-sesión',
            message: `${patient.name} reportó puntuación de ánimo ${lastResponse.mood_score}/10 después de sesión #${lastSession.session_number}.`,
            patient_id: patientId,
            patient_name: patient.name,
            session_id: lastSession.id,
            action_required: true,
            action_label: 'Revisar',
            dismissed: false,
            created_at: new Date().toISOString(),
          });
        }
      }

      const totalSessions = profile.protocol_id ? sessions.length : 0;
      const expectedSessions = 30;
      if (totalSessions >= expectedSessions * 0.8 && completedSessions.length < expectedSessions * 0.5) {
        alerts.push({
          id: `alert-non-responder-${patientId}-${profile.id}`,
          category: 'clinical',
          severity: 'warning',
          type: 'NON_RESPONDER_DETECTED',
          title: 'Posible no respondedor',
          message: `${patient.name} ha completado ${completedSessions.length}/${expectedSessions} sesiones con respuesta insuficiente.`,
          patient_id: patientId,
          patient_name: patient.name,
          action_required: true,
          action_label: 'Ajustar protocolo',
          dismissed: false,
          created_at: new Date().toISOString(),
        });
      }
    }

    const effectsRes = await adverseEffects.listByPatient(patientId);
    const severeEffects = (effectsRes.data || []).filter((e: AdverseEffect) => e.severity === 'severe' && !e.resolved);

    if (severeEffects.length > 0) {
      alerts.push({
        id: `alert-severe-effect-${patientId}`,
        category: 'safety',
        severity: 'critical',
        type: 'UNRESOLVED_SEVERE_EFFECT',
        title: 'Efecto adverso severo sin resolver',
        message: `${patient.name} tiene ${severeEffects.length} efecto(s) adverso(s) severo(s) sin resolver.`,
        patient_id: patientId,
        patient_name: patient.name,
        action_required: true,
        action_label: 'Atender',
        dismissed: false,
        created_at: new Date().toISOString(),
      });
    }

    return alerts;
  }

  async evaluateAllPatients(): Promise<ClinicalAlert[]> {
    const patientsRes = await patients.list();
    const allPatients = patientsRes.data || [];

    const allAlerts: ClinicalAlert[] = [];
    for (const patient of allPatients) {
      const patientAlerts = await this.evaluatePatient(patient.id);
      allAlerts.push(...patientAlerts);
    }

    return allAlerts.sort((a: ClinicalAlert, b: ClinicalAlert) => {
      const severityOrder: Record<AlertSeverity, number> = { emergency: 0, critical: 1, warning: 2, info: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  getAlertStats(alerts: ClinicalAlert[]) {
    return {
      total: alerts.length,
      emergency: alerts.filter(a => a.severity === 'emergency').length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      action_required: alerts.filter(a => a.action_required).length,
      by_category: alerts.reduce((acc, a) => {
        acc[a.category] = (acc[a.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
