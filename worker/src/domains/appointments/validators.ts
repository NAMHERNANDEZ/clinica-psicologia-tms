export interface AppointmentInput {
  patient_id?: number;
  lead_id?: number;
  therapist_id?: number;
  date: string;
  time: string;
  duration?: number;
  notes?: string;
  type?: string;
}

export function validateAppointment(data: unknown): { valid: true; data: AppointmentInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  // Una cita debe venir de un paciente existente o de un lead (que se promueve a paciente)
  if (!input.patient_id && !input.lead_id) return { valid: false, error: 'Se requiere patient_id o lead_id' };
  if (!input.date || typeof input.date !== 'string') return { valid: false, error: 'Fecha requerida (YYYY-MM-DD)' };
  if (!input.time || typeof input.time !== 'string') return { valid: false, error: 'Hora requerida (HH:MM)' };

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(input.date)) return { valid: false, error: 'Formato de fecha inválido' };

  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(input.time)) return { valid: false, error: 'Formato de hora inválido' };

  if (input.therapist_id !== undefined && typeof input.therapist_id !== 'number') return { valid: false, error: 'therapist_id debe ser número' };
  if (input.patient_id !== undefined && typeof input.patient_id !== 'number') return { valid: false, error: 'patient_id debe ser número' };
  if (input.lead_id !== undefined && typeof input.lead_id !== 'number') return { valid: false, error: 'lead_id debe ser número' };
  if (input.duration !== undefined && typeof input.duration !== 'number') return { valid: false, error: 'duration debe ser número' };

  return {
    valid: true,
    data: {
      patient_id: input.patient_id as number | undefined,
      lead_id: input.lead_id as number | undefined,
      therapist_id: input.therapist_id as number | undefined,
      date: input.date,
      time: input.time,
      duration: input.duration as number | undefined,
      notes: typeof input.notes === 'string' ? input.notes : undefined,
      type: typeof input.type === 'string' ? input.type : undefined,
    },
  };
}