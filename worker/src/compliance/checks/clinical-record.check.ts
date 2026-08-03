import type { ComplianceResult } from "../types";

export async function checkClinicalRecord(
  patientId: number,
  env: { DB: D1Database }
): Promise<ComplianceResult> {
  const record = await env.DB
    .prepare(
      `SELECT id, reason_consultation, history, evaluation, diagnosis, treatment_plan FROM clinical_records WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .bind(patientId)
    .first<{
      id: number;
      reason_consultation: string;
      history: string;
      evaluation: string;
      diagnosis: string;
      treatment_plan: string;
    }>();

  if (!record) {
    return {
      passed: false,
      message: "Expediente clínico sin registro",
      severity: "HIGH",
    };
  }

  const missing: string[] = [];
  if (!record.reason_consultation) missing.push("motivo de consulta");
  if (!record.evaluation) missing.push("evaluación inicial");
  if (!record.diagnosis) missing.push("diagnóstico");
  if (!record.treatment_plan) missing.push("plan terapéutico");

  if (missing.length > 0) {
    return {
      passed: false,
      message: `Expediente incompleto. Falta: ${missing.join(", ")}`,
      severity: "HIGH",
    };
  }

  return {
    passed: true,
    message: "Expediente clínico completo",
    severity: "LOW",
  };
}