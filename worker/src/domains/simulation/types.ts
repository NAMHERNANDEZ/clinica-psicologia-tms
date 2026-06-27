export interface ProtocolSimulation {
  protocol: {
    id: number;
    name: string;
    target_area: string;
    frequency_hz: number;
    intensity_pct_mt: number;
    total_sessions: number;
    stimulation_type: string;
  };
  predicted_curve: Array<{
    session: number;
    mood: number;
    anxiety: number;
    energy: number;
    overall: number;
  }>;
  estimated_duration_weeks: number;
  estimated_total_pulses: number;
  risk_assessment: 'low' | 'moderate' | 'high';
  confidence: number;
}

export interface ComparisonResult {
  protocol_a: ProtocolSimulation;
  protocol_b: ProtocolSimulation;
  recommendation: string;
  difference_pct: number;
}

export interface SimulationBaselineScores {
  mood: number;
  anxiety: number;
  energy: number;
  overall: number;
}
