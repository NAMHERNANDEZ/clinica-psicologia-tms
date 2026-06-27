export interface TreatmentSummaryReport {
  patient: { id: number; name: string; email: string };
  therapist: { id: number; name: string };
  diagnosis: string;
  protocol: { name: string; target_area: string; total_sessions: number; stimulation_type: string };
  motor_threshold: { current: number; history: Array<{ value: number; date: string }> };
  progress: { completed: number; total: number; percentage: number };
  clinical_scores: { baseline: ClinicalScores; latest: ClinicalScores; curve: Array<{ session: number; scores: ClinicalScores }> };
  twin_predictions: Array<{ session: number; predicted: number; actual: number; confidence: number }>;
  adverse_effects: Array<{ type: string; severity: string; count: number; resolved: number }>;
  timeline: Array<{ date: string; event: string; details: string }>;
}

export interface ClinicalScores {
  mood: number;
  anxiety: number;
  energy: number;
  sleep: number;
  concentration: number;
  overall: number;
}

export interface ExportOptions {
  format: 'pdf' | 'csv';
  sections: string[];
  date_range?: { from: string; to: string };
}
