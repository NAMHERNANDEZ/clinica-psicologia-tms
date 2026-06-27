export interface EngineRequest {
  patient_id: number;
  diagnosis?: string;
}

export function validateEngineRequest(data: unknown): { valid: true; data: EngineRequest } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.patient_id || typeof input.patient_id !== 'number') {
    return { valid: false, error: 'patient_id requerido' };
  }

  if (input.diagnosis !== undefined && typeof input.diagnosis !== 'string') {
    return { valid: false, error: 'diagnosis debe ser una cadena de texto' };
  }

  return {
    valid: true,
    data: {
      patient_id: input.patient_id as number,
      diagnosis: input.diagnosis as string | undefined,
    },
  };
}

export function validatePatientId(patientId: unknown): { valid: true; data: number } | { valid: false; error: string } {
  if (patientId === undefined || patientId === null || typeof patientId !== 'number' || isNaN(patientId)) {
    return { valid: false, error: 'patient_id inválido' };
  }
  return { valid: true, data: patientId };
}
