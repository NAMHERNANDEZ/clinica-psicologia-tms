-- FASE 11.3: CRM Completion — email en leads + tabla de notas

-- Email para contacto (opcional, no afecta el CHECK de estado existente)
ALTER TABLE leads ADD COLUMN email TEXT;

-- Soft delete: en lugar de borrar fisicamente, marcar con fecha (conserva historial)
ALTER TABLE leads ADD COLUMN deleted_at DATETIME;

-- Notas internas de seguimiento por lead (historial comercial complementa lead_audit)
CREATE TABLE IF NOT EXISTS lead_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  lead_id INTEGER NOT NULL,
  note TEXT NOT NULL,
  usuario_id INTEGER,
  usuario TEXT,
  fecha DATETIME NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_clinic ON lead_notes(clinic_id);