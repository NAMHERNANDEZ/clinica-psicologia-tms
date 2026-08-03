import type { Env } from '../../types';
import { createNotificationLog } from '../notifications/service';
import { executeAutomationForEvent } from '../automation/executor';

export async function getDashboardMetrics(env: Env, clinicId: number) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  // Metricas de leads
  const leadsToday = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM leads WHERE clinic_id = ? AND created_at >= ? AND deleted_at IS NULL`
  ).bind(clinicId, today).first();

  const leadsMonth = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM leads WHERE clinic_id = ? AND created_at >= ? AND deleted_at IS NULL`
  ).bind(clinicId, monthStart).first();

  const leadsStats = await env.DB.prepare(
    `SELECT estado, COUNT(*) as count FROM leads WHERE clinic_id = ? AND deleted_at IS NULL GROUP BY estado`
  ).bind(clinicId).all();

  // Metricas de appointments
  const appointmentsToday = await env.DB.prepare(
    `SELECT COUNT(*) as count, status FROM appointments WHERE clinic_id = ? AND date = ? GROUP BY status`
  ).bind(clinicId, today).all();

  const appointmentsMonth = await env.DB.prepare(
    `SELECT COUNT(*) as count, status FROM appointments WHERE clinic_id = ? AND date >= ? GROUP BY status`
  ).bind(clinicId, monthStart).all();

  // Metricas de automatización
  const automationStats = await env.DB.prepare(
    `SELECT channel, COUNT(*) as count, status FROM notification_logs WHERE clinic_id = ? AND created_at >= ? GROUP BY channel, status`
  ).bind(clinicId, today).all();

  // Leads conversion (appointment created from lead)
  const leadConversions = await env.DB.prepare(
    `SELECT COUNT(DISTINCT l.id) as count FROM leads l JOIN appointments a ON l.id = a.lead_id WHERE l.clinic_id = ? AND a.created_at >= ?`
  ).bind(clinicId, today).first();

  // Estadísticas de notificaciones de la semana anterior para referencia
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const automationWeek = await env.DB.prepare(
    `SELECT COUNT(*) as count, status FROM notification_logs WHERE clinic_id = ? AND created_at >= ? GROUP BY status`
  ).bind(clinicId, weekStart).all();

  // Calcular porcentajes de conversion
  const leadsCount = Number(leadsMonth?.count) || 0;
  const conversionRate = leadsCount > 0 ? Math.round((Number(leadConversions?.count) || 0) / leadsCount * 100) : 0;
  // Nota: createNotificationLog disponible para futuras metricas de notificacion

  // Construir respuesta del dashboard
  return {
    leads: {
      today: leadsToday?.count || 0,
      month: leadsMonth?.count || 0,
      by_status: Object.fromEntries(leadsStats.results.map((r: any) => [r.estado, r.count])),
    },
    appointments: {
      today: {
        total: appointmentsToday.results.reduce((sum: number, r: any) => sum + r.count, 0),
        by_status: Object.fromEntries(appointmentsToday.results.map((r: any) => [r.status, r.count])),
      },
      month: {
        total: appointmentsMonth.results.reduce((sum: number, r: any) => sum + r.count, 0),
        by_status: Object.fromEntries(appointmentsMonth.results.map((r: any) => [r.status, r.count])),
      },
    },
    automation: {
      today: automationStats.results.reduce((sum: number, r: any) => sum + r.count, 0),
      week: automationWeek.results.reduce((sum: number, r: any) => sum + r.count, 0),
      by_channel: Object.fromEntries(automationStats.results.map((r: any) => [r.channel, r.count])),
      by_status: Object.fromEntries(automationStats.results.map((r: any) => [r.status, r.count])),
    },
    conversion: {
      leads_month: leadsCount,
      appointments_from_leads: leadConversions?.count || 0,
      rate_percentage: conversionRate,
    },
  };
}
