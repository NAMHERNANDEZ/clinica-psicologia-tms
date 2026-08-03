import type { ComplianceAlert, ComplianceRun, DashboardMetrics, ComplianceResult, ComplianceRule } from "../types";

export class ComplianceRepository {
  constructor(private env: { DB: D1Database }) {}

async loadRules(): Promise<ComplianceRule[]> {
    const result = await this.env.DB
      .prepare("SELECT id, code, name, category, severity, check_type, enabled, version, description, effective_from, effective_to, created_at FROM compliance_rules")
      .all();
    return (result.results || []) as unknown as ComplianceRule[];
  }

  async getActiveRules(): Promise<ComplianceRule[]> {
    const result = await this.env.DB
      .prepare("SELECT id, code, name, category, severity, check_type, enabled, version, description, effective_from, effective_to, created_at FROM compliance_rules WHERE enabled = 1")
      .all();
    return (result.results || []) as unknown as ComplianceRule[];
  }

  async getRuleByCode(code: string): Promise<ComplianceRule | null> {
    const row = await this.env.DB
      .prepare("SELECT id, code, name, category, severity, check_type, enabled, version, description, effective_from, effective_to, created_at FROM compliance_rules WHERE code = ?")
      .bind(code)
      .first();
    return (row as unknown as ComplianceRule) || null;
  }

  async saveRule(rule: ComplianceRule): Promise<void> {
    await this.env.DB
      .prepare(
        `INSERT OR REPLACE INTO compliance_rules
         (id, code, name, category, severity, check_type, enabled, version, description, effective_from, effective_to)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        rule.id,
        rule.code,
        rule.name,
        rule.category,
        rule.severity,
        rule.check_type,
        rule.enabled ? 1 : 0,
        rule.version || 'v1.0',
        rule.description || null,
        rule.effective_from || new Date().toISOString(),
        rule.effective_to || null
      )
      .bind(
        rule.id,
        rule.code,
        rule.name,
        rule.category,
        rule.severity,
        rule.check_type,
        rule.enabled ? 1 : 0
      )
      .run();
  }

  async createAlert(alert: {
    ruleCode: string;
    category: string;
    severity: string;
    patientId?: number;
    recordId?: number;
    message: string;
  }): Promise<number> {
    const existing = await this.findOpenAlert(alert.ruleCode, alert.patientId);
    if (existing) {
      await this.updateAlert(existing.id, alert.message);
      return existing.id;
    }
    const result = await this.env.DB
      .prepare(
        `INSERT INTO compliance_alerts
         (rule_code, category, severity, patient_id, record_id, message, status)
         VALUES (?, ?, ?, ?, ?, ?, 'OPEN')`
      )
      .bind(
        alert.ruleCode,
        alert.category,
        alert.severity,
        alert.patientId || null,
        alert.recordId || null,
        alert.message
      )
      .run();
    return result.meta.last_row_id as number;
  }

  async closeAlert(alertId: number, resolvedBy?: number): Promise<void> {
    await this.env.DB
      .prepare(
        `UPDATE compliance_alerts SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP, resolved_by = ? WHERE id = ?`
      )
      .bind(resolvedBy || null, alertId)
      .run();
  }

  async getOpenAlerts(): Promise<ComplianceAlert[]> {
    const result = await this.env.DB
      .prepare("SELECT * FROM compliance_alerts WHERE status = 'OPEN' ORDER BY severity DESC, created_at DESC")
      .all();
    return (result.results || []) as unknown as ComplianceAlert[];
  }

  async getAlertsByStatus(status: string): Promise<ComplianceAlert[]> {
    const result = await this.env.DB
      .prepare("SELECT * FROM compliance_alerts WHERE status = ? ORDER BY created_at DESC")
      .bind(status)
      .all();
    return (result.results || []) as unknown as ComplianceAlert[];
  }

  async getAlertsByPatient(patientId: number): Promise<ComplianceAlert[]> {
    const result = await this.env.DB
      .prepare("SELECT * FROM compliance_alerts WHERE patient_id = ? ORDER BY created_at DESC")
      .bind(patientId)
      .all();
    return (result.results || []) as unknown as ComplianceAlert[];
  }

  async getAllAlerts(): Promise<ComplianceAlert[]> {
    const result = await this.env.DB
      .prepare("SELECT * FROM compliance_alerts ORDER BY created_at DESC LIMIT 100")
      .all();
    return (result.results || []) as unknown as ComplianceAlert[];
  }

  async saveRun(run: { rulesExecuted: number; alertsCreated: number; score?: number }): Promise<number> {
    const result = await this.env.DB
      .prepare(
        `INSERT INTO compliance_runs (started_at, finished_at, rules_executed, alerts_created, score)
         VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?)`
      )
      .bind(run.rulesExecuted, run.alertsCreated, run.score || null)
      .run();
    return result.meta.last_row_id as number;
  }

  async getLastRun(): Promise<ComplianceRun | null> {
    const row = await this.env.DB
      .prepare("SELECT * FROM compliance_runs ORDER BY id DESC LIMIT 1")
      .first();
    return (row as unknown as ComplianceRun) || null;
  }

  async getRuns(): Promise<ComplianceRun[]> {
    const result = await this.env.DB
      .prepare("SELECT * FROM compliance_runs ORDER BY id DESC LIMIT 20")
      .all();
    return (result.results || []) as unknown as ComplianceRun[];
  }

  async getDashboardMetrics(clinicId: number): Promise<DashboardMetrics> {
    const openAlerts = await this.env.DB
      .prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN'")
      .first<{ count: number }>();

    const criticalAlerts = await this.env.DB
      .prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN' AND severity = 'CRITICAL'")
      .first<{ count: number }>();

    const highAlerts = await this.env.DB
      .prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN' AND severity = 'HIGH'")
      .first<{ count: number }>();

    const mediumAlerts = await this.env.DB
      .prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN' AND severity = 'MEDIUM'")
      .first<{ count: number }>();

    const lowAlerts = await this.env.DB
      .prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN' AND severity = 'LOW'")
      .first<{ count: number }>();

    const totalAlerts = openAlerts?.count || 0;
    const score = this.calculateScore(totalAlerts, criticalAlerts?.count || 0, highAlerts?.count || 0);

    const rulesResult = await this.env.DB
      .prepare("SELECT COUNT(*) as count FROM compliance_rules WHERE enabled = 1")
      .first<{ count: number }>();

    return {
      score,
      overallScore: score,
      alerts: {
        open: totalAlerts,
        critical: criticalAlerts?.count || 0,
        high: highAlerts?.count || 0,
        medium: mediumAlerts?.count || 0,
        low: lowAlerts?.count || 0,
      },
      rulesExecuted: rulesResult?.count || 0,
      patientsReviewed: 0,
      recordsComplete: 0,
      recordsIncomplete: 0,
      consentsValid: 0,
      consentsMissing: 0,
      notesComplete: 0,
      notesIncomplete: 0,
      nomCompliance: score,
      cofeprisCompliance: score,
      iso9001Compliance: score,
      iso27001Compliance: score,
      norms: {
        nom004: { score, alerts: 0, label: "NOM-004" },
        cofepris: { score, alerts: 0, label: "COFEPRIS" },
        iso9001: { score, alerts: 0, label: "ISO 9001" },
        iso27001: { score, alerts: 0, label: "ISO 27001" },
      },
      operative: {
        criticalAlerts: criticalAlerts?.count || 0,
        patientsPending: 0,
        consentsExpiring: 0,
        recordsIncomplete: 0,
        successfulCrons: 0,
        lastBackup: null,
        lastAudit: new Date().toISOString(),
      },
    };
  }

  private calculateScore(openAlerts: number, critical: number, high: number): number {
    return Math.max(0, Math.round(100 - (critical * 30) - (high * 15) - (openAlerts * 5)));
  }

  private async findOpenAlert(ruleCode: string, patientId?: number): Promise<ComplianceAlert | null> {
    if (patientId) {
      const row = await this.env.DB
        .prepare(
          "SELECT * FROM compliance_alerts WHERE rule_code = ? AND patient_id = ? AND status = 'OPEN'"
        )
        .bind(ruleCode, patientId)
        .first();
      return (row as unknown as ComplianceAlert) || null;
    }
    const row = await this.env.DB
      .prepare("SELECT * FROM compliance_alerts WHERE rule_code = ? AND status = 'OPEN'")
      .bind(ruleCode)
      .first();
    return (row as unknown as ComplianceAlert) || null;
  }

  private async updateAlert(alertId: number, message: string): Promise<void> {
    await this.env.DB
      .prepare(
        "UPDATE compliance_alerts SET message = ? WHERE id = ?"
      )
      .bind(message, alertId)
      .run();
  }
}