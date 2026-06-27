export interface GenerateRemindersInput {
  appointment_id: number;
}

export function validateGenerateReminders(data: unknown): { valid: true; data: GenerateRemindersInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (input.appointment_id === undefined || input.appointment_id === null) {
    return { valid: false, error: 'appointment_id requerido' };
  }
  if (typeof input.appointment_id !== 'number' || !Number.isInteger(input.appointment_id)) {
    return { valid: false, error: 'appointment_id debe ser un número entero' };
  }
  if (input.appointment_id <= 0) {
    return { valid: false, error: 'appointment_id debe ser mayor a 0' };
  }

  return { valid: true, data: { appointment_id: input.appointment_id } };
}
