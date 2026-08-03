export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Category = "NOM" | "COFEPRIS" | "ISO9001" | "ISO27001";

export type CheckType =
  | "CHECK_EXISTS"
  | "CHECK_DATE"
  | "CHECK_BOOL"
  | "CHECK_REQUIRED"
  | "CHECK_MIN"
  | "CHECK_MAX"
  | "CHECK_EQUALS"
  | "CHECK_NOT_EMPTY";

export type AlertStatus = "OPEN" | "REVIEWED" | "RESOLVED";

export interface ComplianceRule {
  id: string;
  code?: string;
  name: string;
  category: Category;
  severity: Severity;
  enabled: boolean;
  check_type: CheckType;
  version?: string;
  description?: string;
  effective_from?: string;
  effective_to?: string | null;
}

export interface ComplianceResult {
  passed: boolean;
  message: string;
  severity: Severity;
  patientId?: number;
  recordId?: number;
  ruleId?: string;
}

export interface ComplianceAlert {
  id: number;
  ruleCode: string;
  category: Category;
  severity: Severity;
  patientId?: number;
  recordId?: number;
  message: string;
  status: AlertStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: number;
}

export interface ComplianceRun {
  id: number;
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  rulesExecuted: number;
  alertsCreated: number;
  score?: number;
}

export interface PatientContext {
  patientId: number;
  consentExists: boolean;
  latestRecord: {
    id: number;
    reason_consultation: string | null;
    evaluation: string | null;
    diagnosis: string | null;
    treatment_plan: string | null;
  } | null;
  latestNote: {
    id: number;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
  } | null;
  openIncidentCount: number;
}

export interface DashboardMetrics {
  score: number;
  overallScore: number;
  alerts: {
    open: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  rulesExecuted: number;
  lastRunAt?: string;
  patientsReviewed: number;
  recordsComplete: number;
  recordsIncomplete: number;
  consentsValid: number;
  consentsMissing: number;
  notesComplete: number;
  notesIncomplete: number;
  nomCompliance: number;
  cofeprisCompliance: number;
  iso9001Compliance: number;
  iso27001Compliance: number;
  norms: {
    nom004: { score: number; alerts: number; label: string };
    cofepris: { score: number; alerts: number; label: string };
    iso9001: { score: number; alerts: number; label: string };
    iso27001: { score: number; alerts: number; label: string };
  };
  operative: {
    criticalAlerts: number;
    patientsPending: number;
    consentsExpiring: number;
    recordsIncomplete: number;
    successfulCrons: number;
    lastBackup: string | null;
    lastAudit: string;
  };
}