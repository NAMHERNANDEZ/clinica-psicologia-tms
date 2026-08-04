export interface ConsentInput {
  patient_id: number;
  type: 'CONSENTIMIENTO_TERAPIA' | 'CONSENTIMIENTO_DATOS' | 'CONSENTIMIENTO_TMS' | 'CONSENTIMIENTO_TELEPSICOLOGIA';
  document_hash: string;
  accepted_at: string;
  signature?: string;
  template_id?: number;
  version?: number;
}

export interface ConsentSignInput {
  signer_type?: 'patient' | 'therapist' | 'witness' | 'guardian';
  signer_name: string;
  signature_hash: string;
  ip?: string;
  user_agent?: string;
  metadata_json?: string;
}

export interface TemplateInput {
  name: string;
  type: string;
  content: string;
  language?: string;
}

export interface TemplateUpdateInput {
  name?: string;
  content?: string;
  language?: string;
  is_active?: number;
}

export interface RevokeInput {
  reason?: string;
}

const VALID_TYPES = ['CONSENTIMIENTO_TERAPIA', 'CONSENTIMIENTO_DATOS', 'CONSENTIMIENTO_TMS', 'CONSENTIMIENTO_TELEPSICOLOGIA'];
const VALID_SIGNER_TYPES = ['patient', 'therapist', 'witness', 'guardian'];

export function validateConsent(data: unknown): { valid: true; data: ConsentInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.patient_id || typeof input.patient_id !== 'number') return { valid: false, error: 'patient_id requerido' };
  if (!input.type || !VALID_TYPES.includes(input.type as string)) return { valid: false, error: 'Tipo de consentimiento invalido' };
  if (!input.document_hash || typeof input.document_hash !== 'string') return { valid: false, error: 'document_hash requerido' };
  if (!input.accepted_at || typeof input.accepted_at !== 'string') return { valid: false, error: 'accepted_at requerido' };
  return { valid: true, data: input as unknown as ConsentInput };
}

export function validateConsentSign(data: unknown): { valid: true; data: ConsentSignInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.signer_name || typeof input.signer_name !== 'string') return { valid: false, error: 'signer_name requerido' };
  if (!input.signature_hash || typeof input.signature_hash !== 'string') return { valid: false, error: 'signature_hash requerido' };
  if (input.signer_type && !VALID_SIGNER_TYPES.includes(input.signer_type as string)) return { valid: false, error: 'signer_type invalido' };
  return { valid: true, data: input as unknown as ConsentSignInput };
}

export function validateTemplate(data: unknown): { valid: true; data: TemplateInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.name || typeof input.name !== 'string') return { valid: false, error: 'name requerido' };
  if (!input.type || typeof input.type !== 'string') return { valid: false, error: 'type requerido' };
  if (!input.content || typeof input.content !== 'string') return { valid: false, error: 'content requerido' };
  return { valid: true, data: input as unknown as TemplateInput };
}

export function validateTemplateUpdate(data: unknown): { valid: true; data: TemplateUpdateInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (input.name !== undefined && typeof input.name !== 'string') return { valid: false, error: 'name invalido' };
  if (input.content !== undefined && typeof input.content !== 'string') return { valid: false, error: 'content invalido' };
  if (input.language !== undefined && typeof input.language !== 'string') return { valid: false, error: 'language invalido' };
  if (input.is_active !== undefined && typeof input.is_active !== 'number') return { valid: false, error: 'is_active invalido' };
  return { valid: true, data: input as unknown as TemplateUpdateInput };
}

export function validateRevoke(data: unknown): { valid: true; data: RevokeInput } | { valid: false; error: string } {
  return { valid: true, data: data as unknown as RevokeInput };
}