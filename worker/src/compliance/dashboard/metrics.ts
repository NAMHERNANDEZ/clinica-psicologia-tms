import type { DashboardMetrics } from "../types";

type NormCategory = "NOM" | "COFEPRIS" | "ISO9001" | "ISO27001";

function calcScore(open: number, critical: number, high: number): number {
  return Math.max(0, Math.round(100 - (critical * 30) - (high * 15) - (open * 5)));
}

async function normScore(env: { DB: D1Database }, cat: NormCategory): Promise<{ score: number; alerts: number }> {
  const open = await env.DB
    .prepare("SELECT COUNT(*) as cnt FROM compliance_alerts WHERE status = 'OPEN' AND category = ?")
    .bind(cat).first<{ cnt: number }>();
  const critical = await env.DB
    .prepare("SELECT COUNT(*) as cnt FROM compliance_alerts WHERE status = 'OPEN' AND category = ? AND severity = 'CRITICAL'")
    .bind(cat).first<{ cnt: number }>();
  const high = await env.DB
    .prepare("SELECT COUNT(*) as cnt FROM compliance_alerts WHERE status = 'OPEN' AND category = ? AND severity = 'HIGH'")
    .bind(cat).first<{ cnt: number }>();
  const total = open?.cnt || 0;
  return { score: calcScore(total, critical?.cnt || 0, high?.cnt || 0), alerts: total };
}

export async function calculateDashboardMetrics(env: { DB: D1Database }): Promise<DashboardMetrics> {
  const openAlerts = await env.DB.prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN'").first<{ count: number }>();
  const criticalAlerts = await env.DB.prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN' AND severity = 'CRITICAL'").first<{ count: number }>();
  const highAlerts = await env.DB.prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN' AND severity = 'HIGH'").first<{ count: number }>();
  const mediumAlerts = await env.DB.prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN' AND severity = 'MEDIUM'").first<{ count: number }>();
  const lowAlerts = await env.DB.prepare("SELECT COUNT(*) as count FROM compliance_alerts WHERE status = 'OPEN' AND severity = 'LOW'").first<{ count: number }>();
  const rulesResult = await env.DB.prepare("SELECT COUNT(*) as count FROM compliance_rules WHERE enabled = 1").first<{ count: number }>();

  const totalOpen = openAlerts?.count || 0;
  const critical = criticalAlerts?.count || 0;
  const high = highAlerts?.count || 0;
  const overallScore = calcScore(totalOpen, critical, high);

  const patientsResult = await env.DB.prepare("SELECT COUNT(*) as count FROM patients").first<{ count: number }>();
  const recordsResult = await env.DB.prepare("SELECT COUNT(*) as count FROM clinical_records").first<{ count: number }>();

  let recordsComplete = 0;
  let recordsIncomplete = 0;
  if (recordsResult?.count) {
    const allRecords = await env.DB.prepare("SELECT id, reason_consultation, evaluation, diagnosis, treatment_plan FROM clinical_records").all<{ id: number; reason_consultation: string; evaluation: string; diagnosis: string; treatment_plan: string }>();
    for (const r of allRecords.results || []) {
      if (r.reason_consultation && r.evaluation && r.diagnosis && r.treatment_plan) recordsComplete++;
      else recordsIncomplete++;
    }
  }

  const consentsTotal = await env.DB.prepare("SELECT COUNT(*) as count FROM consents").first<{ count: number }>();

  const notesResult = await env.DB.prepare("SELECT id, subjective, objective, assessment, plan FROM session_notes").all<{ id: number; subjective: string; objective: string; assessment: string; plan: string }>();
  let notesComplete = 0;
  let notesIncomplete = 0;
  for (const n of notesResult.results || []) {
    if (n.subjective && n.objective && n.assessment && n.plan) notesComplete++;
    else notesIncomplete++;
  }

  const [nom004, cofepris, iso9001, iso27001] = await Promise.all([
    normScore(env, "NOM"),
    normScore(env, "COFEPRIS"),
    normScore(env, "ISO9001"),
    normScore(env, "ISO27001"),
  ]);

  const lastRun = await env.DB.prepare("SELECT started_at as created_at FROM compliance_runs ORDER BY id DESC LIMIT 1").first<{ created_at: string }>();
  const cronRun = await env.DB.prepare("SELECT created_at FROM audit_logs WHERE action = 'compliance_run' AND module = 'compliance' ORDER BY id DESC LIMIT 1").first<{ created_at: string }>();
  const backupRun = await env.DB.prepare("SELECT completed_at as created_at FROM backup_runs WHERE status = 'completed' ORDER BY id DESC LIMIT 1").first<{ created_at: string }>();
  const cronCount = await env.DB.prepare("SELECT COUNT(*) as cnt FROM audit_logs WHERE action = 'compliance_run' AND module = 'compliance'").first<{ cnt: number }>();

  const patientsPending = await env.DB.prepare("SELECT COUNT(DISTINCT ca.patient_id) as cnt FROM compliance_alerts ca WHERE ca.status = 'OPEN' AND ca.patient_id IS NOT NULL").first<{ cnt: number }>();
  const consentsExpiring = await env.DB.prepare("SELECT COUNT(*) as cnt FROM documents WHERE status = 'SIGNED' AND expires_at IS NOT NULL AND expires_at <= datetime('now', '+30 days') AND expires_at > datetime('now')").first<{ cnt: number }>();

  return {
    score: overallScore,
    overallScore,
    alerts: {
      open: totalOpen,
      critical,
      high,
      medium: mediumAlerts?.count || 0,
      low: lowAlerts?.count || 0,
    },
    rulesExecuted: rulesResult?.count || 0,
    lastRunAt: lastRun?.created_at,
    patientsReviewed: patientsResult?.count || 0,
    recordsComplete,
    recordsIncomplete,
    consentsValid: consentsTotal?.count || 0,
    consentsMissing: (patientsResult?.count || 0) - (consentsTotal?.count || 0),
    notesComplete,
    notesIncomplete,
    nomCompliance: nom004.score,
    cofeprisCompliance: cofepris.score,
    iso9001Compliance: iso9001.score,
    iso27001Compliance: iso27001.score,
    norms: {
      nom004: { score: nom004.score, alerts: nom004.alerts, label: "NOM-004" },
      cofepris: { score: cofepris.score, alerts: cofepris.alerts, label: "COFEPRIS" },
      iso9001: { score: iso9001.score, alerts: iso9001.alerts, label: "ISO 9001" },
      iso27001: { score: iso27001.score, alerts: iso27001.alerts, label: "ISO 27001" },
    },
    operative: {
      criticalAlerts: critical,
      patientsPending: patientsPending?.cnt || 0,
      consentsExpiring: consentsExpiring?.cnt || 0,
      recordsIncomplete,
      successfulCrons: cronCount?.cnt || 0,
      lastBackup: backupRun?.created_at || null,
      lastAudit: cronRun?.created_at || lastRun?.created_at || new Date().toISOString(),
    },
  };
}