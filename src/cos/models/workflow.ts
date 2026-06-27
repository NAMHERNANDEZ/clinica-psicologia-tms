import type { ClinicalState } from './clinical-state';

export interface WorkflowStep {
  state: ClinicalState;
  label: string;
  description: string;
  required_data: string[];
  estimated_duration: string;
}

export const TREATMENT_WORKFLOW: WorkflowStep[] = [
  {
    state: 'REGISTERED',
    label: 'Registro',
    description: 'Paciente registrado en el sistema',
    required_data: ['name', 'phone', 'email'],
    estimated_duration: '5 min',
  },
  {
    state: 'EVALUATED',
    label: 'Evaluación',
    description: 'Evaluación clínica inicial completada',
    required_data: ['diagnosis', 'bdi_score', 'gad7_score', 'phq9_score'],
    estimated_duration: '45 min',
  },
  {
    state: 'MT_MEASURED',
    label: 'Umbral Motor',
    description: 'Medición del umbral motor realizada',
    required_data: ['mt_pct', 'coil_type', 'stimulation_site'],
    estimated_duration: '30 min',
  },
  {
    state: 'PROTOCOL_ASSIGNED',
    label: 'Protocolo TMS',
    description: 'Protocolo de estimulación magnética asignado',
    required_data: ['protocol_id', 'frequency_hz', 'intensity_pct_mt', 'total_sessions'],
    estimated_duration: '15 min',
  },
  {
    state: 'IN_TREATMENT',
    label: 'Tratamiento',
    description: 'En curso de tratamiento con sesiones activas',
    required_data: ['session_schedule', 'mood_scores'],
    estimated_duration: '4-6 semanas',
  },
  {
    state: 'UNDER_OBSERVATION',
    label: 'Observación',
    description: 'Período de seguimiento post-tratamiento',
    required_data: ['follow_up_scores'],
    estimated_duration: '2-4 semanas',
  },
  {
    state: 'DISCHARGED',
    label: 'Alta',
    description: 'Paciente dado de alta del tratamiento',
    required_data: ['final_assessment'],
    estimated_duration: '—',
  },
];

export function getWorkflowStep(state: ClinicalState): WorkflowStep | undefined {
  return TREATMENT_WORKFLOW.find(s => s.state === state);
}

export function getWorkflowProgress(currentState: ClinicalState): number {
  const idx = TREATMENT_WORKFLOW.findIndex(s => s.state === currentState);
  return idx >= 0 ? Math.round((idx / (TREATMENT_WORKFLOW.length - 1)) * 100) : 0;
}

export function getRemainingSteps(currentState: ClinicalState): WorkflowStep[] {
  const idx = TREATMENT_WORKFLOW.findIndex(s => s.state === currentState);
  return idx >= 0 ? TREATMENT_WORKFLOW.slice(idx + 1) : TREATMENT_WORKFLOW;
}
