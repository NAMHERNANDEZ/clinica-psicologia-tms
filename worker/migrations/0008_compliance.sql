-- ====================================================
-- COMPLIANCE ENGINE — Migration 0008
-- ====================================================

-- compliance_rules
CREATE TABLE IF NOT EXISTS compliance_rules (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK(category IN ('NOM','COFEPRIS','ISO9001','ISO27001')) NOT NULL,
  severity TEXT CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')) NOT NULL,
  check_type TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- compliance_alerts
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_code TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  patient_id INTEGER,
  record_id INTEGER,
  message TEXT NOT NULL,
  status TEXT CHECK(status IN ('OPEN','REVIEWED','RESOLVED')) DEFAULT 'OPEN',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolved_by INTEGER,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- compliance_runs
CREATE TABLE IF NOT EXISTS compliance_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  rules_executed INTEGER DEFAULT 0,
  alerts_created INTEGER DEFAULT 0,
  score INTEGER,
  patients_reviewed INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_patient ON compliance_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_rule ON compliance_alerts(rule_code);
CREATE INDEX IF NOT EXISTS idx_compliance_runs_started ON compliance_runs(started_at);

-- Register initial rules (NOM)
INSERT OR IGNORE INTO compliance_rules (id, code, name, category, severity, check_type, enabled) VALUES
  ('nom004-consent', 'NOM004-CONSENT-001', 'Consentimiento informado firmado', 'NOM', 'CRITICAL', 'CHECK_EXISTS', 1),
  ('nom004-record', 'NOM004-RECORD-001', 'Expediente clinico completo', 'NOM', 'HIGH', 'CHECK_REQUIRED', 1),
  ('nom004-note', 'NOM004-NOTE-001', 'Nota SOAP completa', 'NOM', 'HIGH', 'CHECK_NOT_EMPTY', 1),
  ('nom004-diagnosis', 'NOM004-DIAG-001', 'Diagnostico registrado', 'NOM', 'HIGH', 'CHECK_REQUIRED', 1),
  ('nom004-treatment', 'NOM004-TX-001', 'Plan terapeutico vigente', 'NOM', 'MEDIUM', 'CHECK_REQUIRED', 1);

-- Register initial rules (COFEPRIS)
INSERT OR IGNORE INTO compliance_rules (id, code, name, category, severity, check_type, enabled) VALUES
  ('cofepris-consent', 'COFEPRIS-CONSENT-001', 'Consentimiento para procedimiento TMS', 'COFEPRIS', 'CRITICAL', 'CHECK_EXISTS', 1),
  ('cofepris-operator', 'COFEPRIS-OPERATOR-001', 'Operador autorizado', 'COFEPRIS', 'HIGH', 'CHECK_REQUIRED', 1),
  ('cofepris-equipment', 'COFEPRIS-EQUIPMENT-001', 'Equipo registrado y calibrado', 'COFEPRIS', 'HIGH', 'CHECK_EXISTS', 1),
  ('cofepris-adverse', 'COFEPRIS-ADVERSE-001', 'Registro de eventos adversos', 'COFEPRIS', 'MEDIUM', 'CHECK_EXISTS', 1),
  ('cofepris-followup', 'COFEPRIS-FOLLOWUP-001', 'Seguimiento post-sesion', 'COFEPRIS', 'MEDIUM', 'CHECK_EXISTS', 1);

-- Register initial rules (ISO 9001)
INSERT OR IGNORE INTO compliance_rules (id, code, name, category, severity, check_type, enabled) VALUES
  ('iso9001-quality', 'ISO9001-QUALITY-001', 'Metricas de calidad actualizadas', 'ISO9001', 'MEDIUM', 'CHECK_EXISTS', 1),
  ('iso9001-satisfaction', 'ISO9001-SATISFACTION-001', 'Encuesta de satisfaccion del paciente', 'ISO9001', 'LOW', 'CHECK_EXISTS', 1),
  ('iso9001-response', 'ISO9001-RESPONSE-001', 'Tiempo de respuesta dentro de limite', 'ISO9001', 'MEDIUM', 'CHECK_DATE', 1),
  ('iso9001-noshow', 'ISO9001-NOSHOW-001', 'Tasa de no-asistencia dentro de margen', 'ISO9001', 'MEDIUM', 'CHECK_MAX', 1);

-- Register initial rules (ISO 27001)
INSERT OR IGNORE INTO compliance_rules (id, code, name, category, severity, check_type, enabled) VALUES
  ('iso27001-audit', 'ISO27001-AUDIT-001', 'Auditoria activa', 'ISO27001', 'CRITICAL', 'CHECK_EXISTS', 1),
  ('iso27001-access', 'ISO27001-ACCESS-001', 'Acceso con rol valido', 'ISO27001', 'HIGH', 'CHECK_REQUIRED', 1),
  ('iso27001-session', 'ISO27001-SESSION-001', 'Sesion no expirada', 'ISO27001', 'MEDIUM', 'CHECK_DATE', 1),
  ('iso27001-backup', 'ISO27001-BACKUP-001', 'Backup verificado', 'ISO27001', 'HIGH', 'CHECK_EXISTS', 1);