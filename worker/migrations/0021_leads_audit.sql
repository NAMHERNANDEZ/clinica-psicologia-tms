-- FASE 11.2: Auditoria de acciones sobre leads (dashboard admin)

CREATE TABLE IF NOT EXISTS lead_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  lead_id INTEGER NOT NULL,
  accion TEXT NOT NULL,
  estado_anterior TEXT,
  estado_nuevo TEXT,
  usuario_id INTEGER,
  usuario TEXT,
  fecha DATETIME NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_lead_audit_lead ON lead_audit(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_audit_fecha ON lead_audit(fecha);
CREATE INDEX IF NOT EXISTS idx_lead_audit_clinic ON lead_audit(clinic_id);
