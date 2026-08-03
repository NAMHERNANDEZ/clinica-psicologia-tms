-- FASE: COMPLIANCE ENGINE
CREATE TABLE IF NOT EXISTS compliance_rules (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  regulation TEXT NOT NULL,
  severity TEXT NOT NULL,
  check_type TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_code TEXT NOT NULL,
  patient_id INTEGER,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN',
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  resolved_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_patient ON compliance_alerts(patient_id);

-- Register initial rules
INSERT OR IGNORE INTO compliance_rules (id, code, name, regulation, severity, check_type) VALUES
  ('nom004-record', 'NOM004-RECORD-001', 'Expediente clínico completo', 'NOM-004-SSA3-2012', 'HIGH', 'RECORD_COMPLETE', 1, datetime('now')),
  ('tms-consent', 'TMS-CONSENT-001', 'Consentimiento informado TMS', 'COFEPRIS', 'CRITICAL', 'CONSENT_EXISTS', 1, datetime('now')),
  ('nom004-note', 'NOM004-NOTE-001', 'Nota clínica completa', 'NOM-004-SSA3-2012', 'HIGH', 'SESSION_NOTE_EXISTS', 1, datetime('now'));