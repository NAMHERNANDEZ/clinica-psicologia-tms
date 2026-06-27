import { patients, tmsProfiles, tmsSessions, adverseEffects } from '../../lib/api';
import type { Patient, TmsProfile, TmsSession } from '../../lib/api';
import type { ClinicalTask, TaskType, TaskPriority } from '../models/task';
import { ClinicalFlowEngine } from './ClinicalFlowEngine';

export class TaskEngine {
  private flowEngine: ClinicalFlowEngine;

  constructor() {
    this.flowEngine = new ClinicalFlowEngine();
  }

  async generateTasks(): Promise<ClinicalTask[]> {
    const tasks: ClinicalTask[] = [];

    const patientsRes = await patients.list();
    const allPatients = patientsRes.data || [];

    for (const patient of allPatients) {
      const patientTasks = await this.generatePatientTasks(patient);
      tasks.push(...patientTasks);
    }

    const urgentTasks = tasks.filter(t => t.priority === 'urgent');
    const highTasks = tasks.filter(t => t.priority === 'high');
    const mediumTasks = tasks.filter(t => t.priority === 'medium');
    const lowTasks = tasks.filter(t => t.priority === 'low');

    return [...urgentTasks, ...highTasks, ...mediumTasks, ...lowTasks];
  }

  private async generatePatientTasks(patient: Patient): Promise<ClinicalTask[]> {
    const tasks: ClinicalTask[] = [];
    const state = await this.flowEngine.determineState(patient.id);

    if (state === 'REGISTERED') {
      tasks.push(this.createTask('EVALUATION_DUE', patient, 'high', 'Evaluación clínica pendiente', 'El paciente necesita una evaluación inicial para determinar elegibilidad para TMS.'));
    }

    if (state === 'EVALUATED') {
      tasks.push(this.createTask('MT_MEASUREMENT_DUE', patient, 'high', 'Medición de umbral motor pendiente', 'Se debe medir el umbral motor antes de asignar protocolo.'));
    }

    if (state === 'MT_MEASURED') {
      tasks.push(this.createTask('PROTOCOL_ASSIGNMENT', patient, 'medium', 'Asignar protocolo TMS', 'El paciente tiene umbral motor medido y necesita un protocolo.'));
    }

    const profilesRes = await tmsProfiles.listByPatient(patient.id);
    const activeProfiles = (profilesRes.data || []).filter((p: TmsProfile) => p.status === 'active');

    for (const profile of activeProfiles) {
      const sessionsRes = await tmsSessions.listByProfile(profile.id);
      const sessions = sessionsRes.data || [];

      const lastSession = sessions
        .filter((s: TmsSession) => s.status === 'completed')
        .sort((a: TmsSession, b: TmsSession) => (b.session_number || 0) - (a.session_number || 0))[0];

      if (lastSession) {
        const responsesRes = await import('../../lib/api').then(m =>
          m.clinicalResponse.listByPatient(patient.id)
        );
        const responses = responsesRes.data || [];
        const lastResponse = responses.find((r: { tms_session_id: number }) => r.tms_session_id === lastSession.id);

        if (lastResponse && lastResponse.mood_score < 3) {
          tasks.push(this.createTask('RESPONSE_REVIEW', patient, 'urgent', 'Revisión de respuesta clínica', `Puntuación de ánimo baja (${lastResponse.mood_score}/10) después de sesión #${lastSession.session_number}.`));
        }
      }

      const missedSessions = sessions.filter((s: TmsSession) => s.status === 'no_show');
      if (missedSessions.length > 0) {
        tasks.push(this.createTask('SESSION_MISSED', patient, 'high', 'Sesión perdida', `${missedSessions.length} sesión(es) perdida(s). Se requiere reprogramación.`));
      }
    }

    const effectsRes = await adverseEffects.listByPatient(patient.id);
    const unresolvedEffects = (effectsRes.data || []).filter((e: AdverseEffect) => !e.resolved);
    if (unresolvedEffects.length > 0) {
      const severe = unresolvedEffects.filter((e: AdverseEffect) => e.severity === 'severe');
      tasks.push(this.createTask('ADVERSE_EFFECT_REPORT', patient, severe.length > 0 ? 'urgent' : 'medium', 'Efectos adversos pendientes', `${unresolvedEffects.length} efecto(s) adverso(s) sin resolver.`));
    }

    if (state === 'UNDER_OBSERVATION') {
      tasks.push(this.createTask('FOLLOW_UP_DUE', patient, 'medium', 'Seguimiento post-tratamiento', 'Paciente en período de observación. Requiere seguimiento.'));
    }

    return tasks;
  }

  private createTask(type: TaskType, patient: Patient, priority: TaskPriority, title: string, description: string): ClinicalTask {
    return {
      id: `task-${type}-${patient.id}-${Date.now()}`,
      type,
      patient_id: patient.id,
      patient_name: patient.name,
      title,
      description,
      priority,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
  }

  async getTaskStats() {
    const tasks = await this.generateTasks();
    return {
      total: tasks.length,
      urgent: tasks.filter(t => t.priority === 'urgent').length,
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
      by_type: tasks.reduce((acc, t) => {
        acc[t.type] = (acc[t.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

type AdverseEffect = {
  id: number;
  severity: string;
  resolved: number;
};
