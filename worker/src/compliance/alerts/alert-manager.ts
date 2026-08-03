import type { ComplianceAlert, Severity } from "../types";

export interface AlertManager {
  createAlert(ruleCode: string, category: string, severity: Severity, patientId: number | undefined, recordId: number | undefined, message: string): Promise<number>;
  closeAlert(alertId: number, resolvedBy?: number): Promise<void>;
  getOpenAlerts(): Promise<ComplianceAlert[]>;
  getAlertsByStatus(status: string): Promise<ComplianceAlert[]>;
  getAlertsByPatient(patientId: number): Promise<ComplianceAlert[]>;
  getAllAlerts(): Promise<ComplianceAlert[]>;
}

export function createAlertManager(env: { DB: D1Database }): AlertManager {
  return {
    async createAlert(ruleCode, category, severity, patientId, recordId, message) {
      const existing = await findOpenAlert(env, ruleCode, patientId);
      if (existing) {
        await updateAlert(env, existing.id, message);
        return existing.id;
      }
      const result = await env.DB
        .prepare(
          `INSERT INTO compliance_alerts (rule_code, category, severity, patient_id, record_id, message, status) VALUES (?, ?, ?, ?, ?, ?, 'OPEN')`
        )
        .bind(ruleCode, category, severity, patientId || null, recordId || null, message)
        .run();
      return result.meta.last_row_id as number;
    },

    async closeAlert(alertId, resolvedBy) {
      await env.DB
        .prepare(
          `UPDATE compliance_alerts SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE id = ?`
        )
        .bind(resolvedBy || null, alertId)
        .run();
    },

    async getOpenAlerts() {
      const result = await env.DB
        .prepare("SELECT * FROM compliance_alerts WHERE status = 'OPEN' ORDER BY CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END, created_at DESC")
        .all();
      return (result.results || []) as unknown as ComplianceAlert[];
    },

    async getAlertsByStatus(status: string) {
      const result = await env.DB
        .prepare("SELECT * FROM compliance_alerts WHERE status = ? ORDER BY created_at DESC")
        .bind(status)
        .all();
      return (result.results || []) as unknown as ComplianceAlert[];
    },

    async getAlertsByPatient(patientId: number) {
      const result = await env.DB
        .prepare("SELECT * FROM compliance_alerts WHERE patient_id = ? ORDER BY created_at DESC")
        .bind(patientId)
        .all();
      return (result.results || []) as unknown as ComplianceAlert[];
    },

    async getAllAlerts() {
      const result = await env.DB
        .prepare("SELECT * FROM compliance_alerts ORDER BY created_at DESC LIMIT 100")
        .all();
      return (result.results || []) as unknown as ComplianceAlert[];
    },
  };
}

async function findOpenAlert(env: { DB: D1Database }, ruleCode: string, patientId: number | undefined): Promise<ComplianceAlert | null> {
  if (patientId) {
    const row = await env.DB
      .prepare("SELECT * FROM compliance_alerts WHERE rule_code = ? AND patient_id = ? AND status = 'OPEN'")
      .bind(ruleCode, patientId)
      .first();
    return (row as unknown as ComplianceAlert) || null;
  }
  const row = await env.DB
    .prepare("SELECT * FROM compliance_alerts WHERE rule_code = ? AND status = 'OPEN'")
    .bind(ruleCode)
    .first();
  return (row as unknown as ComplianceAlert) || null;
}

async function updateAlert(env: { DB: D1Database }, alertId: number, message: string): Promise<void> {
  await env.DB
    .prepare("UPDATE compliance_alerts SET message = ? WHERE id = ?")
    .bind(message, alertId)
    .run();
}