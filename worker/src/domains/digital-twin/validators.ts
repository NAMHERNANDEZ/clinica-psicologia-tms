export function validatePredictionRequest(body: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (body.patient_id === undefined || body.patient_id === null) {
    errors.push('patient_id is required');
  } else if (typeof body.patient_id !== 'number') {
    errors.push('patient_id must be a number');
  }

  if (body.session_number !== undefined && body.session_number !== null) {
    if (typeof body.session_number !== 'number') {
      errors.push('session_number must be a number');
    }
  }

  return { valid: errors.length === 0, errors };
}
