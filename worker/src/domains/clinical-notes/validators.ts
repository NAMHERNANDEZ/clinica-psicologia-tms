export interface ClinicalNoteInput {
  patient_id: number;
  note: string;
  note_type?: string;
  appointment_id?: number;
  treatment_id?: number;
}

const VALID_NOTE_TYPES = ['session', 'assessment', 'progress', 'discharge'];

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

  return { valid: true, data: input as ClinicalNoteInput };
}
