import type { SessionCompletionData, StartTreatmentInput, DischargeData } from './types';

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10;
}

export function validateSessionCompletion(input: unknown): { valid: boolean; errors: string[]; data?: SessionCompletionData } {
  const errors: string[] = [];
  const data = input as Partial<SessionCompletionData>;

  if (data.session_id === undefined || data.session_id === null) {
    errors.push('session_id is required');
  } else if (typeof data.session_id !== 'number') {
    errors.push('session_id must be a number');
  }

  if (data.mood_score === undefined || data.mood_score === null) {
    errors.push('mood_score is required');
  } else if (!isValidScore(data.mood_score)) {
    errors.push('mood_score must be an integer between 1 and 10');
  }

  if (data.anxiety_score !== undefined && data.anxiety_score !== null && !isValidScore(data.anxiety_score)) {
    errors.push('anxiety_score must be an integer between 1 and 10');
  }

  if (data.energy_score !== undefined && data.energy_score !== null && !isValidScore(data.energy_score)) {
    errors.push('energy_score must be an integer between 1 and 10');
  }

  if (data.sleep_score !== undefined && data.sleep_score !== null && !isValidScore(data.sleep_score)) {
    errors.push('sleep_score must be an integer between 1 and 10');
  }

  if (data.concentration_score !== undefined && data.concentration_score !== null && !isValidScore(data.concentration_score)) {
    errors.push('concentration_score must be an integer between 1 and 10');
  }

  if (data.side_effects !== undefined && Array.isArray(data.side_effects)) {
    for (let i = 0; i < data.side_effects.length; i++) {
      const se = data.side_effects[i];
      if (!se.type || typeof se.type !== 'string') {
        errors.push(`side_effects[${i}].type must be a non-empty string`);
      }
      if (!se.severity || typeof se.severity !== 'string') {
        errors.push(`side_effects[${i}].severity must be a non-empty string`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      session_id: data.session_id!,
      mood_score: data.mood_score!,
      anxiety_score: data.anxiety_score,
      energy_score: data.energy_score,
      sleep_score: data.sleep_score,
      concentration_score: data.concentration_score,
      side_effects: data.side_effects,
      notes: data.notes,
    },
  };
}

export function validateStartTreatment(input: unknown): { valid: boolean; errors: string[]; data?: StartTreatmentInput } {
  const errors: string[] = [];
  const data = input as Partial<StartTreatmentInput>;

  if (data.patient_id === undefined || typeof data.patient_id !== 'number' || data.patient_id <= 0) {
    errors.push('patient_id is required and must be a positive number');
  }
  if (data.protocol_id === undefined || typeof data.protocol_id !== 'number' || data.protocol_id <= 0) {
    errors.push('protocol_id is required and must be a positive number');
  }
  if (data.therapist_id === undefined || typeof data.therapist_id !== 'number' || data.therapist_id <= 0) {
    errors.push('therapist_id is required and must be a positive number');
  }
  if (data.motor_threshold_id === undefined || typeof data.motor_threshold_id !== 'number' || data.motor_threshold_id <= 0) {
    errors.push('motor_threshold_id is required and must be a positive number');
  }
  if (!data.assigned_diagnosis || typeof data.assigned_diagnosis !== 'string' || data.assigned_diagnosis.trim().length === 0) {
    errors.push('assigned_diagnosis is required');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: data as StartTreatmentInput,
  };
}

export function validateDischarge(input: unknown): { valid: boolean; errors: string[]; data?: DischargeData } {
  const errors: string[] = [];
  const data = input as Partial<DischargeData>;

  if (data.patient_id === undefined || typeof data.patient_id !== 'number' || data.patient_id <= 0) {
    errors.push('patient_id is required and must be a positive number');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: data as DischargeData,
  };
}
