import type { Env } from '../../types';

export interface SecurityIncident {
  id: number;
  clinic_id: number;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  resolved_at: string | null;
}

export async function findIncidents(env: Env, clinicId: number): Promise<SecurityIncident[]> {
  const result = await env.DB.prepare(
    "SELECT id, clinic_id, type, description, severity, detected_at, resolved_at FROM security_incidents WHERE clinic_id = ? ORDER BY detected_at DESC"
  ).bind(clinicId).all();
  return result.results as unknown as SecurityIncident[];
}

export async function findIncidentById(env: Env, clinicId: number, id: number): Promise<SecurityIncident | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, type, description, severity, detected_at, resolved_at FROM security_incidents WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return (row as unknown as SecurityIncident) || null;
}

export async function createIncident(env: Env, clinicId: number, data: { type: string; description: string; severity: string }): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO security_incidents (clinic_id, type, description, severity) VALUES (?, ?, ?, ?)"
  ).bind(clinicId, data.type, data.description, data.severity).run();
  return result.meta.last_row_id as number;
}

export async function resolveIncident(env: Env, clinicId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "UPDATE security_incidents SET resolved_at = datetime('now') WHERE id = ? AND clinic_id = ? AND resolved_at IS NULL"
  ).bind(id, clinicId).run();
  return result.meta.changes > 0;
}

export async function deleteIncident(env: Env, clinicId: number, id: number): Promise<boolean> {
  const result = await env.DB.prepare(
    "DELETE FROM security_incidents WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).run();
  return result.meta.changes > 0;
}