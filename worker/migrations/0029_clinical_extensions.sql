-- FASE 12.2: Clinical records + session notes extensions
-- Adds: CIE10 codes, vitals, allergies, medications, status, version, co-signature

-- Clinical records extensions
ALTER TABLE clinical_records ADD COLUMN cie10_codes TEXT;
ALTER TABLE clinical_records ADD COLUMN allergies TEXT;
ALTER TABLE clinical_records ADD COLUMN current_medications TEXT;
ALTER TABLE clinical_records ADD COLUMN past_medical_history TEXT;
ALTER TABLE clinical_records ADD COLUMN family_history TEXT;
ALTER TABLE clinical_records ADD COLUMN social_history TEXT;
ALTER TABLE clinical_records ADD COLUMN review_of_systems TEXT;
ALTER TABLE clinical_records ADD COLUMN vital_signs TEXT;
ALTER TABLE clinical_records ADD COLUMN status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived'));
ALTER TABLE clinical_records ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE clinical_records ADD COLUMN locked_by INTEGER;
ALTER TABLE clinical_records ADD COLUMN locked_at TEXT;
ALTER TABLE clinical_records ADD COLUMN closed_at TEXT;

-- Session notes extensions
ALTER TABLE session_notes ADD COLUMN session_number INTEGER;
ALTER TABLE session_notes ADD COLUMN treatment_id INTEGER;
ALTER TABLE session_notes ADD COLUMN appointment_id INTEGER;
ALTER TABLE session_notes ADD COLUMN duration_minutes INTEGER;
ALTER TABLE session_notes ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'cosigned'));
ALTER TABLE session_notes ADD COLUMN signed_at TEXT;
ALTER TABLE session_notes ADD COLUMN co_signed_by INTEGER;
ALTER TABLE session_notes ADD COLUMN co_signed_at TEXT;
ALTER TABLE session_notes ADD COLUMN billing_codes TEXT;
ALTER TABLE session_notes ADD COLUMN risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high', 'critical'));
ALTER TABLE session_notes ADD COLUMN version INTEGER DEFAULT 1;

-- Clinical notes extensions (missing update tracking)
ALTER TABLE clinical_notes ADD COLUMN updated_at TEXT;
ALTER TABLE clinical_notes ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE clinical_notes ADD COLUMN status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'cosigned'));

-- CIE10 diagnosis code catalog
CREATE TABLE IF NOT EXISTS cie10_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cie10_code ON cie10_codes(code);
CREATE INDEX IF NOT EXISTS idx_cie10_category ON cie10_codes(category);

-- Common CIE10 codes for mental health (seed data)
INSERT OR IGNORE INTO cie10_codes (code, description, category) VALUES
  ('F32.0', 'Episodio depresivo leve', 'Depresion'),
  ('F32.1', 'Episodio depresivo moderado', 'Depresion'),
  ('F32.2', 'Episodio depresivo severo sin sintomas psicoticos', 'Depresion'),
  ('F32.3', 'Episodio depresivo severo con sintomas psicoticos', 'Depresion'),
  ('F33.0', 'Trastorno depresivo recurrente, episodio actual leve', 'Depresion'),
  ('F33.1', 'Trastorno depresivo recurrente, episodio actual moderado', 'Depresion'),
  ('F33.2', 'Trastorno depresivo recurrente, episodio actual severo sin psicosis', 'Depresion'),
  ('F41.0', 'Crisis de angustia', 'Ansiedad'),
  ('F41.1', 'Trastorno de ansiedad generalizada', 'Ansiedad'),
  ('F41.2', 'Trastorno mixto ansioso-depresivo', 'Ansiedad'),
  ('F41.9', 'Trastorno de ansiedad no especificado', 'Ansiedad'),
  ('F43.0', 'Reaccion al estres agudo', 'Trauma'),
  ('F43.1', 'Trastorno de estres post-traumatico', 'Trauma'),
  ('F43.2', 'Reacciones adaptativas', 'Trauma'),
  ('F50.0', 'Anorexia nerviosa', 'Alimentacion'),
  ('F50.1', 'Bulimia nerviosa', 'Alimentacion'),
  ('F60.3', 'Trastorno borderline de la personalidad', 'Personalidad'),
  ('F84.0', 'Autismo', 'Desarrollo'),
  ('G47.0', 'Trastornos del sueno-insomnio', 'Sueno'),
  ('R45.851', 'Trastornos del animo no especificados', 'General');

-- Treatment extensions
ALTER TABLE treatments ADD COLUMN diagnosis_codes TEXT;
ALTER TABLE treatments ADD COLUMN treatment_goals TEXT;
ALTER TABLE treatments ADD COLUMN frequency_per_week INTEGER DEFAULT 1;
ALTER TABLE treatments ADD COLUMN setting TEXT DEFAULT 'outpatient' CHECK (setting IN ('outpatient', 'inpatient', 'telehealth'));
ALTER TABLE treatments ADD COLUMN informed_consent_id INTEGER;

-- Session extensions
ALTER TABLE sessions ADD COLUMN actual_duration INTEGER;
ALTER TABLE sessions ADD COLUMN cancellation_reason TEXT;
ALTER TABLE sessions ADD COLUMN no_show_reason TEXT;
ALTER TABLE sessions ADD COLUMN rescheduled_from INTEGER;
