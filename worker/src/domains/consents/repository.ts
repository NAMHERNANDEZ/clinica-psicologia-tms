import type { Env, Consent } from '../../types';

export async function findConsents(env: Env, clinicId: number): Promise<Consent[]> {
  const result = await env.DB.prepare(
    "SELECT id, clinic_id, patient_id, type, document_hash, accepted_at, ip, signature, created_at FROM consents WHERE clinic_id = ? ORDER BY created_at DESC"
  ).bind(clinicId).all();
  return result.results as unknown as Consent[];
}

export async function findConsentsByPatient(env: Env, clinicId: number, patientId: number): Promise<Consent[]> {
  const result = await env.DB.prepare(
    "SELECT id, clinic_id, patient_id, type, document_hash, accepted_at, ip, signature, created_at FROM consents WHERE clinic_id = ? AND patient_id = ? ORDER BY created_at DESC"
  ).bind(clinicId, patientId).all();
  return result.results as unknown as Consent[];
}

export async function findConsentById(env: Env, clinicId: number, id: number): Promise<Consent | null> {
  const row = await env.DB.prepare(
    "SELECT id, clinic_id, patient_id, type, document_hash, accepted_at, ip, signature, created_at FROM consents WHERE id = ? AND clinic_id = ?"
  ).bind(id, clinicId).first();
  return (row as unknown as Consent) || null;
}

export async function createConsent(env: Env, clinicId: number, data: { patient_id: number; type: string; document_hash: string; accepted_at: string; signature?: string }, ip: string): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO consents (clinic_id, patient_id, type, document_hash, accepted_at, ip, signature) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(clinicId, data.patient_id, data.type, data.document_hash, data.accepted_at, ip, data.signature || null).run();
  return result.meta.last_row_id as number;
}