type Priority = 'low' | 'medium' | 'high' | 'urgent';

interface ReceptionEntryInput {
  patient_id: number;
  appointment_id?: number;
  priority?: Priority;
  notes?: string;
}

export function validateReceptionEntry(input: unknown): {
  valid: boolean;
  data?: ReceptionEntryInput;
  error?: string;
} {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid input' };
  }

  const { patient_id, appointment_id, priority, notes } = input as Record<string, unknown>;

  if (!patient_id || typeof patient_id !== 'number') {
    return { valid: false, error: 'patient_id is required and must be a number' };
  }

  if (appointment_id !== undefined && typeof appointment_id !== 'number') {
    return { valid: false, error: 'appointment_id must be a number' };
  }

  const validPriorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
  if (priority !== undefined && !validPriorities.includes(priority as Priority)) {
    return { valid: false, error: `priority must be one of: ${validPriorities.join(', ')}` };
  }

  if (notes !== undefined && typeof notes !== 'string') {
    return { valid: false, error: 'notes must be a string' };
  }

  return {
    valid: true,
    data: {
      patient_id,
      appointment_id: appointment_id as number | undefined,
      priority: (priority as Priority) || undefined,
      notes: notes as string | undefined,
    },
  };
}
