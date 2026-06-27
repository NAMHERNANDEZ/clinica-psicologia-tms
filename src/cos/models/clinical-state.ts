export type ClinicalState =
  | 'REGISTERED'
  | 'EVALUATED'
  | 'MT_MEASURED'
  | 'PROTOCOL_ASSIGNED'
  | 'IN_TREATMENT'
  | 'UNDER_OBSERVATION'
  | 'DISCHARGED';

export type ClinicalAction =
  | 'EVALUATION_REQUIRED'
  | 'MT_MEASUREMENT_REQUIRED'
  | 'ASSIGN_TMS_PROTOCOL'
  | 'SCHEDULE_SESSIONS'
  | 'CONTINUE_SESSIONS'
  | 'FOLLOW_UP'
  | 'CLOSE_CASE'
  | 'NO_ACTION';

export interface ClinicalStateRecord {
  patient_id: number;
  clinical_state: ClinicalState;
  updated_at: string;
  updated_by?: number;
  metadata?: Record<string, unknown>;
}

export interface StateTransition {
  from: ClinicalState;
  to: ClinicalState;
  requires: string[];
  description: string;
}

export const STATE_TRANSITIONS: Record<ClinicalState, ClinicalState[]> = {
  REGISTERED: ['EVALUATED'],
  EVALUATED: ['MT_MEASURED'],
  MT_MEASURED: ['PROTOCOL_ASSIGNED'],
  PROTOCOL_ASSIGNED: ['IN_TREATMENT'],
  IN_TREATMENT: ['UNDER_OBSERVATION'],
  UNDER_OBSERVATION: ['DISCHARGED'],
  DISCHARGED: [],
};

export const STATE_DESCRIPTIONS: Record<ClinicalState, string> = {
  REGISTERED: 'Paciente registrado en el sistema',
  EVALUATED: 'Evaluación clínica completada',
  MT_MEASURED: 'Umbral motor medido',
  PROTOCOL_ASSIGNED: 'Protocolo TMS asignado',
  IN_TREATMENT: 'En tratamiento activo',
  UNDER_OBSERVATION: 'En período de observación',
  DISCHARGED: 'Dado de alta',
};

export const ACTION_DESCRIPTIONS: Record<ClinicalAction, string> = {
  EVALUATION_REQUIRED: 'Se requiere evaluación clínica',
  MT_MEASUREMENT_REQUIRED: 'Se requiere medición de umbral motor',
  ASSIGN_TMS_PROTOCOL: 'Asignar protocolo TMS',
  SCHEDULE_SESSIONS: 'Programar sesiones de tratamiento',
  CONTINUE_SESSIONS: 'Continuar con sesiones programadas',
  FOLLOW_UP: 'Seguimiento post-tratamiento',
  CLOSE_CASE: 'Cerrar caso clínico',
  NO_ACTION: 'Sin acción requerida',
};

export function canTransition(from: ClinicalState, to: ClinicalState): boolean {
  return STATE_TRANSITIONS[from].includes(to);
}

export function getValidTransitions(state: ClinicalState): ClinicalState[] {
  return STATE_TRANSITIONS[state];
}

export function getNextAction(state: ClinicalState): ClinicalAction {
  const map: Record<ClinicalState, ClinicalAction> = {
    REGISTERED: 'EVALUATION_REQUIRED',
    EVALUATED: 'MT_MEASUREMENT_REQUIRED',
    MT_MEASURED: 'ASSIGN_TMS_PROTOCOL',
    PROTOCOL_ASSIGNED: 'SCHEDULE_SESSIONS',
    IN_TREATMENT: 'CONTINUE_SESSIONS',
    UNDER_OBSERVATION: 'FOLLOW_UP',
    DISCHARGED: 'NO_ACTION',
  };
  return map[state];
}
