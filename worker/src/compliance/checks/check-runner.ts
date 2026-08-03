import type { ComplianceRule, ComplianceResult, PatientContext } from "../types";
import { checkConsentExists } from "./consent.check";
import { checkClinicalRecordComplete } from "./record.check";
import { checkSessionNoteComplete } from "./session.check";
import { checkSecurityReview } from "./security.check";
import { checkQualityMetrics } from "./quality.check";

export async function executeCheck(
  rule: ComplianceRule,
  patientId: number,
  ctx: PatientContext
): Promise<ComplianceResult> {
  switch (rule.check_type) {
    case "CHECK_EXISTS":
      return checkConsentExists(patientId, ctx);
    case "CHECK_REQUIRED":
      return checkClinicalRecordComplete(patientId, ctx);
    case "CHECK_NOT_EMPTY":
      return checkSessionNoteComplete(patientId, ctx);
    case "CHECK_DATE":
      return checkSecurityReview(patientId, ctx);
    case "CHECK_BOOL":
      return checkQualityMetrics(patientId, ctx);
    case "CHECK_MAX":
      return checkQualityMetrics(patientId, ctx);
    default:
      return {
        passed: true,
        message: `Check type ${rule.check_type} not implemented`,
        severity: "LOW",
      };
  }
}