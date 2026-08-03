import type { PatientContext } from "./types";

export async function loadPatientContext(
  patientId: number,
  env: { DB: D1Database }
): Promise<PatientContext> {
  const consent = await env.DB
    .prepare("SELECT id FROM consents WHERE patient_id = ? AND accepted_at IS NOT NULL LIMIT 1")
    .bind(patientId)
    .first();

  const docConsent = await env.DB
    .prepare("SELECT id FROM documents WHERE patient_id = ? AND document_type = 'CONSENTIMIENTO_INFORMADO' AND status = 'SIGNED' LIMIT 1")
    .bind(patientId)
    .first();

  const record = await env.DB
    .prepare("SELECT id, reason_consultation, evaluation, diagnosis, treatment_plan FROM clinical_records WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(patientId)
    .first<{ id: number; reason_consultation: string | null; evaluation: string | null; diagnosis: string | null; treatment_plan: string | null }>();

  const note = await env.DB
    .prepare("SELECT id, subjective, objective, assessment, plan FROM session_notes WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(patientId)
    .first<{ id: number; subjective: string | null; objective: string | null; assessment: string | null; plan: string | null }>();

  const incidents = await env.DB
    .prepare("SELECT COUNT(*) as count FROM security_incidents WHERE resolved_at IS NULL")
    .first<{ count: number }>();

  return {
    patientId,
    consentExists: !!(consent || docConsent),
    latestRecord: record || null,
    latestNote: note || null,
    openIncidentCount: incidents?.count || 0,
  };
}