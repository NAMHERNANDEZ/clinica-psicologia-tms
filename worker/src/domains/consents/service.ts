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

export async function createConsent(env: Env, clinicId: number, data: { patient_id: number; type: string; document_hash: string; accepted_at: string; signature?: string }, ip: string) {
  const id = await repo.createConsent(env, clinicId, data, ip);
  await logAudit(env, clinicId, null, 'clinical', 'create', 'consents', id, undefined, JSON.stringify(data), ip, undefined, 'info');
  triggerCompliance(env, data.patient_id);
  return { success: true, data: { id } };
}