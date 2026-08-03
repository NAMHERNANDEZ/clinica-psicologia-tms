export interface ConsentInput {
  patient_id: number;
  type: 'CONSENTIMIENTO_TERAPIA' | 'CONSENTIMIENTO_DATOS' | 'CONSENTIMIENTO_TMS' | 'CONSENTIMIENTO_TELEPSICOLOGIA';
  document_hash: string;
  accepted_at: string;
  signature?: string;
}

const VALID_TYPES = ['CONSENTIMIENTO_TERAPIA', 'CONSENTIMIENTO_DATOS', 'CONSENTIMIENTO_TMS', 'CONSENTIMIENTO_TELEPSICOLOGIA'];

export function validateConsent(data: unknown): { valid: true; data: ConsentInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.patient_id || typeof input.patient_id !== 'number') return { valid: false, error: 'patient_id requerido' };
  if (!input.type || !VALID_TYPES.includes(input.type as string)) return { valid: false, error: 'Tipo de consentimiento invalido' };
  if (!input.document_hash || typeof input.document_hash !== 'string') return { valid: false, error: 'document_hash requerido' };
  if (!input.accepted_at || typeof input.accepted_at !== 'string') return { valid: false, error: 'accepted_at requerido' };

  return { valid: true, data: input as unknown as ConsentInput };
}