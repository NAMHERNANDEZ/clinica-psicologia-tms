import type { ClinicalState } from './clinical-state';

export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'delayed';

export interface SessionContext {
  session_id: number;
  patient_id: number;
  patient_name: string;
  profile_id: number;
  protocol_name: string;
  session_number: number;
  total_sessions: number;
  motor_threshold_pct: number;
  intensity_pct_mt: number;
  frequency_hz: number;
  pulses_delivered: number;
  target_area: string;
  scheduled_date: string;
  scheduled_time: string;
  status: SessionStatus;
  clinical_state: ClinicalState;
  mood_score?: number;
  anxiety_score?: number;
  energy_score?: number;
  side_effects?: SideEffect[];
  notes?: string;
}

export interface SideEffect {
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  description?: string;
  resolved: boolean;
}

export interface SessionResult {
  session_id: number;
  completed: boolean;
  mood_score: number;
  anxiety_score?: number;
  energy_score?: number;
  side_effects: SideEffect[];
  notes?: string;
  next_session_date?: string;
  alerts: string[];
}

export interface SessionTimeline {
  session_number: number;
  date: string;
  status: SessionStatus;
  mood_score?: number;
  overall_response?: number;
  has_side_effects: boolean;
}
