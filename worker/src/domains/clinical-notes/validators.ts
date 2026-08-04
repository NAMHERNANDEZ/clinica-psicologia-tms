export interface ClinicalNoteInput {
  patient_id: number;
  note: string;
  note_type?: string;
  appointment_id?: number;
  treatment_id?: number;
  template_type?: 'SOAP' | 'DAP' | 'BIRP' | 'Libre';
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  fields_json?: string;
  status?: 'draft' | 'final' | 'locked' | 'archived';
}

const VALID_NOTE_TYPES = ['session', 'assessment', 'progress', 'discharge'];
const VALID_TEMPLATES = ['SOAP', 'DAP', 'BIRP', 'Libre'];
const VALID_RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['draft', 'final', 'locked', 'archived'];

export function validateClinicalNote(data: unknown): { valid: true; data: ClinicalNoteInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.patient_id || typeof input.patient_id !== 'number') return { valid: false, error: 'patient_id requerido' };
  if (!input.note || typeof input.note !== 'string') return { valid: false, error: 'note requerido' };
  if (input.note.length < 10) return { valid: false, error: 'La nota debe tener al menos 10 caracteres' };

  if (input.note_type !== undefined) {
    if (typeof input.note_type !== 'string' || !VALID_NOTE_TYPES.includes(input.note_type)) {
      return { valid: false, error: `note_type debe ser uno de: ${VALID_NOTE_TYPES.join(', ')}` };
    }
  }

  if (input.appointment_id !== undefined && typeof input.appointment_id !== 'number') {
    return { valid: false, error: 'appointment_id debe ser un número' };
  }
  if (input.treatment_id !== undefined && typeof input.treatment_id !== 'number') {
    return { valid: false, error: 'treatment_id debe ser un número' };
  }

  if (input.template_type !== undefined) {
    if (typeof input.template_type !== 'string' || !VALID_TEMPLATES.includes(input.template_type)) {
      return { valid: false, error: `template_type debe ser uno de: ${VALID_TEMPLATES.join(', ')}` };
    }
  }

  if (input.risk_level !== undefined) {
    if (typeof input.risk_level !== 'string' || !VALID_RISK_LEVELS.includes(input.risk_level)) {
      return { valid: false, error: `risk_level debe ser uno de: ${VALID_RISK_LEVELS.join(', ')}` };
    }
  }

  if (input.status !== undefined) {
    if (typeof input.status !== 'string' || !VALID_STATUSES.includes(input.status)) {
      return { valid: false, error: `status debe ser uno de: ${VALID_STATUSES.join(', ')}` };
    }
  }

  if (input.fields_json !== undefined && typeof input.fields_json !== 'string') {
    return { valid: false, error: 'fields_json debe ser un string JSON' };
  }

  return { valid: true, data: input as unknown as ClinicalNoteInput };
}
