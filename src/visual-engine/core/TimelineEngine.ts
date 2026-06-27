import type { TimelineVisualState, PatientState } from './StateMapper';

const WORKFLOW_STEPS: PatientState[] = [
  'REGISTERED',
  'EVALUATED',
  'MT_MEASURED',
  'PROTOCOL_ASSIGNED',
  'IN_TREATMENT',
  'UNDER_OBSERVATION',
  'DISCHARGED',
];

const STEP_LABELS: Record<PatientState, string> = {
  REGISTERED: 'Registro',
  EVALUATED: 'Evaluación',
  MT_MEASURED: 'Umbral Motor',
  PROTOCOL_ASSIGNED: 'Protocolo TMS',
  IN_TREATMENT: 'Tratamiento',
  UNDER_OBSERVATION: 'Observación',
  DISCHARGED: 'Alta',
};

const STEP_ICONS: Record<PatientState, string> = {
  REGISTERED: '📋',
  EVALUATED: '🩺',
  MT_MEASURED: '⚡',
  PROTOCOL_ASSIGNED: '🧬',
  IN_TREATMENT: '💊',
  UNDER_OBSERVATION: '👁️',
  DISCHARGED: '✅',
};

export function mapStateToTimeline(state: PatientState): TimelineVisualState[] {
  const currentIdx = WORKFLOW_STEPS.indexOf(state);

  return WORKFLOW_STEPS.map((step, idx) => ({
    step,
    completed: idx < currentIdx,
    active: idx === currentIdx,
    progress: idx < currentIdx ? 100 : idx === currentIdx ? 50 : 0,
  }));
}

export function getStepLabel(state: PatientState): string {
  return STEP_LABELS[state];
}

export function getStepIcon(state: PatientState): string {
  return STEP_ICONS[state];
}

export function getTimelineProgress(state: PatientState): number {
  const idx = WORKFLOW_STEPS.indexOf(state);
  return Math.round((idx / (WORKFLOW_STEPS.length - 1)) * 100);
}
