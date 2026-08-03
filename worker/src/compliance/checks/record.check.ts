import type { ComplianceResult, PatientContext } from "../types";

export async function checkClinicalRecordComplete(
  patientId: number,
  ctx: PatientContext
): Promise<ComplianceResult> {
  const record = ctx.latestRecord;

  if (!record) {
    return {
      passed: false,
      message: "Expediente cl\u00ednico no encontrado",
      severity: "HIGH",
      patientId,
    };
  }

  const missing: string[] = [];
  if (!record.reason_consultation) missing.push("motivo de consulta");
  if (!record.evaluation) missing.push("evaluaci\u00f3n inicial");
  if (!record.diagnosis) missing.push("diagn\u00f3stico");
  if (!record.treatment_plan) missing.push("plan terap\u00e9utico");

  if (missing.length > 0) {
    return {
      passed: false,
      message: `Expediente incompleto. Faltan: ${missing.join(", ")}`,
      severity: "HIGH",
      patientId,
      recordId: record.id,
    };
  }

  return {
    passed: true,
    message: "Expediente cl\u00ednico completo",
    severity: "LOW",
    patientId,
    recordId: record.id,
  };
}