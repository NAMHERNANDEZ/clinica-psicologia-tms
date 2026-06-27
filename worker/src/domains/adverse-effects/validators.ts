const VALID_SEVERITIES = ['mild', 'moderate', 'severe'] as const;
type Severity = (typeof VALID_SEVERITIES)[number];

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateRequired(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
}

function validateSeverity(severity: unknown): string | null {
  if (severity === undefined || severity === null) return null; // optional
  if (!VALID_SEVERITIES.includes(severity as Severity)) {
    return `severity must be one of: ${VALID_SEVERITIES.join(', ')}`;
  }
  return null;
}

function validatePositiveInteger(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) return null; // optional
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return `${fieldName} must be a positive integer`;
  }
  return null;
}

export function validateCreateEffect(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const patientIdError = validateRequired(data.patient_id, 'patient_id');
  if (patientIdError) errors.push(patientIdError);
  else {
    const patientIdIntError = validatePositiveInteger(data.patient_id, 'patient_id');
    if (patientIdIntError) errors.push(patientIdIntError);
  }

  const tmsSessionIdError = validateRequired(data.tms_session_id, 'tms_session_id');
  if (tmsSessionIdError) errors.push(tmsSessionIdError);
  else {
    const tmsSessionIdIntError = validatePositiveInteger(data.tms_session_id, 'tms_session_id');
    if (tmsSessionIdIntError) errors.push(tmsSessionIdIntError);
  }

  const effectTypeError = validateRequired(data.effect_type, 'effect_type');
  if (effectTypeError) errors.push(effectTypeError);

  const severityError = validateSeverity(data.severity);
  if (severityError) errors.push(severityError);

  const durationMinError = validatePositiveInteger(data.duration_min, 'duration_min');
  if (durationMinError) errors.push(durationMinError);

  return { valid: errors.length === 0, errors };
}

export function validateResolveEffect(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const actionTakenError = validateRequired(data.action_taken, 'action_taken');
  if (actionTakenError) errors.push(actionTakenError);
  return { valid: errors.length === 0, errors };
}