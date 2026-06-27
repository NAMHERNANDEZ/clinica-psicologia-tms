export interface TreatmentInput {
  patient_id: number;
  therapist_id: number;
  name: string;
  protocol?: string;
  total_sessions?: number;
  start_date: string;
}

export function validateTreatment(data: unknown): { valid: true; data: TreatmentInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.patient_id || typeof input.patient_id !== 'number') return { valid: false, error: 'ID de paciente requerido' };
  if (!input.therapist_id || typeof input.therapist_id !== 'number') return { valid: false, error: 'ID de terapeuta requerido' };
  if (!input.name || typeof input.name !== 'string') return { valid: false, error: 'Nombre requerido' };
  if (input.name.length < 2) return { valid: false, error: 'Nombre muy corto' };
  if (!input.start_date || typeof input.start_date !== 'string') return { valid: false, error: 'Fecha de inicio requerida' };
  if (input.total_sessions !== undefined && (typeof input.total_sessions !== 'number' || input.total_sessions < 1)) {
    return { valid: false, error: 'Sesiones totales inválidas' };
  }

  const result: TreatmentInput = {
    patient_id: input.patient_id as number,
    therapist_id: input.therapist_id as number,
    name: input.name as string,
    start_date: input.start_date as string,
  };
  if (input.protocol && typeof input.protocol === 'string') result.protocol = input.protocol;
  if (typeof input.total_sessions === 'number') result.total_sessions = input.total_sessions;

  return { valid: true, data: result };
}
