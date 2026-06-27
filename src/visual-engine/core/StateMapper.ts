export type PatientState =
  | 'REGISTERED'
  | 'EVALUATED'
  | 'MT_MEASURED'
  | 'PROTOCOL_ASSIGNED'
  | 'IN_TREATMENT'
  | 'UNDER_OBSERVATION'
  | 'DISCHARGED';

export type BrainRegionId =
  | 'prefrontal_left'
  | 'prefrontal_right'
  | 'dorsal_acc'
  | 'motor_cortex_left'
  | 'motor_cortex_right'
  | 'broca'
  | 'wernicke'
  | 'insula_left'
  | 'insula_right';

export type BrainActivityLevel = 'idle' | 'low' | 'active' | 'stimulated' | 'high_response' | 'risk';

export interface BrainVisualState {
  region: BrainRegionId;
  activity: BrainActivityLevel;
  intensity: number;
  color: string;
  pulseActive: boolean;
}

export interface TimelineVisualState {
  step: PatientState;
  completed: boolean;
  active: boolean;
  progress: number;
}

export interface TMSVisualState {
  intensity_pct: number;
  frequency_hz: number;
  pulses_total: number;
  pulses_delivered: number;
  coil_position: string;
  is_active: boolean;
}

export interface TwinVisualState {
  predicted_curve: Array<{ session: number; overall: number }>;
  actual_curve: Array<{ session: number; overall: number }>;
  confidence: number;
  risk_level: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface HospitalVisualState {
  patients_waiting: number;
  patients_in_session: number;
  beds_occupied: number;
  beds_total: number;
  therapists_active: number;
  sessions_today: number;
  critical_alerts: number;
}

export interface ClinicalVisualSnapshot {
  patient_id: number;
  patient_name: string;
  state: PatientState;
  brain: BrainVisualState[];
  timeline: TimelineVisualState[];
  tms: TMSVisualState | null;
  twin: TwinVisualState | null;
  hospital: HospitalVisualState | null;
}

export const STATE_COLORS: Record<PatientState, string> = {
  REGISTERED: '#94a3b8',
  EVALUATED: '#60a5fa',
  MT_MEASURED: '#a78bfa',
  PROTOCOL_ASSIGNED: '#f472b6',
  IN_TREATMENT: '#14b8a6',
  UNDER_OBSERVATION: '#f59e0b',
  DISCHARGED: '#22c55e',
};

export const BRAIN_ACTIVITY_COLORS: Record<BrainActivityLevel, string> = {
  idle: '#e2e8f0',
  low: '#93c5fd',
  active: '#3b82f6',
  stimulated: '#eab308',
  high_response: '#22c55e',
  risk: '#ef4444',
};

export const BRAIN_REGION_LABELS: Record<BrainRegionId, string> = {
  prefrontal_left: 'Corteza Prefrontal Izq.',
  prefrontal_right: 'Corteza Prefrontal Der.',
  dorsal_acc: 'Corteza Cingulada Dorsal',
  motor_cortex_left: 'Corteza Motora Izq.',
  motor_cortex_right: 'Corteza Motora Der.',
  broca: 'Área de Broca',
  wernicke: 'Área de Wernicke',
  insula_left: 'Ínsula Izquierda',
  insula_right: 'Ínsula Derecha',
};
