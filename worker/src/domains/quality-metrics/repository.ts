import type { Env } from '../../types';
import type { CreateQualityMetric } from './validators';

export async function listMetrics(env: Env, clinicId: number, from?: string | null, to?: string | null) {
  let query = 'SELECT * FROM quality_metrics WHERE clinic_id = ?';
  const params: (number | string)[] = [clinicId];

  if (from) {
    query += ' AND period_start >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND period_end <= ?';
    params.push(to);
  }

  query += ' ORDER BY created_at DESC';
  return env.DB.prepare(query).bind(...params).all();
}

export async function getMetric(env: Env, clinicId: number, id: number) {
  return env.DB.prepare(
    'SELECT * FROM quality_metrics WHERE id = ? AND clinic_id = ?'
  ).bind(id, clinicId).first();
}

export async function createMetric(env: Env, clinicId: number, data: CreateQualityMetric) {
  return env.DB.prepare(
    `INSERT INTO quality_metrics (clinic_id, metric_type, value, unit, period_start, period_end, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(clinicId, data.metric_type, data.value, data.unit, data.period_start, data.period_end, data.notes || null).run();
}

export async function deleteMetric(env: Env, clinicId: number, id: number) {
  return env.DB.prepare(
    'DELETE FROM quality_metrics WHERE id = ? AND clinic_id = ?'
  ).bind(id, clinicId).run();
}

export async function getMetricSummary(env: Env, clinicId: number) {
  const all = await env.DB.prepare(
    'SELECT metric_type, COUNT(*) as cnt, AVG(value) as avg_val FROM quality_metrics WHERE clinic_id = ? GROUP BY metric_type'
  ).bind(clinicId).all<{ metric_type: string; cnt: number; avg_val: number }>();

  const latest = await env.DB.prepare(
    'SELECT metric_type, value as latest_val FROM quality_metrics WHERE clinic_id = ? AND id IN (SELECT MAX(id) FROM quality_metrics WHERE clinic_id = ? GROUP BY metric_type)'
  ).bind(clinicId, clinicId).all<{ metric_type: string; latest_val: number }>();

  const latestMap: Record<string, number> = {};
  for (const l of latest.results || []) {
    latestMap[l.metric_type] = l.latest_val;
  }

  const results: Record<string, { count: number; avg_value: number; latest: number }> = {};
  for (const row of all.results || []) {
    results[row.metric_type] = {
      count: row.cnt || 0,
      avg_value: Math.round((row.avg_val || 0) * 100) / 100,
      latest: latestMap[row.metric_type] || 0,
    };
  }

  return results;
}

export async function getDashboardMetrics(env: Env, clinicId: number) {
  const patientCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM patients WHERE clinic_id = ?'
  ).bind(clinicId).first<{ count: number }>();

  const activeTreatments = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM treatments WHERE clinic_id = ? AND status = 'active'"
  ).bind(clinicId).first<{ count: number }>();

  const totalSessions = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM tms_sessions WHERE clinic_id = ? AND status = 'completed'"
  ).bind(clinicId).first<{ count: number }>();

  const adverseEffects = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM adverse_effects WHERE clinic_id = ?'
  ).bind(clinicId).first<{ count: number }>();

  const completedSessions = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM appointments WHERE clinic_id = ? AND status = 'completed'"
  ).bind(clinicId).first<{ count: number }>();

  const totalAppointments = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM appointments WHERE clinic_id = ? AND status != 'cancelled'"
  ).bind(clinicId).first<{ count: number }>();

  const noShowCount = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM appointments WHERE clinic_id = ? AND status = 'no_show'"
  ).bind(clinicId).first<{ count: number }>();

  const totalIncidents = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM security_incidents WHERE clinic_id = ?'
  ).bind(clinicId).first<{ count: number }>();

  const openIncidents = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM security_incidents WHERE clinic_id = ? AND resolved_at IS NULL"
  ).bind(clinicId).first<{ count: number }>();

  return {
    patients: patientCount?.count || 0,
    active_treatments: activeTreatments?.count || 0,
    completed_sessions: totalSessions?.count || 0,
    adverse_effects: adverseEffects?.count || 0,
    no_show_rate: totalAppointments?.count
      ? Math.round(((noShowCount?.count || 0) / totalAppointments.count) * 10000) / 100
      : 0,
    security_incidents: totalIncidents?.count || 0,
    open_incidents: openIncidents?.count || 0,
  };
}
