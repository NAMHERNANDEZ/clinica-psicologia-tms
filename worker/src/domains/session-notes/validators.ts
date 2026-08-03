export interface SessionNoteInput {
  patient_id: number;
  session_date: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  signature?: string;
}

export function validateSessionNote(data: unknown): { valid: true; data: SessionNoteInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.patient_id || typeof input.patient_id !== 'number') return { valid: false, error: 'patient_id requerido' };
  if (!input.session_date || typeof input.session_date !== 'string') return { valid: false, error: 'session_date requerida' };

  return { valid: true, data: input as unknown as SessionNoteInput };
}