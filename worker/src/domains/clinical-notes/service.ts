import type { Env } from '../../types';
import type { ClinicalNoteInput } from './validators';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';
import { triggerCompliance } from '../../compliance/automation';

export async function getPatientNotes(env: Env, patientId: number) {
  const notes = await repo.findNotesByPatient(env, patientId);
  return { success: true, data: { notes } };
}

export async function getClinicNotes(env: Env, clinicId: number) {
  const notes = await repo.findNotesByClinic(env, clinicId);
  return { success: true, data: { notes } };
}

export async function createNote(env: Env, clinicId: number, userId: number, data: ClinicalNoteInput, ip: string) {
  const noteId = await repo.createNote(env, clinicId, { ...data, therapist_id: userId });

  // Guardar version inicial
  await env.DB.prepare(
    'INSERT INTO note_versions (note_id, version, content, changed_by, change_reason) VALUES (?, 1, ?, ?, ?)'
  ).bind(noteId, JSON.stringify(data), userId, 'creacion').run();

  // Registrar firma de creacion
  await env.DB.prepare(
    'INSERT INTO note_signatures (note_id, user_id, user_email, user_role, signature_type, ip) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(
    noteId, userId, '', '', 'create', ip
  ).run();

  // Auditoria detallada
  await logNoteAudit(env, clinicId, noteId, userId, 'create', null, JSON.stringify(data), ip, null);

  await logAudit(env, clinicId, userId, 'clinical', 'create', 'clinical_notes', noteId, undefined, JSON.stringify(data), ip, undefined, 'info');
  triggerCompliance(env, data.patient_id);
  return { success: true, data: { id: noteId } };
}

export async function updateNote(env: Env, clinicId: number, noteId: number, userId: number, data: Partial<ClinicalNoteInput>, ip: string) {
  try {
  // Get existing note
  const existing = await env.DB.prepare(
    'SELECT * FROM clinical_notes WHERE id = ? AND clinic_id = ?'
  ).bind(noteId, clinicId).first() as {
    id: number;
    version: number;
    is_locked?: number;
    signed_at?: string;
    cosigned?: number;
    status?: string;
  } | null;

  if (!existing) {
    return { success: false, error: 'Nota no encontrada', status: 404 };
  }

  // Check if locked
  if (existing.is_locked) {
    return { success: false, error: 'Nota bloqueada, no se puede modificar', status: 403 };
  }

  // Build update
  const updates: string[] = [];
  const values: any[] = [];

  if (data.note !== undefined) { updates.push('note = ?'); values.push(data.note); }
  if (data.note_type !== undefined) { updates.push('note_type = ?'); values.push(data.note_type); }
  if (data.template_type !== undefined) { updates.push('template_type = ?'); values.push(data.template_type); }
  if (data.risk_level !== undefined) { updates.push('risk_level = ?'); values.push(data.risk_level); }
  if (data.fields_json !== undefined) { updates.push('fields_json = ?'); values.push(data.fields_json); }
  if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

  if (updates.length === 0) {
    return { success: false, error: 'Sin cambios', status: 400 };
  }

  const newVersion = (existing.version || 1) + 1;
  updates.push('version = ?');
  values.push(newVersion);
  updates.push('updated_at = datetime(\'now\')');

  await env.DB.prepare(
    `UPDATE clinical_notes SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values, noteId).run();

  // Guardar version
  await env.DB.prepare(
    'INSERT INTO note_versions (note_id, version, content, changed_by, change_reason) VALUES (?, ?, ?, ?, ?)'
  ).bind(noteId, newVersion, JSON.stringify(data), userId, 'actualizacion').run();

  // Auditoria detallada
  await logNoteAudit(env, clinicId, noteId, userId, 'update', JSON.stringify(existing), JSON.stringify({ ...existing, ...data }), ip, null);

  return { success: true, data: { id: noteId, version: newVersion } };
  } catch (e) {
    console.error('updateNote error:', e, (e as Error).stack);
    throw e;
  }
}

export async function lockNote(env: Env, clinicId: number, noteId: number, userId: number, ip: string) {
  try {
  const existing = await env.DB.prepare(
    'SELECT * FROM clinical_notes WHERE id = ? AND clinic_id = ?'
  ).bind(noteId, clinicId).first();

  if (!existing) {
    return { success: false, error: 'Nota no encontrada', status: 404 };
  }

  await env.DB.prepare(
    'UPDATE clinical_notes SET is_locked = 1, locked_at = datetime(\'now\'), locked_by = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(userId, noteId).run();

  await logNoteAudit(env, clinicId, noteId, userId, 'lock', null, null, ip, null);
  return { success: true, data: { id: noteId, is_locked: 1 } };
  } catch (e) {
    console.error('lockNote error:', e, (e as Error).stack);
    throw e;
  }
}

export async function unlockNote(env: Env, clinicId: number, noteId: number, userId: number, ip: string) {
  const existing = await env.DB.prepare(
    'SELECT * FROM clinical_notes WHERE id = ? AND clinic_id = ? AND is_locked = 1'
  ).bind(noteId, clinicId).first();

  if (!existing) {
    return { success: false, error: 'Nota no encontrada o no bloqueada', status: 404 };
  }

  await env.DB.prepare(
    'UPDATE clinical_notes SET is_locked = 0, locked_at = NULL, locked_by = NULL, status = \'draft\', updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(noteId).run();

  await logNoteAudit(env, clinicId, noteId, userId, 'unlock', null, null, ip, null);
  return { success: true, data: { id: noteId, is_locked: 0 } };
}

export async function signNote(env: Env, clinicId: number, noteId: number, userId: number, ip: string) {
  const existing = await env.DB.prepare(
    'SELECT * FROM clinical_notes WHERE id = ? AND clinic_id = ?'
  ).bind(noteId, clinicId).first();

  if (!existing) {
    return { success: false, error: 'Nota no encontrada', status: 404 };
  }

  const signatureHash = btoa(`${noteId}-${userId}-${Date.now()}`);

  await env.DB.prepare(
    'UPDATE clinical_notes SET signed_at = datetime(\'now\'), signed_by = ?, status = \'final\', signature_hash = ?, is_locked = 1, locked_at = datetime(\'now\'), locked_by = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(userId, signatureHash, userId, noteId).run();

  await logNoteAudit(env, clinicId, noteId, userId, 'sign', null, null, ip, signatureHash);
  return { success: true, data: { id: noteId, signed_at: new Date().toISOString(), signature_hash: signatureHash } };
}

export async function cosignNote(env: Env, clinicId: number, noteId: number, userId: number, userRole: string, ip: string) {
  const existing = await env.DB.prepare(
    'SELECT * FROM clinical_notes WHERE id = ? AND clinic_id = ?'
  ).bind(noteId, clinicId).first();

  if (!existing) {
    return { success: false, error: 'Nota no encontrada', status: 404 };
  }

  if (!existing.signed_at) {
    return { success: false, error: 'Nota debe estar firmada antes de cofirmar', status: 400 };
  }

  if (existing.cosigned_by) {
    return { success: false, error: 'Nota ya cofirmada', status: 400 };
  }

  await env.DB.prepare(
    'UPDATE clinical_notes SET cosigned_by = ?, cosigned_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?'
  ).bind(userId, noteId).run();

  await logNoteAudit(env, clinicId, noteId, userId, 'cosign', null, null, ip, null);
  return { success: true, data: { id: noteId, cosigned_by: userId, cosigned_at: new Date().toISOString() } };
}

export async function getNoteVersions(env: Env, clinicId: number, noteId: number) {
  const versions = await env.DB.prepare(
    'SELECT v.*, u.email as changed_by_email FROM note_versions v LEFT JOIN users u ON v.changed_by = u.id WHERE v.note_id = ? ORDER BY v.version DESC'
  ).bind(noteId).all();
  return { success: true, data: { versions: versions.results || [] } };
}

export async function getNoteAudit(env: Env, clinicId: number, noteId: number) {
  const audit = await env.DB.prepare(
    'SELECT * FROM note_audit WHERE note_id = ? ORDER BY created_at DESC'
  ).bind(noteId).all();
  return { success: true, data: { audit: audit.results || [] } };
}

export async function getNoteTemplates(env: Env, clinicId: number) {
  const templates = await env.DB.prepare(
    'SELECT * FROM note_templates WHERE clinic_id = ? AND is_active = 1 ORDER BY name'
  ).bind(clinicId).all();
  return { success: true, data: { templates: templates.results || [] } };
}

export async function deleteNote(env: Env, id: number) {
  const deleted = await repo.deleteNote(env, id);
  if (!deleted) return { success: false, error: 'Nota no encontrada', status: 404 };
  return { success: true, data: null };
}

async function logNoteAudit(
  env: Env,
  clinicId: number,
  noteId: number,
  userId: number,
  action: string,
  oldValue: string | null,
  newValue: string | null,
  ip: string,
  details: string | null
) {
  await env.DB.prepare(
    'INSERT INTO note_audit (note_id, user_id, action, old_value, new_value, ip, details) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(noteId, userId, action, oldValue, newValue, ip, details).run();
}
