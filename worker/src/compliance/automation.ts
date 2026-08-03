import type { Env } from "../types";
import { ComplianceRepository } from "./repository/compliance-repository";
import { executeAllRules } from "./engine/rule-executor";
import { logComplianceEvent } from "./audit";

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function triggerCompliance(
  env: Env,
  patientId: number,
  correlationId?: string
): Promise<void> {
  const cid = correlationId || generateId();
  try {
    const repo = new ComplianceRepository(env);
    const results = await executeAllRules(patientId, env);
    const alerts = await repo.getAlertsByPatient(patientId);

    for (const result of results) {
      if (result.passed && result.ruleId) {
        await logComplianceEvent(env, "rule_passed", {
          patientId,
          ruleCode: result.ruleId,
          severity: result.severity,
          message: result.message,
          correlationId: cid,
          result: "SUCCESS",
        });
        const existing = alerts.find(
          (a: any) =>
            (a.rule_code || a.ruleCode) === result.ruleId &&
            a.status === "OPEN"
        );
        if (existing) {
          await repo.closeAlert(existing.id as number, undefined);
          await logComplianceEvent(env, "alert_resolved", {
            patientId,
            ruleCode: result.ruleId,
            alertId: existing.id as number,
            message: "Auto-resuelta por trigger de operacion clinica",
            correlationId: cid,
            result: "SUCCESS",
          });
        }
      }
    }

    await repo.saveRun({
      rulesExecuted: results.length,
      alertsCreated: results.filter((r: any) => !r.passed).length,
    });
  } catch (err) {
    console.error("Automation compliance error for patient", patientId, err);
  }
}