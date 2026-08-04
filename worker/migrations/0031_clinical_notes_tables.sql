-- FASE 12.3: Tablas nuevas para notas clínicas profesionales

-- Nota templates
CREATE TABLE IF NOT EXISTS note_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('SOAP', 'DAP', 'BIRP', 'LIBRE')),
  structure TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_note_templates_type ON note_templates(template_type);

-- Seed default templates
INSERT OR IGNORE INTO note_templates (id, clinic_id, name, template_type, structure, created_at) VALUES
(1, 1, 'SOAP', 'SOAP',
  '{"sections": ["motivo_consulta", "observaciones", "evaluacion", "intervencion", "plan_terapeutico", "riesgo_clinico", "proxima_sesion"]}',
  datetime('now')),
(2, 1, 'DAP', 'DAP',
  '{"sections": ["dato", "aspecto", "plan"]}',
  datetime('now')),
(3, 1, 'BIRP', 'BIRP',
  '{"sections": ["background", "identificacion", "respuesta", "plan"]}',
  datetime('now')),
(4, 1, 'Libre', 'Libre',
  '{"sections": ["nota"]}',
  datetime('now'));

-- Note versions (versionado completo)
CREATE TABLE IF NOT EXISTS note_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  changed_by INTEGER,
  changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  change_reason TEXT,
  FOREIGN KEY (note_id) REFERENCES clinical_notes(id)
);

CREATE INDEX IF NOT EXISTS idx_note_versions_note ON note_versions(note_id);
CREATE INDEX IF NOT EXISTS idx_note_versions_version ON note_versions(note_id, version);

-- Note signatures (firma/cofirma)
CREATE TABLE IF NOT EXISTS note_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  user_email TEXT,
  user_role TEXT,
  signature_type TEXT NOT NULL CHECK (signature_type IN ('create', 'sign', 'cosign', 'modify')),
  signed_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip TEXT,
  FOREIGN KEY (note_id) REFERENCES clinical_notes(id)
);

CREATE INDEX IF NOT EXISTS idx_note_signatures_note ON note_signatures(note_id);
CREATE INDEX IF NOT EXISTS idx_note_signatures_user ON note_signatures(user_id);

-- Nota audit trail detallado
CREATE TABLE IF NOT EXISTS note_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER NOT NULL,
  user_id INTEGER,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'lock', 'unlock', 'sign', 'cosign', 'version', 'delete')),
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  ip TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id) REFERENCES clinical_notes(id)
);

CREATE INDEX IF NOT EXISTS idx_note_audit_note ON note_audit(note_id);
CREATE INDEX IF NOT EXISTS idx_note_audit_user ON note_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_note_audit_action ON note_audit(action);
CREATE INDEX IF NOT EXISTS idx_note_audit_created ON note_audit(created_at DESC);

-- Índices para notas clínicas
CREATE INDEX IF NOT EXISTS idx_clinical_notes_status ON clinical_notes(status);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_locked ON clinical_notes(is_locked);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_signed ON clinical_notes(signed_at);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_risk ON clinical_notes(risk_level);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_template ON clinical_notes(template_type);
