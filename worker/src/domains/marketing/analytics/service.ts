import type { Env } from '../../../types';

interface SqlRow { [key: string]: unknown }

export async function getMarketingAnalytics(env: Env, clinicId: number) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Sources de leads (basado en origen de leads)
  let leadSources: SqlRow[] = [];
  try {
    const r = await env.DB.prepare(
      `SELECT origen, COUNT(*) as leads,
              COUNT(DISTINCT CASE WHEN estado IN ('CONTACTADO', 'CITA_CONFIRMADA', 'ATENDIDO') THEN id END) as patients
       FROM leads WHERE clinic_id = ? AND fecha_creacion >= ? GROUP BY origen`
    ).bind(clinicId, monthStart).all();
    leadSources = r.results as SqlRow[] || [];
  } catch (e) {
    console.error('[marketing-analytics] leadSources query failed:', e);
  }

  // Conversion rates por origen
  let conversions: SqlRow[] = [];
  try {
    const r = await env.DB.prepare(
      `SELECT origen, COUNT(*) as conversions
       FROM leads WHERE estado IN ('CONTACTADO', 'CITA_CONFIRMADA', 'ATENDIDO')
       AND fecha_creacion >= ? GROUP BY origen`
    ).bind(monthStart).all();
    conversions = r.results as SqlRow[] || [];
  } catch (e) {
    console.error('[marketing-analytics] conversions query failed:', e);
  }

  // Servicios mas solicitados por citas
  let topServices: SqlRow[] = [];
  try {
    const r = await env.DB.prepare(
      `SELECT COALESCE(a.type, 'CONSULTA') as servicio, COUNT(*) as total
       FROM appointments a WHERE a.clinic_id = ? AND a.date >= ? GROUP BY a.type ORDER BY total DESC LIMIT 5`
    ).bind(clinicId, monthStart).all();
    topServices = r.results as SqlRow[] || [];
  } catch (e) {
    console.error('[marketing-analytics] topServices query failed:', e);
  }

  // Canales de marketing (leads totales del mes)
  let totalLeads = 0;
  try {
    const r = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM leads WHERE clinic_id = ? AND fecha_creacion >= ?`
    ).bind(clinicId, monthStart).first();
    totalLeads = Number((r as SqlRow)?.total) || 0;
  } catch (e) {
    console.error('[marketing-analytics] totalLeads query failed:', e);
  }

  // Fuentes organico vs pagado (origenes conocidos)
  let organicLeads = 0;
  let paidLeads = 0;
  try {
    const r = await env.DB.prepare(
      `SELECT origen, COUNT(*) as leads FROM leads WHERE clinic_id = ? AND fecha_creacion >= ? GROUP BY origen`
    ).bind(clinicId, monthStart).all();
    const rows = (r.results as SqlRow[]) || [];
    rows.forEach((row) => {
      const origen = String(row.origen || '');
      const cnt = Number(row.leads) || 0;
      if (origen === 'organic' || origen === 'referido' || origen === 'chat') {
        organicLeads += cnt;
      } else {
        paidLeads += cnt;
      }
    });
  } catch (e) {
    console.error('[marketing-analytics] source types query failed:', e);
  }

  // KPI diarios de leads (ultimos 7 dias)
  let dailyLeads: SqlRow[] = [];
  try {
    const r = await env.DB.prepare(
      `SELECT date(fecha_creacion) as day, COUNT(*) as leads FROM leads WHERE clinic_id = ? AND fecha_creacion >= ? GROUP BY date(fecha_creacion) ORDER BY day`
    ).bind(clinicId, weekStart).all();
    dailyLeads = r.results as SqlRow[] || [];
  } catch (e) {
    console.error('[marketing-analytics] dailyLeads query failed:', e);
  }

  // Crecimiento mensual
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  let currentMonthLeads = 0;
  let prevMonthLeads = 0;
  try {
    const cm = await env.DB.prepare(`SELECT COUNT(*) as leads FROM leads WHERE clinic_id = ? AND fecha_creacion >= ?`).bind(clinicId, monthStart).first();
    currentMonthLeads = Number((cm as SqlRow)?.leads) || 0;
  } catch (e) {
    console.error('[marketing-analytics] currentMonth query failed:', e);
  }
  try {
    const pm = await env.DB.prepare(`SELECT COUNT(*) as leads FROM leads WHERE clinic_id = ? AND fecha_creacion >= ?`).bind(clinicId, prevMonthStart).first();
    prevMonthLeads = Number((pm as SqlRow)?.leads) || 0;
  } catch (e) {
    console.error('[marketing-analytics] prevMonth query failed:', e);
  }

  const estimatedROI = currentMonthLeads * 50;

  return {
    sources: Object.fromEntries(leadSources.map((r) => [String(r.origen || 'desconocido'), Number(r.leads) || 0])),
    patients_by_source: Object.fromEntries(leadSources.map((r) => [String(r.origen || 'desconocido'), Number(r.patients) || 0])),
    conversions: Object.fromEntries(conversions.map((r) => [String(r.origen || 'desconocido'), Number(r.conversions) || 0])),
    top_services: topServices.map((r) => ({ servicio: String(r.servicio || 'CONSULTA'), total: Number(r.total) || 0 })),
    channels: { total_leads: totalLeads },
    source_types: { organico: organicLeads, pago: paidLeads },
    daily_leads: dailyLeads.map((r) => ({ day: String(r.day || ''), leads: Number(r.leads) || 0 })),
    growth: {
      current_month: currentMonthLeads,
      previous_month: prevMonthLeads,
      growth_percentage: prevMonthLeads
        ? Math.round(((currentMonthLeads - prevMonthLeads) / prevMonthLeads) * 100)
        : 0,
    },
    estimated_roi: estimatedROI || 0,
  };
}
