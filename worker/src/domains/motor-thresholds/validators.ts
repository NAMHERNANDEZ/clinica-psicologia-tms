const VALID_METHODS = ['relative', 'active', 'resting'] as const;
type Method = (typeof VALID_METHODS)[number];

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

function validateMethod(method: unknown): string | null {
  if (method === undefined || method === null) return null;
  if (!VALID_METHODS.includes(method as Method)) {
    return `method must be one of: ${VALID_METHODS.join(', ')}`;
  }
  return null;
}

function validatePositiveNumber(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  if (isNaN(num) || num <= 0) {
    return `${fieldName} must be a positive number`;
  }
  return null;
}

function validateMtPct(value: unknown): string | null {
  if (value === undefined || value === null) return 'mt_pct is required';
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > 100) {
    return 'mt_pct must be between 0 and 100';
  }
  return null;
}

export function validateCreateMeasurement(data: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  const patientIdError = validateRequired(data.patient_id, 'patient_id');
  if (patientIdError) errors.push(patientIdError);
  else {
    const patientIdIntError = validatePositiveNumber(data.patient_id, 'patient_id');
    if (patientIdIntError) errors.push(patientIdIntError);
  }

  const mtPctError = validateMtPct(data.mt_pct);
  if (mtPctError) errors.push(mtPctError);

  const measuredAtError = validateRequired(data.measured_at, 'measured_at');
  if (measuredAtError) errors.push(measuredAtError);

  const methodError = validateMethod(data.method);
  if (methodError) errors.push(methodError);

  return { valid: errors.length === 0, errors };
}
