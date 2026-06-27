export type TmsProfileStatus = 'evaluation' | 'active' | 'completed' | 'discontinued';

export interface TmsProfileInput {
  patient_id: number;
  protocol_id: number;
  therapist_id: number;
  motor_threshold_id: number;
  assigned_diagnosis: string;
  baseline_bdi?: number;
  baseline_gad7?: number;
  baseline_phq9?: number;
  start_date?: string;
}

export function validateTmsProfile(data: unknown): { valid: true; data: TmsProfileInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (input.patient_id === undefined || typeof input.patient_id !== 'number' || input.patient_id <= 0) {
    return { valid: false, error: 'ID de paciente requerido' };
  }
  if (input.protocol_id === undefined || typeof input.protocol_id !== 'number' || input.protocol_id <= 0) {
    return { valid: false, error: 'ID de protocolo requerido' };
  }
  if (input.therapist_id === undefined || typeof input.therapist_id !== 'number' || input.therapist_id <= 0) {
    return { valid: false, error: 'ID de terapeuta requerido' };
  }
  if (input.motor_threshold_id === undefined || typeof input.motor_threshold_id !== 'number' || input.motor_threshold_id <= 0) {
    return { valid: false, error: 'ID de umbral motor requerido' };
  }
  if (!input.assigned_diagnosis || typeof input.assigned_diagnosis !== 'string') {
    return { valid: false, error: 'Diagnóstico asignado requerido' };
  }

  if (input.baseline_bdi !== undefined && (typeof input.baseline_bdi !== 'number' || input.baseline_bdi < 0)) {
    return { valid: false, error: 'Baseline BDI debe ser un número no negativo' };
  }
  if (input.baseline_gad7 !== undefined && (typeof input.baseline_gad7 !== 'number' || input.baseline_gad7 < 0)) {
    return { valid: false, error: 'Baseline GAD-7 debe ser un número no negativo' };
  }
  if (input.baseline_phq9 !== undefined && (typeof input.baseline_phq9 !== 'number' || input.baseline_phq9 < 0)) {
    return { valid: false, error: 'Baseline PHQ-9 debe ser un número no negativo' };
  }
  if (input.start_date !== undefined && typeof input.start_date !== 'string') {
    return { valid: false, error: 'Fecha de inicio inválida' };
  }

  return {
    valid: true,
    data: {
      patient_id: input.patient_id as number,
      protocol_id: input.protocol_id as number,
      therapist_id: input.therapist_id as number,
      motor_threshold_id: input.motor_threshold_id as number,
      assigned_diagnosis: input.assigned_diagnosis as string,
      baseline_bdi: input.baseline_bdi as number | undefined,
      baseline_gad7: input.baseline_gad7 as number | undefined,
      baseline_phq9: input.baseline_phq9 as number | undefined,
      start_date: input.start_date as string | undefined,
    },
  };
}
