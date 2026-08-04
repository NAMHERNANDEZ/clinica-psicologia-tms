import type { Env } from '../../types';
import * as repo from './repository';
import { logAudit } from '../../lib/audit';
import { triggerCompliance } from '../../compliance/automation';

export async function listConsents(env: Env, clinicId: number, patientId: number) {
  const consents = patientId > 0
    ? await repo.findConsentsByPatient(env, clinicId, patientId)
    : await repo.findConsents(env, clinicId);
  return { success: true, data: { consents } };
}

export async function getConsent(env: Env, clinicId: number, id: number) {
  const consent = await repo.findConsentById(env, clinicId, id);
  if (!consent) return { success: false, error: 'Consentimiento no encontrado', status: 404 };
  return { success: true, data: { consent } };
}

export async function createConsent(env: Env, clinicId: number, data: { patient_id: number; type: string; document_hash: string; accepted_at: string; signature?: string; template_id?: number; version?: number }, ip: string, userId: number) {
  const id = await repo.createConsent(env, clinicId, data, ip);
  await logAudit(env, clinicId, userId, 'clinical', 'create', 'consents', id, undefined, JSON.stringify(data), ip, undefined, 'info');
  triggerCompliance(env, data.patient_id);
  return { success: true, data: { id } };
}

export async function signConsent(env: Env, clinicId: number, id: number, userId: number, userEmail: string, userRole: string, data: { signer_type?: string; signer_name: string; signature_hash: string; ip?: string; user_agent?: string; metadata_json?: string }, ip: string) {
  const existing = await repo.findConsentById(env, clinicId, id);
  if (!existing) return { success: false, error: 'Consentimiento no encontrado', status: 404 };
  if (existing.lifecycle === 'revoked') return { success: false, error: 'Consentimiento revocado', status: 400 };

  await env.DB.prepare(
    `INSERT INTO consent_signatures (clinic_id, consent_id, signer_type, signer_name, signer_user_id, signature_hash, signed_at, ip_address, user_agent, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?)`
  ).bind(clinicId, id, data.signer_type || 'patient', data.signer_name, userId, data.signature_hash, data.ip || ip, data.user_agent || null, data.metadata_json || null).run();

  await env.DB.prepare(
    `UPDATE consents SET lifecycle = 'signed', signed_at = datetime('now'), signed_by = ?, signed_by_name = ?, signer_type = ?, signature_hash = ?, user_agent = ?, metadata_json = ?, is_active = 1, updated_by = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(userId, data.signer_name, data.signer_type || 'patient', data.signature_hash, data.user_agent || null, data.metadata_json || null, userId, id).run();

  await logAudit(env, clinicId, userId, 'clinical', 'sign', 'consents', id, undefined, JSON.stringify(data), ip, data.user_agent, 'info');
  return { success: true, data: { id, signed_at: new Date().toISOString() } };
}

export async function revokeConsent(env: Env, clinicId: number, id: number, userId: number, data: { reason?: string }, ip: string) {
  const existing = await repo.findConsentById(env, clinicId, id);
  if (!existing) return { success: false, error: 'Consentimiento no encontrado', status: 404 };
  if (existing.lifecycle === 'revoked') return { success: false, error: 'Ya revocado', status: 400 };

  const reason = data.reason || 'Sin motivo especificado';
  await env.DB.prepare(
    `UPDATE consents SET lifecycle = 'revoked', status = 'revoked', revoked_at = datetime('now'), revoked_by = ?, revoked_reason = ?, is_active = 0, updated_by = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(userId, reason, userId, id).run();

  await logAudit(env, clinicId, userId, 'clinical', 'revoke', 'consents', id, undefined, JSON.stringify({ reason }), ip, undefined, 'warn');
  return { success: true, data: { id, status: 'revoked', reason } };
}

export async function getConsentSignatures(env: Env, clinicId: number, id: number) {
  const consent = await repo.findConsentById(env, clinicId, id);
  if (!consent) return { success: false, error: 'Consentimiento no encontrado', status: 404 };
  const signatures = await repo.findConsentSignatures(env, id);
  return { success: true, data: { signatures } };
}

export async function getConsentVersions(env: Env, clinicId: number, id: number) {
  const consent = await repo.findConsentById(env, clinicId, id);
  if (!consent) return { success: false, error: 'Consentimiento no encontrado', status: 404 };
  const versions = await repo.findConsentVersions(env, id);
  return { success: true, data: { versions } };
}

export async function listTemplates(env: Env, clinicId: number, activeOnly: boolean) {
  const templates = await repo.findTemplates(env, clinicId, activeOnly);
  return { success: true, data: { templates } };
}

export async function createTemplate(env: Env, clinicId: number, data: { name: string; type: string; content: string; language?: string }, userId: number, ip: string) {
  const id = await repo.createTemplate(env, clinicId, data, userId);
  await logAudit(env, clinicId, userId, 'clinical', 'create', 'consent_templates', id, undefined, JSON.stringify(data), ip, undefined, 'info');
  return { success: true, data: { id } };
}

export async function updateTemplate(env: Env, clinicId: number, id: number, data: { name?: string; content?: string; language?: string; is_active?: number }, userId: number, ip: string) {
  const ok = await repo.updateTemplate(env, clinicId, id, data, userId);
  if (!ok) return { success: false, error: 'Plantilla no encontrada', status: 404 };
  await logAudit(env, clinicId, userId, 'clinical', 'update', 'consent_templates', id, undefined, JSON.stringify(data), ip, undefined, 'info');
  return { success: true, data: { id } };
}