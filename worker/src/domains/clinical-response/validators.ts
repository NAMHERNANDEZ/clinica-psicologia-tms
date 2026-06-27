export interface ClinicalResponseInput {
  tms_session_id: number;
  mood_score: number;
  energy_score?: number;
  anxiety_score?: number;
  sleep_score?: number;
  concentration_score?: number;
  notes?: string;
}

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10;
}

export function validateClinicalResponseInput(input: unknown): { valid: boolean; errors: string[]; data?: ClinicalResponseInput } {
  const errors: string[] = [];
  const data = input as Partial<ClinicalResponseInput>;

  if (data.tms_session_id === undefined || data.tms_session_id === null) {
    errors.push('tms_session_id is required');
  } else if (typeof data.tms_session_id !== 'number') {
    errors.push('tms_session_id must be a number');
  }

  if (data.mood_score === undefined || data.mood_score === null) {
    errors.push('mood_score is required');
  } else if (!isValidScore(data.mood_score)) {
    errors.push('mood_score must be an integer between 1 and 10');
  }

  if (data.energy_score !== undefined && data.energy_score !== null && !isValidScore(data.energy_score)) {
    errors.push('energy_score must be an integer between 1 and 10');
  }

  if (data.anxiety_score !== undefined && data.anxiety_score !== null && !isValidScore(data.anxiety_score)) {
    errors.push('anxiety_score must be an integer between 1 and 10');
  }

  if (data.sleep_score !== undefined && data.sleep_score !== null && !isValidScore(data.sleep_score)) {
    errors.push('sleep_score must be an integer between 1 and 10');
  }

  if (data.concentration_score !== undefined && data.concentration_score !== null && !isValidScore(data.concentration_score)) {
    errors.push('concentration_score must be an integer between 1 and 10');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      tms_session_id: data.tms_session_id!,
      mood_score: data.mood_score!,
      energy_score: data.energy_score,
      anxiety_score: data.anxiety_score,
      sleep_score: data.sleep_score,
      concentration_score: data.concentration_score,
      notes: data.notes,
    },
  };
}