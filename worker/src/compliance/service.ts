import type { ComplianceResult, DashboardMetrics } from "./types";
import type { Env } from "../types";
import { ComplianceRepository } from "./repository/compliance-repository";
import { executeAllRules } from "./engine/rule-executor";
import { logComplianceEvent } from "./audit";

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class ComplianceService {
  private repo: ComplianceRepository;
  private env: Env;

  constructor(env: Env) {
    this.repo = new ComplianceRepository(env);
    this.env = env;
  }

  async runForPatient(patientId: number): Promise<ComplianceResult[]> {
    const correlationId = generateId();
    const results = await executeAllRules(patientId, this.env);

    for (const result of results) {
      if (!result.passed) {
        const alertId = await this.repo.createAlert({
          ruleCode: result.ruleId || "error",
          category: "NOM",
          severity: result.severity,
          patientId: result.patientId,
          recordId: result.recordId,
          message: result.message,
        });
        logComplianceEvent(this.env, "alert_created", {
          patientId: result.patientId,
          ruleCode: result.ruleId,
          alertId,
          severity: result.severity,
          message: result.message,
          correlationId,
          result: "FAILURE",
        });
      } else {
        logComplianceEvent(this.env, "rule_passed", {
          patientId: result.patientId,
          ruleCode: result.ruleId,
          severity: result.severity,
          message: result.message,
          correlationId,
          result: "SUCCESS",
        });
      }
    }

    try {
      await this.repo.saveRun({
        rulesExecuted: results.length,
        alertsCreated: results.filter((r) => !r.passed).length,
      });
    } catch (e) {
      console.error("saveRun failed:", e);
    }

    return results;
  }

  async getAlerts(status?: string) {
    if (status) return this.repo.getAlertsByStatus(status);
    return this.repo.getAllAlerts();
  }

  async getAlertsForPatient(patientId: number) {
    return this.repo.getAlertsByPatient(patientId);
  }

  async closeAlert(alertId: number, resolvedBy?: number) {
    return this.repo.closeAlert(alertId, resolvedBy);
  }

  async getLastRun() {
    return this.repo.getLastRun();
  }
}