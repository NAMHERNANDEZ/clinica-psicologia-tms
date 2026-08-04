import type { Env, Consent } from '../../types';

export async function findConsents(env: Env, clinicId: number): Promise<Consent[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM consents WHERE clinic_id = ? ORDER BY created_at DESC"
  ).bind(clinicId).all();
  return result.results as unknown as Consent[];
}

export async function findConsentsByPatient(env: Env, clinicId: number, patientId: number): Promise<Consent[]> {
  const result = await env.DB.prepare(
    "SELECT * FROM consents WHERE clinic_id = ? AND patient_id = ? ORDER BY created_at DESC"
  ).bind(clinicId, patientId).all();
  return result.results as unknown as Consent[];
}

export async function findConsentById(env: Env, clinicId: number, id: number): Promise<Consent | null> {
  const row = await env.DB.prepare(
    "SELECT * FROM consents WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return (row as unknown as Consent) || null;
}

export async function createConsent(env: Env, clinicId: number, data: { patient_id: number; type: string; document_hash: string; accepted_at: string; signature?: string; template_id?: number; version?: number }, ip: string): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO consents (clinic_id, patient_id, type, document_hash, accepted_at, ip, signature, template_id, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(clinicId, data.patient_id, data.type, data.document_hash, data.accepted_at, ip, data.signature || null, data.template_id || null, data.version || 1).run();
  return result.meta.last_row_id as number;
}

export async function findConsentSignatures(env: Env, consentId: number) {
  const result = await env.DB.prepare(
    "SELECT * FROM consent_signatures WHERE consent_id = ? ORDER BY signed_at DESC"
  ).bind(consentId).all();
  return result.results || [];
}

export async function findConsentVersions(env: Env, consentId: number) {
  const result = await env.DB.prepare(
    "SELECT * FROM consent_versions WHERE consent_id = ? ORDER BY version DESC"
  ).bind(consentId).all();
  return result.results || [];
}

export async function findTemplates(env: Env, clinicId: number, activeOnly: boolean) {
  const q = activeOnly
    ? "SELECT * FROM consent_templates WHERE clinic_id = ? AND is_active = 1 ORDER BY type, name"
    : "SELECT * FROM consent_templates WHERE clinic_id = ? ORDER BY type, name";
  const result = await env.DB.prepare(q).bind(clinicId).all();
  return result.results || [];
}

export async function findTemplateById(env: Env, clinicId: number, id: number) {
  const row = await env.DB.prepare(
    "SELECT * FROM consent_templates WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return row || null;
}

export async function createTemplate(env: Env, clinicId: number, data: { name: string; type: string; content: string; language?: string }, userId: number): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO consent_templates (clinic_id, name, type, content, language, version, is_active, updated_by) VALUES (?, ?, ?, ?, ?, 1, 1, ?)"
  ).bind(clinicId, data.name, data.type, data.content, data.language || 'es', userId).run();
  return result.meta.last_row_id as number;
}

export async function updateTemplate(env: Env, clinicId: number, id: number, data: { name?: string; content?: string; language?: string; is_active?: number }, userId: number): Promise<boolean> {
  const updates: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.content !== undefined) { updates.push('content = ?'); values.push(data.content); }
  if (data.language !== undefined) { updates.push('language = ?'); values.push(data.language); }
  if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active); }
  if (updates.length === 0) return false;
  updates.push('version = version + 1');
  updates.push('updated_at = datetime(\'now\')');
  updates.push('updated_by = ?');
  values.push(userId, id, clinicId);
  const result = await env.DB.prepare(
    `UPDATE consent_templates SET ${updates.join(', ')} WHERE id = ? AND clinic_id = ?`
  ).bind(...values).run();
  return (result.meta?.changes || 0) > 0;
}
