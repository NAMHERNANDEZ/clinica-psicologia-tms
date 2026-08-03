export interface ClinicalRecordInput {
  patient_id: number;
  reason_consultation: string;
  history?: string;
  evaluation?: string;
  diagnosis?: string;
  treatment_plan?: string;
}

export function validateClinicalRecord(data: unknown): { valid: true; data: ClinicalRecordInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.patient_id || typeof input.patient_id !== 'number') return { valid: false, error: 'patient_id requerido' };
  if (!input.reason_consultation || typeof input.reason_consultation !== 'string') return { valid: false, error: 'Motivo de consulta requerido' };

  return { valid: true, data: input as unknown as ClinicalRecordInput };
}