export interface LogNotificationInput {
  type: string;
  message: string;
  channel: 'whatsapp' | 'email' | 'internal';
  appointment_id?: number;
}

export function validateLogNotification(data: unknown): { valid: true; data: LogNotificationInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.type || typeof input.type !== 'string' || input.type.trim() === '') {
    return { valid: false, error: 'type requerido' };
  }

  if (!input.message || typeof input.message !== 'string' || input.message.trim() === '') {
    return { valid: false, error: 'message requerido' };
  }

  const validChannels = ['whatsapp', 'email', 'internal'];
  if (!input.channel || typeof input.channel !== 'string' || !validChannels.includes(input.channel)) {
    return { valid: false, error: 'channel debe ser whatsapp, email o internal' };
  }

  if (input.appointment_id !== undefined && input.appointment_id !== null) {
    if (typeof input.appointment_id !== 'number' || !Number.isInteger(input.appointment_id) || input.appointment_id <= 0) {
      return { valid: false, error: 'appointment_id debe ser un número entero mayor a 0' };
    }
  }

  return {
    valid: true,
    data: {
      type: (input.type as string).trim(),
      message: (input.message as string).trim(),
      channel: input.channel as 'whatsapp' | 'email' | 'internal',
      appointment_id: input.appointment_id as number | undefined,
    },
  };
}
