import type { ComplianceResult, PatientContext } from "../types";

export async function checkQualityMetrics(
  patientId: number,
  ctx: PatientContext
): Promise<ComplianceResult> {
  if (!ctx.latestRecord) {
    return {
      passed: false,
      message: "Sin expediente cl\u00ednico para evaluar calidad",
      severity: "MEDIUM",
      patientId,
    };
  }

  if (!ctx.latestNote) {
    return {
      passed: false,
      message: "Paciente sin notas de sesi\u00f3n registradas",
      severity: "MEDIUM",
      patientId,
      recordId: ctx.latestRecord.id,
    };
  }

  return {
    passed: true,
    message: `Paciente con nota(s) de sesi\u00f3n registrada(s)`,
    severity: "LOW",
    patientId,
    recordId: ctx.latestRecord.id,
  };
}