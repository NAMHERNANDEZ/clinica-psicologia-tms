export interface DigitalTwinInput {
  patient_id: number;
  diagnosis: string;
  motor_threshold: number;
  clinical_scores: { mood: number; anxiety: number; energy: number; sleep: number; concentration: number };
  session_number: number;
  protocol: { name: string; target_area: string; frequency_hz: number; intensity_pct_mt: number; total_sessions: number };
}

export interface DigitalTwinPrediction {
  predicted_mood: number;
  predicted_anxiety: number;
  predicted_energy: number;
  predicted_sleep: number;
  predicted_concentration: number;
  predicted_overall: number;
  confidence: number;
  risk_score: number;
  rule_applied: string;
}

export interface PredictionRule {
  id: number;
  name: string;
  condition: (input: DigitalTwinInput, history: ClinicalScore[]) => boolean;
  predict: (input: DigitalTwinInput, history: ClinicalScore[]) => DigitalTwinPrediction;
  priority: number;
}

export interface ClinicalScore {
  session_number: number;
  mood: number;
  anxiety: number;
  energy: number;
  sleep: number;
  concentration: number;
  overall: number;
}
