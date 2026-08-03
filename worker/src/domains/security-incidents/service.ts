import type { Env } from '../../types';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';

export async function listIncidents(env: Env, clinicId: number) {
  const incidents = await repo.findIncidents(env, clinicId);
  return { success: true, data: { incidents } };
}

export async function getIncident(env: Env, clinicId: number, id: number) {
  const incident = await repo.findIncidentById(env, clinicId, id);
  if (!incident) return { success: false, error: 'Incidente no encontrado', status: 404 };
  return { success: true, data: { incident } };
}

export async function createIncident(env: Env, clinicId: number, data: { type: string; description: string; severity: string }, userId?: number, ip?: string, userAgent?: string) {
  const id = await repo.createIncident(env, clinicId, data);
  await logAudit(env, clinicId, userId || null, 'security', 'create', 'security_incidents', id, undefined, JSON.stringify(data), ip, userAgent, 'warning');
  return { success: true, data: { id } };
}

export async function resolveIncident(env: Env, clinicId: number, id: number) {
  const success = await repo.resolveIncident(env, clinicId, id);
  if (!success) return { success: false, error: 'Incidente no encontrado', status: 404 };
  await logAudit(env, clinicId, null, 'security', 'resolve', 'security_incidents', id, undefined, undefined, undefined, undefined, 'info');
  return { success: true, data: null };
}

export async function deleteIncident(env: Env, clinicId: number, id: number) {
  const success = await repo.deleteIncident(env, clinicId, id);
  if (!success) return { success: false, error: 'Incidente no encontrado', status: 404 };
  return { success: true, data: null };
}