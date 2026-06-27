export type JourneyStageName =
  | 'registration'
  | 'evaluation'
  | 'consent'
  | 'motor_threshold'
  | 'protocol_assignment'
  | 'sessions_scheduled'
  | 'treatment_active'
  | 'sessions_completed'
  | 'report_generated'
  | 'discharged';

export type JourneyStageStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface JourneyStage {
  stage: JourneyStageName;
  status: JourneyStageStatus;
  completed_at?: string;
  notes?: string;
}

export interface PatientJourney {
  patient_id: number;
  patient_name: string;
  current_stage: JourneyStageName;
  stages: JourneyStage[];
  progress_pct: number;
  next_action: string;
  alerts: string[];
}

export interface SessionCompletionData {
  session_id: number;
  mood_score: number;
  anxiety_score?: number;
  energy_score?: number;
  sleep_score?: number;
  concentration_score?: number;
  side_effects?: Array<{ type: string; severity: string; description?: string }>;
  notes?: string;
}

export interface JourneyMilestone {
  type: 'session_completed' | 'halfway_point' | 'near_completion' | 'discharge_ready' | 'alert';
  message: string;
  data?: unknown;
}

export interface StartTreatmentInput {
  patient_id: number;
  protocol_id: number;
  therapist_id: number;
  motor_threshold_id: number;
  assigned_diagnosis: string;
  baseline_bdi?: number;
  baseline_gad7?: number;
  baseline_phq9?: number;
}

export interface DischargeData {
  patient_id: number;
  final_notes?: string;
}
