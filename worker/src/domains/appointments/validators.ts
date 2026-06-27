export interface AppointmentInput {
  patient_id: number;
  therapist_id: number;
  date: string;
  time: string;
  duration?: number;
  notes?: string;
}

export function validateAppointment(data: unknown): { valid: true; data: AppointmentInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.patient_id) return { valid: false, error: 'Paciente requerido' };
  if (!input.therapist_id) return { valid: false, error: 'Terapeuta requerido' };
  if (!input.date || typeof input.date !== 'string') return { valid: false, error: 'Fecha requerida (YYYY-MM-DD)' };
  if (!input.time || typeof input.time !== 'string') return { valid: false, error: 'Hora requerida (HH:MM)' };

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input.date)) return { valid: false, error: 'Formato de fecha inválido' };

  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(input.time)) return { valid: false, error: 'Formato de hora inválido' };

  return { valid: true, data: input as AppointmentInput };
}
