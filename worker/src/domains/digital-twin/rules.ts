import type { PredictionRule, DigitalTwinInput, ClinicalScore } from './types';

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function avgClinicalScores(history: ClinicalScore[]): { mood: number; anxiety: number; energy: number; sleep: number; concentration: number } | null {
  if (history.length === 0) return null;
  return {
    mood: avg(history.map(h => h.mood)),
    anxiety: avg(history.map(h => h.anxiety)),
    energy: avg(history.map(h => h.energy)),
    sleep: avg(history.map(h => h.sleep)),
    concentration: avg(history.map(h => h.concentration)),
  };
}

function overallScore(c: { mood: number; anxiety: number; energy: number; sleep: number; concentration: number }): number {
  return +(((c.mood + (10 - c.anxiety) + c.energy + c.sleep + c.concentration) / 5).toFixed(1));
}

export const predictionRules: PredictionRule[] = [
  {
    id: 1,
    name: 'high_mt_good_baseline',
    priority: 5,
    condition: (input, history) => {
      return input.motor_threshold >= 50 && history.length <= 2;
    },
    predict: (input) => {
      const base = overallScore(input.clinical_scores);
      const predicted = Math.min(10, base + 2.5);
      return {
        predicted_mood: Math.min(10, input.clinical_scores.mood + 3),
        predicted_anxiety: Math.max(0, input.clinical_scores.anxiety - 2.5),
        predicted_energy: Math.min(10, input.clinical_scores.energy + 2),
        predicted_sleep: Math.min(10, input.clinical_scores.sleep + 2),
        predicted_concentration: Math.min(10, input.clinical_scores.concentration + 2),
        predicted_overall: +predicted.toFixed(1),
        confidence: 0.7,
        risk_score: 0.2,
        rule_applied: 'high_mt_good_baseline',
      };
    },
  },
  {
    id: 2,
    name: 'low_mt_severe_depression',
    priority: 4,
    condition: (input, history) => {
      return input.motor_threshold < 40 && (input.diagnosis.toLowerCase().includes('depression') || input.diagnosis.toLowerCase().includes('depresión'));
    },
    predict: (input) => {
      const base = overallScore(input.clinical_scores);
      const predicted = Math.min(10, base + 1.2);
      return {
        predicted_mood: Math.min(10, input.clinical_scores.mood + 1.5),
        predicted_anxiety: Math.max(0, input.clinical_scores.anxiety - 1),
        predicted_energy: Math.min(10, input.clinical_scores.energy + 1.2),
        predicted_sleep: Math.min(10, input.clinical_scores.sleep + 1.3),
        predicted_concentration: Math.min(10, input.clinical_scores.concentration + 1),
        predicted_overall: +predicted.toFixed(1),
        confidence: 0.55,
        risk_score: 0.35,
        rule_applied: 'low_mt_severe_depression',
      };
    },
  },
  {
    id: 3,
    name: 'declining_after_session5',
    priority: 6,
    condition: (input, history) => {
      if (history.length < 3 || input.session_number < 5) return false;
      const recent = history.slice(-3);
      const avgRecent = avg(recent.map(h => h.mood));
      const avgEarly = avg(history.slice(0, 3).map(h => h.mood));
      return avgRecent < avgEarly;
    },
    predict: (input) => {
      return {
        predicted_mood: input.clinical_scores.mood - 1,
        predicted_anxiety: input.clinical_scores.anxiety + 0.5,
        predicted_energy: input.clinical_scores.energy - 1.5,
        predicted_sleep: input.clinical_scores.sleep - 0.5,
        predicted_concentration: input.clinical_scores.concentration - 1,
        predicted_overall: +(overallScore(input.clinical_scores) - 1.2).toFixed(1),
        confidence: 0.65,
        risk_score: 0.5,
        rule_applied: 'declining_after_session5',
      };
    },
  },
  {
    id: 4,
    name: 'high_side_effects_risk',
    priority: 7,
    condition: (input, history) => {
      if (history.length === 0) return false;
      const latest = history[history.length - 1];
      return latest.anxiety > 7 || latest.mood < 2;
    },
    predict: (input) => {
      return {
        predicted_mood: input.clinical_scores.mood,
        predicted_anxiety: Math.min(10, input.clinical_scores.anxiety + 2),
        predicted_energy: input.clinical_scores.energy - 1,
        predicted_sleep: Math.min(10, input.clinical_scores.sleep + 1),
        predicted_concentration: input.clinical_scores.concentration - 0.5,
        predicted_overall: +(overallScore(input.clinical_scores) - 0.5).toFixed(1),
        confidence: 0.45,
        risk_score: 0.75,
        rule_applied: 'high_side_effects_risk',
      };
    },
  },
  {
    id: 5,
    name: 'no_improvement_after_10',
    priority: 8,
    condition: (input, history) => {
      if (history.length < 10 || input.session_number < 10) return false;
      const first5Avg = avg(history.slice(0, 5).map(h => h.mood));
      const last5Avg = avg(history.slice(-5).map(h => h.mood));
      return Math.abs(first5Avg - last5Avg) < 0.5;
    },
    predict: (input) => {
      return {
        predicted_mood: input.clinical_scores.mood + 0.3,
        predicted_anxiety: input.clinical_scores.anxiety - 0.2,
        predicted_energy: input.clinical_scores.energy + 0.2,
        predicted_sleep: input.clinical_scores.sleep + 0.2,
        predicted_concentration: input.clinical_scores.concentration + 0.2,
        predicted_overall: +(overallScore(input.clinical_scores) + 0.3).toFixed(1),
        confidence: 0.4,
        risk_score: 0.6,
        rule_applied: 'no_improvement_after_10',
      };
    },
  },
];
