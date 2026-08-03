-- FASE 11.4: Agenda Completion — vincular citas a leads + tipo + soft delete + disponibilidad

-- Relación Lead -> Appointment (opcional, un lead aún no es paciente)
ALTER TABLE appointments ADD COLUMN lead_id INTEGER;

-- Tipo de consulta (CONSULTA / TMS / SEGUIMIENTO) — valores desde la capa clínica
ALTER TABLE appointments ADD COLUMN type TEXT;

-- Soft delete para citas (conserva historial)
ALTER TABLE appointments ADD COLUMN deleted_at TEXT;

-- Disponibilidad semanal de la clínica
CREATE TABLE IF NOT EXISTS availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_availability_clinic ON availability(clinic_id);