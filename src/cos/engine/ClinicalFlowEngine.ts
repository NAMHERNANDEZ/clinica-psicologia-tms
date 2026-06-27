import { patients, tmsProfiles, motorThresholds, treatments } from '../../lib/api';
import { PatientStateMachine, type PatientClinicalProfile } from './PatientStateMachine';
import type { ClinicalState, ClinicalAction } from '../models/clinical-state';

export interface NextActionResult {
  patient_id: number;
  patient_name: string;
  current_state: ClinicalState;
  next_action: ClinicalAction;
  action_description: string;
  workflow_progress: number;
  can_proceed: boolean;
  blocking_reasons: string[];
  suggested下一步: string;
}

export class ClinicalFlowEngine {
  async getNextAction(patientId: number): Promise<NextActionResult> {
    const patientRes = await patients.get(patientId);
    const patient = patientRes.data;

    const state = await this.determineState(patientId);
    const machine = new PatientStateMachine(patientId, state);
    const profile = machine.getProfile();
    const nextAction = machine.getNextAction();

    const blockingReasons = await this.getBlockingReasons(patientId, state);

    return {
      patient_id: patientId,
      patient_name: patient.name,
      current_state: state,
      next_action: nextAction,
      action_description: this.getActionDescription(nextAction),
      workflow_progress: profile.workflow_progress,
      can_proceed: blockingReasons.length === 0,
      blocking_reasons: blockingReasons,
      suggested下一步: this.getSuggestedStep(nextAction),
    };
  }

  async determineState(patientId: number): Promise<ClinicalState> {
    const [profilesRes, thresholdsRes, treatmentsRes] = await Promise.allSettled([
      tmsProfiles.listByPatient(patientId),
      motorThresholds.listByPatient(patientId),
      treatments.list(),
    ]);

    const profiles = profilesRes.status === 'fulfilled' ? (profilesRes.value.data || []) : [];
    const thresholds = thresholdsRes.status === 'fulfilled' ? (thresholdsRes.value.data || []) : [];
    const allTreatments = treatmentsRes.status === 'fulfilled' ? (treatmentsRes.value.data || []) : [];
    const patientTreatments = allTreatments.filter((t: { patient_id: number }) => t.patient_id === patientId);

    if (profiles.some((p: { status: string }) => p.status === 'active')) {
      return 'IN_TREATMENT';
    }
    if (profiles.some((p: { status: string }) => p.status === 'completed')) {
      return 'UNDER_OBSERVATION';
    }
    if (profiles.some((p: { status: string }) => p.status === 'evaluation')) {
      return 'PROTOCOL_ASSIGNED';
    }
    if (thresholds.length > 0) {
      return 'MT_MEASURED';
    }
    if (patientTreatments.length > 0) {
      return 'EVALUATED';
    }
    return 'REGISTERED';
  }

  async getPatientProfile(patientId: number): Promise<PatientClinicalProfile> {
    const state = await this.determineState(patientId);
    const machine = new PatientStateMachine(patientId, state);
    const profile = machine.getProfile();

    const patientRes = await patients.get(patientId);
    profile.patient_name = patientRes.data.name;

    return profile;
  }

  async getAllPatientStates(): Promise<PatientClinicalProfile[]> {
    const patientsRes = await patients.list();
    const allPatients = patientsRes.data || [];

    const profiles = await Promise.all(
      allPatients.map((p: { id: number }) => this.getPatientProfile(p.id))
    );

    return profiles;
  }

  private async getBlockingReasons(patientId: number, state: ClinicalState): Promise<string[]> {
    const reasons: string[] = [];

    switch (state) {
      case 'REGISTERED': {
        const patientRes = await patients.get(patientId);
        const p = patientRes.data;
        if (!p.phone) reasons.push('Falta número de teléfono');
        break;
      }
      case 'EVALUATED': {
        const thresholdsRes = await motorThresholds.listByPatient(patientId);
        const thresholds = thresholdsRes.data || [];
        if (thresholds.length === 0) reasons.push('No se ha medido umbral motor');
        break;
      }
      case 'MT_MEASURED': {
        const profilesRes = await tmsProfiles.listByPatient(patientId);
        const profiles = profilesRes.data || [];
        if (profiles.length === 0) reasons.push('No se ha asignado protocolo TMS');
        break;
      }
      case 'PROTOCOL_ASSIGNED': {
        const profilesRes = await tmsProfiles.listByPatient(patientId);
        const active = (profilesRes.data || []).filter((p: { status: string }) => p.status === 'evaluation');
        if (active.length === 0) reasons.push('No hay perfiles pendientes de activación');
        break;
      }
    }

    return reasons;
  }

  private getActionDescription(action: ClinicalAction): string {
    const descriptions: Record<ClinicalAction, string> = {
      EVALUATION_REQUIRED: 'El paciente necesita una evaluación clínica inicial para determinar elegibilidad para TMS.',
      MT_MEASUREMENT_REQUIRED: 'Se debe medir el umbral motor para determinar la intensidad de estimulación.',
      ASSIGN_TMS_PROTOCOL: 'Seleccionar y asignar el protocolo TMS más adecuado según la indicación.',
      SCHEDULE_SESSIONS: 'Programar las sesiones de tratamiento en el calendario.',
      CONTINUE_SESSIONS: 'El paciente está en tratamiento activo. Continuar con las sesiones programadas.',
      FOLLOW_UP: 'Realizar seguimiento post-tratamiento para evaluar resultados a largo plazo.',
      CLOSE_CASE: 'Revisar resultados finales y dar de alta al paciente.',
      NO_ACTION: 'El paciente ha completado todo el proceso.',
    };
    return descriptions[action];
  }

  private getSuggestedStep(action: ClinicalAction): string {
    const steps: Record<ClinicalAction, string> = {
      EVALUATION_REQUIRED: 'Ir a la sección de Evaluación y completar la valoración inicial.',
      MT_MEASUREMENT_REQUIRED: 'Registrar la medición del umbral motor en el perfil del paciente.',
      ASSIGN_TMS_PROTOCOL: 'Ir al Módulo TMS y asignar un protocolo al paciente.',
      SCHEDULE_SESSIONS: 'Ir a la Agenda y programar las sesiones de tratamiento.',
      CONTINUE_SESSIONS: 'Verificar la próxima sesión en la Agenda y continuar el tratamiento.',
      FOLLOW_UP: 'Programar una cita de seguimiento en 2-4 semanas.',
      CLOSE_CASE: 'Completar el reporte final y marcar como dado de alta.',
      NO_ACTION: 'No se requiere acción adicional.',
    };
    return steps[action];
  }
}
