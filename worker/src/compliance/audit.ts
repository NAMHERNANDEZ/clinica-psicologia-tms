import type { Env } from "../types";
import { logAudit } from "../lib/audit";

type ComplianceAction =
  | "alert_created"
  | "alert_resolved"
  | "rule_failed"
  | "rule_passed"
  | "compliance_run";

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function logComplianceEvent(
  env: Env,
  action: ComplianceAction,
  details: {
    clinicId?: number;
    ruleCode?: string;
    patientId?: number;
    alertId?: number;
    severity?: string;
    message?: string;
    correlationId?: string;
    result?: string;
  }
): Promise<void> {
  const correlationId = details.correlationId || generateId();
  const sev =
    details.severity === "CRITICAL"
      ? "critical"
      : details.severity === "HIGH"
        ? "warning"
        : "info";

  await logAudit(
    env,
    details.clinicId || 1,
    null,
    "compliance",
    action,
    details.ruleCode || "compliance",
    details.alertId || details.patientId || undefined,
    undefined,
    JSON.stringify(details),
    undefined,
    undefined,
    sev,
    { correlationId, result: details.result }
  );
}