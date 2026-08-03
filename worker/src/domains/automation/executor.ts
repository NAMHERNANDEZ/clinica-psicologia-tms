import type { Env } from '../../types';
import { triggerAutomationEvent } from './service';
import type { Event } from './events';

export { triggerAutomationForReminder } from './service';

export async function executeAutomationForEvent(
  env: Env,
  eventType: string,
  data: any
): Promise<{ success: boolean; notificationId?: number; error?: string }> {
  try {
    console.log(`Ejecutando automatizacion para evento: ${eventType}`);

    const event = createEvent(eventType, data);
    if (!event) {
      return { success: false, error: 'Evento no soportado' };
    }

    const result = await triggerAutomationEvent(env, event);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    console.log(`Automatizacion completada: ${eventType} -> ${result.notificationId}`);
    return { success: true, notificationId: result.notificationId };
  } catch (error) {
    console.error(`Error al ejecutar automatizacion ${eventType}:`, error);
    return { success: false, error: String(error) };
  }
}

function createEvent(eventType: string, data: any): Event | null {
  switch (eventType) {
    case 'LEAD_CREATED':
      return { type: 'LEAD_CREATED', data };
    case 'APPOINTMENT_CREATED':
      return { type: 'APPOINTMENT_CREATED', data };
    case 'APPOINTMENT_CONFIRMED':
      return { type: 'APPOINTMENT_CONFIRMED', data };
    case 'REMINDER_24H':
      return { type: 'REMINDER_24H', data };
    case 'REMINDER_1H':
      return { type: 'REMINDER_1H', data };
    case 'APPOINTMENT_COMPLETED':
      return { type: 'APPOINTMENT_COMPLETED', data };
    default:
      return null;
  }
}
