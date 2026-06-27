import type { Env } from '../types';

export async function logAudit(
  env: Env, clinicId: number, userId: number | null,
  action: string, entity: string, entityId?: number,
  before?: string, after?: string, ip?: string
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_logs (clinic_id, user_id, action, entity, entity_id, before_data, after_data, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(clinicId, userId, action, entity, entityId || null, before || null, after || null, ip || null).run();
  } catch (e) {
    console.error('Audit log error:', e);
  }
}
