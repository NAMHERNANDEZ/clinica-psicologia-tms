import type { Env, User } from '../types';

export async function handleGetReminders(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const result = await env.DB.prepare(
      `SELECT a.*, p.name as patient_name, p.phone as patient_phone, t.name as therapist_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN therapists t ON a.therapist_id = t.id
       WHERE a.date >= ?
       ORDER BY a.date ASC, a.time ASC`
    ).bind(today).all();

    const reminders: Array<{
      appointment: Record<string, unknown>;
      patient_name: string;
      patient_phone: string;
      therapist_name: string;
      type: '24h' | '1h' | 'today';
      message: string;
    }> = [];

    for (const apt of result.results) {
      const appointment = apt as Record<string, unknown>;
      const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
      const diffMs = appointmentDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 0 && diffHours <= 1 && !appointment.reminder_1h_sent) {
        reminders.push({
          appointment,
          patient_name: appointment.patient_name as string,
          patient_phone: appointment.patient_phone as string,
          therapist_name: appointment.therapist_name as string,
          type: '1h',
          message: `Cita en 1 hora con ${appointment.patient_name} (${appointment.time})`,
        });
      } else if (diffHours > 0 && diffHours <= 24 && !appointment.reminder_24h_sent) {
        reminders.push({
          appointment,
          patient_name: appointment.patient_name as string,
          patient_phone: appointment.patient_phone as string,
          therapist_name: appointment.therapist_name as string,
          type: '24h',
          message: `Cita mañana con ${appointment.patient_name} a las ${appointment.time}`,
        });
      } else if (diffHours >= 0 && diffHours <= 24 && appointment.date === today) {
        reminders.push({
          appointment,
          patient_name: appointment.patient_name as string,
          patient_phone: appointment.patient_phone as string,
          therapist_name: appointment.therapist_name as string,
          type: 'today',
          message: `Hoy cita con ${appointment.patient_name} a las ${appointment.time}`,
        });
      }
    }

    return jsonResponse(reminders, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al obtener recordatorios' }, 500, origin);
  }
}

function jsonResponse(data: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
