import type { ComplianceAlert, ComplianceRun, DashboardMetrics } from "../types";

export async function generateJsonReport(
  metrics: DashboardMetrics,
  alerts: ComplianceAlert[],
  runs: ComplianceRun[]
): Promise<string> {
  const report = {
    generated_at: new Date().toISOString(),
    dashboard: metrics,
    alerts,
    last_runs: runs,
  };
  return JSON.stringify(report, null, 2);
}

export async function generateCsvReport(alerts: ComplianceAlert[]): Promise<string> {
  const header = "id,rule_code,category,severity,patient_id,message,status,created_at,resolved_at\n";
  const rows = alerts
    .map(
      (a) =>
        `${a.id},"${a.ruleCode}","${a.category}","${a.severity}",${a.patientId || ""},"${a.message.replace(/"/g, '""')}",${a.status},"${a.createdAt}","${a.resolvedAt || ""}"`
    )
    .join("\n");
  return header + rows;
}