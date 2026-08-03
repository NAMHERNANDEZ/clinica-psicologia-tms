import type { ComplianceResult, PatientContext } from "../types";

export async function checkSecurityReview(
  patientId: number,
  ctx: PatientContext
): Promise<ComplianceResult> {
  if (ctx.openIncidentCount > 0) {
    return {
      passed: false,
      message: `Hay ${ctx.openIncidentCount} incidentes de seguridad sin resolver`,
      severity: "HIGH",
      patientId,
    };
  }

  return {
    passed: true,
    message: "Sin incidentes de seguridad abiertos",
    severity: "LOW",
    patientId,
  };
}