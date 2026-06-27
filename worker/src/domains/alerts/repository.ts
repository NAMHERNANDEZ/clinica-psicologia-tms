import type { Env } from '../../types';

interface AlertRow {
  id: number;
  clinic_id: number;
  type: string;
  title: string;
  message: string;
  severity: string;
  read: number;
  entity: string | null;
  entity_id: number | null;
  created_at: string;
}

export async function getAlerts(
  env: Env,
  clinicId: number,
  unreadOnly: boolean = false
): Promise<AlertRow[]> {
  let query = 'SELECT * FROM internal_alerts WHERE clinic_id = ?';
  const params: unknown[] = [clinicId];

  if (unreadOnly) {
    query += ' AND read = 0';
  }

  query += ' ORDER BY created_at DESC';

  const result = await env.DB.prepare(query).bind(...params).all<AlertRow>();
  return result.results ?? [];
}

export async function getUnreadCount(env: Env, clinicId: number): Promise<number> {
  const result = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM internal_alerts WHERE clinic_id = ? AND read = 0'
  )
    .bind(clinicId)
    .first<{ count: number }>();

  return result?.count ?? 0;
}

export async function createAlert(
  env: Env,
  clinicId: number,
  type: string,
  title: string,
  message: string,
  severity: string = 'info',
  entity?: string,
  entityId?: number
): Promise<AlertRow> {
  const result = await env.DB.prepare(
    'INSERT INTO internal_alerts (clinic_id, type, title, message, severity, read, entity, entity_id) VALUES (?, ?, ?, ?, ?, 0, ?, ?) RETURNING *'
  )
    .bind(clinicId, type, title, message, severity, entity ?? null, entityId ?? null)
    .first<AlertRow>();

  if (!result) {
    throw new Error('Failed to create alert');
  }

  return result;
}

export async function markAlertRead(env: Env, id: number): Promise<void> {
  await env.DB.prepare('UPDATE internal_alerts SET read = 1 WHERE id = ?').bind(id).run();
}

export async function markAllRead(env: Env, clinicId: number): Promise<void> {
  await env.DB.prepare(
    'UPDATE internal_alerts SET read = 1 WHERE clinic_id = ? AND read = 0'
  )
    .bind(clinicId)
    .run();
}

export async function deleteAlert(env: Env, id: number): Promise<void> {
  await env.DB.prepare('DELETE FROM internal_alerts WHERE id = ?').bind(id).run();
}

export async function getAlertsSummary(env: Env, clinicId: number): Promise<{
  total: number;
  unread: number;
  critical: number;
  warnings: number;
}> {
  const result = await env.DB.prepare(
    'SELECT COUNT(*) as total, SUM(CASE WHEN read = 0 THEN 1 ELSE 0 END) as unread, SUM(CASE WHEN severity = ? THEN 1 ELSE 0 END) as critical, SUM(CASE WHEN severity = ? THEN 1 ELSE 0 END) as warnings FROM internal_alerts WHERE clinic_id = ?'
  )
    .bind('critical', 'warning', clinicId)
    .first<{ total: number; unread: number; critical: number; warnings: number }>();

  return {
    total: result?.total ?? 0,
    unread: result?.unread ?? 0,
    critical: result?.critical ?? 0,
    warnings: result?.warnings ?? 0,
  };
}
