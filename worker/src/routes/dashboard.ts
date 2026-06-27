import type { Env, User } from '../types';

export async function handleGetDashboard(env: Env, request: Request, user: User, origin: string): Promise<Response> {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const patientsTotal = await env.DB.prepare("SELECT COUNT(*) as total FROM patients").first();
    const therapistsActive = await env.DB.prepare("SELECT COUNT(*) as total FROM therapists WHERE is_active = 1").first();

    const appointmentsToday = await env.DB.prepare(
      "SELECT COUNT(*) as total FROM appointments WHERE date = ?"
    ).bind(today).first();

    const appointmentsWeek = await env.DB.prepare(
      "SELECT COUNT(*) as total FROM appointments WHERE date >= ? AND date <= ?"
    ).bind(weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]).first();

    const remindersPending = await env.DB.prepare(
      "SELECT COUNT(*) as total FROM appointments WHERE reminder_24h_sent = 0 OR reminder_1h_sent = 0"
    ).first();

    const recentAppointments = await env.DB.prepare(
      `SELECT a.*, p.name as patient_name, t.name as therapist_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN therapists t ON a.therapist_id = t.id
       WHERE a.date >= ?
       ORDER BY a.date ASC, a.time ASC
       LIMIT 10`
    ).bind(today).all();

    const statusCounts = await env.DB.prepare(
      `SELECT status, COUNT(*) as count FROM appointments WHERE date >= ? GROUP BY status`
    ).bind(today).all();

    return jsonResponse({
      stats: {
        patientsTotal: patientsTotal?.total || 0,
        therapistsActive: therapistsActive?.total || 0,
        appointmentsToday: appointmentsToday?.total || 0,
        appointmentsWeek: appointmentsWeek?.total || 0,
        remindersPending: remindersPending?.total || 0,
      },
      recentAppointments: recentAppointments.results,
      statusCounts: statusCounts.results,
    }, 200, origin);
  } catch (error) {
    return jsonResponse({ error: 'Error al obtener dashboard' }, 500, origin);
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
