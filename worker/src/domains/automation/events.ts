import type { Appointment } from '../../types';

interface AutomationReminder {
  id: number;
  appointment_id?: number | null;
  patient_id?: number | null;
  type: '24h' | '1h';
  status: string;
  scheduled_at: string;
}

export type Event =
  | { type: 'LEAD_CREATED'; data: Record<string, unknown> }
  | { type: 'APPOINTMENT_CREATED'; data: Appointment }
  | { type: 'APPOINTMENT_CONFIRMED'; data: Appointment }
  | { type: 'REMINDER_24H'; data: { reminder: AutomationReminder; patient?: { id: number; name: string }; therapist?: { id: number; name: string } } }
  | { type: 'REMINDER_1H'; data: { reminder: AutomationReminder; patient?: { id: number; name: string }; therapist?: { id: number; name: string } } }
  | { type: 'APPOINTMENT_COMPLETED'; data: Appointment };
