import type { ComplianceResult, PatientContext } from "../types";

export async function checkConsentExists(
  patientId: number,
  ctx: PatientContext
): Promise<ComplianceResult> {
  if (!ctx.consentExists) {
    return {
      passed: false,
      message: "Consentimiento informado firmado no encontrado",
      severity: "CRITICAL",
      patientId,
    };
  }

  return {
    passed: true,
    message: "Consentimiento informado v\u00e1lido",
    severity: "LOW",
    patientId,
  };
}