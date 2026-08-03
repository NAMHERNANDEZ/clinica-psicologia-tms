import type { Env } from '../types';

export async function logAudit(
  env: Env, clinicId: number, userId: number | null,
  module: string, action: string, entity: string, entityId?: number,
  before?: string, after?: string, ip?: string, userAgent?: string, severity: string = 'info',
  extra?: { requestId?: string; sessionId?: string; correlationId?: string; result?: string }
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_logs (clinic_id, user_id, module, action, entity, entity_id, before_data, after_data, old_value, new_value, ip, user_agent, request_id, session_id, correlation_id, result, severity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      clinicId, userId, module, action, entity,
      entityId || null, before || null, after || null,
      before || null, after || null,
      ip || null, userAgent || null,
      extra?.requestId || null, extra?.sessionId || null,
      extra?.correlationId || null, extra?.result || null,
      severity
    ).run();
  } catch (e) {
    console.error('Audit log error:', e);
  }
}