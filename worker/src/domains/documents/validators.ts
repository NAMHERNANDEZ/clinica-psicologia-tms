import type { User } from '../../types';

const VALID_DOCUMENT_TYPES = [
  'CONSENTIMIENTO_INFORMADO', 'AVISO_PRIVACIDAD', 'EXPEDIENTE', 'NOTA_CLINICA',
  'EVALUACION', 'PLAN_TRATAMIENTO', 'FORMATO_ADMISION', 'RECETA', 'REFERENCIA', 'CONTRATO',
];

export function validateCreateDocument(body: any, user: User): string | null {
  if (!body.patient_id || typeof body.patient_id !== 'number') return 'patient_id requerido (number)';
  if (!body.document_type || !VALID_DOCUMENT_TYPES.includes(body.document_type)) {
    return `document_type requerido. Valores validos: ${VALID_DOCUMENT_TYPES.join(', ')}`;
  }
  if (body.signed_by !== undefined && typeof body.signed_by !== 'string') return 'signed_by debe ser string';
  return null;
}

export function validateSignDocument(body: any): string | null {
  if (!body.signed_by || typeof body.signed_by !== 'string') return 'signed_by requerido';
  return null;
}

export function validateSupersedeDocument(body: any): string | null {
  if (!body.reason || typeof body.reason !== 'string' || body.reason.length < 5) return 'reason requerido (min 5 caracteres)';
  return null;
}
