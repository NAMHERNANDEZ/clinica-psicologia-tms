import type { Env } from '../../types';

export type LeadEstado = 'NUEVO' | 'CONTACTADO' | 'CITA_CONFIRMADA' | 'ATENDIDO' | 'CERRADO';

export const LEAD_ESTADOS: LeadEstado[] = ['NUEVO', 'CONTACTADO', 'CITA_CONFIRMADA', 'ATENDIDO', 'CERRADO'];

export interface LeadInput {
  nombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  ciudad?: string | null;
  servicio_interesado?: string | null;
  motivo?: string | null;
  estado?: LeadEstado;
  origen?: string;
  clinic_id?: number;
}

export async function createLead(env: Env, data: LeadInput) {
  const now = new Date().toISOString();
  const { meta } = await env.DB.prepare(`
    INSERT INTO leads (clinic_id, nombre, telefono, email, ciudad, servicio_interesado, motivo, estado, origen, fecha_creacion, fecha_actualizacion)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.clinic_id || 1,
    data.nombre || null,
    data.telefono || null,
    data.email || null,
    data.ciudad || null,
    data.servicio_interesado || null,
    data.motivo || null,
    data.estado || 'NUEVO',
    data.origen || 'chat',
    now,
    now,
  ).run();

  return meta.last_row_id;
}

export async function listLeads(env: Env, clinicId: number, estado?: string, origen?: string, search?: string) {
  let sql = `
    SELECT id, nombre, telefono, email, ciudad, servicio_interesado, motivo, estado, origen, fecha_creacion, fecha_actualizacion
    FROM leads
    WHERE clinic_id = ? AND deleted_at IS NULL
  `;
  const params: unknown[] = [clinicId];

  if (estado) {
    sql += ` AND estado = ?`;
    params.push(estado);
  }
  if (origen) {
    sql += ` AND origen = ?`;
    params.push(origen);
  }
  if (search && search.trim()) {
    sql += ` AND (nombre LIKE ? OR telefono LIKE ? OR email LIKE ? OR ciudad LIKE ?)`;
    const like = `%${search.trim()}%`;
    params.push(like, like, like, like);
  }

  sql += ` ORDER BY fecha_creacion DESC`;

  const { results } = await env.DB.prepare(sql).bind(...params).all();
  return results;
}

export async function getLead(env: Env, id: number, clinicId: number) {
  const { results } = await env.DB.prepare(`
    SELECT id, nombre, telefono, email, ciudad, servicio_interesado, motivo, estado, origen, fecha_creacion, fecha_actualizacion, deleted_at
    FROM leads
    WHERE id = ? AND clinic_id = ?
  `).bind(id, clinicId).all();

  return results[0] || null;
}

export async function updateLead(env: Env, id: number, clinicId: number, fields: Record<string, unknown>) {
  const now = new Date().toISOString();
  const allowed = ['nombre', 'telefono', 'email', 'ciudad', 'servicio_interesado', 'motivo'] as const;
  const sets: string[] = [];
  const params: unknown[] = [];

  for (const field of allowed) {
    if (fields[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(fields[field]);
    }
  }
  if (sets.length === 0) return false;

  sets.push(`fecha_actualizacion = ?`);
  params.push(now);
  params.push(id, clinicId);

  const { meta } = await env.DB.prepare(
    `UPDATE leads SET ${sets.join(', ')} WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL`
  ).bind(...params).run();

  return meta.changes > 0;
}

export async function softDeleteLead(env: Env, id: number, clinicId: number) {
  const now = new Date().toISOString();
  const { meta } = await env.DB.prepare(`
    UPDATE leads SET deleted_at = ?, fecha_actualizacion = ?
    WHERE id = ? AND clinic_id = ? AND deleted_at IS NULL
  `).bind(now, now, id, clinicId).run();
  return meta.changes > 0;
}

export async function updateLeadEstado(env: Env, id: number, clinicId: number, estado: LeadEstado) {
  const now = new Date().toISOString();
  const { meta } = await env.DB.prepare(`
    UPDATE leads
    SET estado = ?, fecha_actualizacion = ?
    WHERE id = ? AND clinic_id = ?
  `).bind(estado, now, id, clinicId).run();

  return meta.changes > 0;
}

export async function getLeadStats(env: Env, clinicId: number) {
  const { results } = await env.DB.prepare(`
    SELECT estado, COUNT(*) as count
    FROM leads
    WHERE clinic_id = ? AND deleted_at IS NULL
    GROUP BY estado
  `).bind(clinicId).all();

  const stats: Record<string, number> = {};
  for (const r of results as Array<{ estado: string; count: number }>) {
    stats[r.estado] = r.count;
  }
  return stats;
}

export interface LeadAuditEntry {
  id: number;
  lead_id: number;
  accion: string;
  estado_anterior?: string | null;
  estado_nuevo?: string | null;
  usuario?: string | null;
  fecha: string;
}

export async function recordLeadAudit(env: Env, entry: {
  leadId: number;
  accion: string;
  estadoAnterior?: string | null;
  estadoNuevo?: string | null;
  usuarioId?: number | null;
  usuario?: string | null;
}) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO lead_audit (clinic_id, lead_id, accion, estado_anterior, estado_nuevo, usuario_id, usuario, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    1,
    entry.leadId,
    entry.accion,
    entry.estadoAnterior || null,
    entry.estadoNuevo || null,
    entry.usuarioId || null,
    entry.usuario || null,
    now,
  ).run();
}

export async function listLeadAudit(env: Env, leadId: number): Promise<LeadAuditEntry[]> {
  const { results } = await env.DB.prepare(`
    SELECT id, lead_id, accion, estado_anterior, estado_nuevo, usuario, fecha
    FROM lead_audit
    WHERE lead_id = ?
    ORDER BY fecha ASC
  `).bind(leadId).all();
  return (results || []) as unknown as LeadAuditEntry[];
}

export interface LeadNote {
  id: number;
  lead_id: number;
  note: string;
  usuario?: string | null;
  fecha: string;
}

export async function createLeadNote(env: Env, entry: {
  leadId: number;
  clinicId: number;
  note: string;
  usuarioId?: number | null;
  usuario?: string | null;
}) {
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO lead_notes (clinic_id, lead_id, note, usuario_id, usuario, fecha)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    entry.clinicId,
    entry.leadId,
    entry.note,
    entry.usuarioId || null,
    entry.usuario || null,
    now,
  ).run();
}

export async function listLeadNotes(env: Env, leadId: number, clinicId: number): Promise<LeadNote[]> {
  const { results } = await env.DB.prepare(`
    SELECT id, lead_id, note, usuario, fecha
    FROM lead_notes
    WHERE lead_id = ? AND clinic_id = ?
    ORDER BY fecha ASC
  `).bind(leadId, clinicId).all();
  return (results || []) as unknown as LeadNote[];
}
