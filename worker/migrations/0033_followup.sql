-- FASE 12.6: Seguimiento Clinico (followups)
-- Tabla de seguimientos: citas de control, revisiones, tratamientos continuos

CREATE TABLE IF NOT EXISTS followups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  patient_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CONTROL', 'REVISION', 'TRATAMIENTO', 'URGENCIA', 'TELEMEDICINA')),
  scheduled_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO', 'NO_ASISTIO')),
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('BAJA', 'NORMAL', 'ALTA', 'URGENTE')),
  notes TEXT,
  outcome TEXT,
  outcome_notes TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX IF NOT EXISTS idx_followups_patient ON followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled ON followups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_followups_clinic ON followups(clinic_id);
