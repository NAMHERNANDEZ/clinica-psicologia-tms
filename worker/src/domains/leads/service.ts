import type { Env } from '../../types';
import * as repository from './repository';
import type { LeadEstado } from './repository';

export async function createLead(
  env: Env,
  data: { nombre?: string; telefono?: string; email?: string; ciudad?: string; servicio_interesado?: string; motivo?: string; origen?: string; clinic_id?: number }
) {
  const id = await repository.createLead(env, {
    nombre: data.nombre,
    telefono: data.telefono,
    email: data.email,
    ciudad: data.ciudad,
    servicio_interesado: data.servicio_interesado,
    motivo: data.motivo,
    origen: data.origen,
    clinic_id: data.clinic_id,
  });
  return { id };
}

export async function listLeads(env: Env, clinicId: number, estado?: string, origen?: string, search?: string) {
  return repository.listLeads(env, clinicId, estado, origen, search);
}

export async function getLead(env: Env, id: number, clinicId: number) {
  return repository.getLead(env, id, clinicId);
}

export async function updateLead(
  env: Env,
  id: number,
  clinicId: number,
  fields: Record<string, unknown>,
  actor?: { id?: number; email?: string }
) {
  const lead = await repository.getLead(env, id, clinicId);
  if (!lead) return { updated: false };

  const trimmed: Record<string, unknown> = {};
  for (const k of ['nombre', 'telefono', 'email', 'ciudad', 'servicio_interesado', 'motivo'] as const) {
    if (fields[k] !== undefined) {
      trimmed[k] = typeof fields[k] === 'string' && fields[k] === '' ? null : fields[k];
    }
  }

  const updated = await repository.updateLead(env, id, clinicId, trimmed);
  if (updated) {
    await repository.recordLeadAudit(env, {
      leadId: id,
      accion: 'edicion_datos',
      usuarioId: actor?.id ?? null,
      usuario: actor?.email ?? null,
    });
  }
  return { updated };
}

export async function updateLeadEstado(
  env: Env,
  id: number,
  clinicId: number,
  estado: LeadEstado,
  actor?: { id?: number; email?: string }
) {
  const lead = await repository.getLead(env, id, clinicId);
  if (!lead) return { updated: false };

  const estadoAnterior = (lead.estado as LeadEstado) || null;
  const updated = await repository.updateLeadEstado(env, id, clinicId, estado);
  if (updated) {
    await repository.recordLeadAudit(env, {
      leadId: id,
      accion: 'cambio_estado',
      estadoAnterior,
      estadoNuevo: estado,
      usuarioId: actor?.id ?? null,
      usuario: actor?.email ?? null,
    });
  }
  return { updated };
}

export async function softDeleteLead(
  env: Env,
  id: number,
  clinicId: number,
  actor?: { id?: number; email?: string }
) {
  const lead = await repository.getLead(env, id, clinicId);
  if (!lead || lead.deleted_at) return { deleted: false };

  const deleted = await repository.softDeleteLead(env, id, clinicId);
  if (deleted) {
    await repository.recordLeadAudit(env, {
      leadId: id,
      accion: 'eliminacion',
      estadoAnterior: (lead.estado as LeadEstado) || null,
      usuarioId: actor?.id ?? null,
      usuario: actor?.email ?? null,
    });
  }
  return { deleted };
}

export async function getLeadAudit(env: Env, id: number, clinicId: number) {
  return repository.listLeadAudit(env, id);
}

export async function getLeadNotes(env: Env, id: number, clinicId: number) {
  return repository.listLeadNotes(env, id, clinicId);
}

export async function addLeadNote(
  env: Env,
  id: number,
  clinicId: number,
  note: string,
  actor?: { id?: number; email?: string }
) {
  const lead = await repository.getLead(env, id, clinicId);
  if (!lead || lead.deleted_at) return { added: false };

  await repository.createLeadNote(env, {
    leadId: id,
    clinicId,
    note,
    usuarioId: actor?.id ?? null,
    usuario: actor?.email ?? null,
  });
  await repository.recordLeadAudit(env, {
    leadId: id,
    accion: 'nota',
    usuarioId: actor?.id ?? null,
    usuario: actor?.email ?? null,
  });
  return { added: true };
}

export async function getLeadStats(env: Env, clinicId: number) {
  return repository.getLeadStats(env, clinicId);
}