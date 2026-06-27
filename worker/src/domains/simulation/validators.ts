export function validateSimulationRequest(body: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (body.patient_id === undefined || body.patient_id === null) {
    errors.push('patient_id is required');
  } else if (typeof body.patient_id !== 'number') {
    errors.push('patient_id must be a number');
  }

  if (body.protocol_id === undefined || body.protocol_id === null) {
    errors.push('protocol_id is required');
  } else if (typeof body.protocol_id !== 'number') {
    errors.push('protocol_id must be a number');
  }

  return { valid: errors.length === 0, errors };
}

export function validateComparisonRequest(body: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (body.patient_id === undefined || body.patient_id === null) {
    errors.push('patient_id is required');
  } else if (typeof body.patient_id !== 'number') {
    errors.push('patient_id must be a number');
  }

  if (body.protocol_a_id === undefined || body.protocol_a_id === null) {
    errors.push('protocol_a_id is required');
  } else if (typeof body.protocol_a_id !== 'number') {
    errors.push('protocol_a_id must be a number');
  }

  if (body.protocol_b_id === undefined || body.protocol_b_id === null) {
    errors.push('protocol_b_id is required');
  } else if (typeof body.protocol_b_id !== 'number') {
    errors.push('protocol_b_id must be a number');
  }

  return { valid: errors.length === 0, errors };
}
