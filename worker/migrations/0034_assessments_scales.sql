-- ============================================
-- 0034_assessments_scales.sql
-- Tabla para metadata de escalas clínicas + respuestas individuales
-- ============================================

-- Tabla de escalas clínicas (metadata)
CREATE TABLE IF NOT EXISTS clinical_scales (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  condition TEXT,
  max_score INTEGER NOT NULL,
  item_count INTEGER NOT NULL,
  time_to_complete TEXT,
  source TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tabla de respuestas individuales por assessment
CREATE TABLE IF NOT EXISTS scale_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL,
  scale_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  value INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (assessment_id) REFERENCES clinical_assessments(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_scale_responses_assessment ON scale_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_scale_responses_scale ON scale_responses(scale_id);
CREATE INDEX IF NOT EXISTS idx_clinical_scales_active ON clinical_scales(active);

-- ============================================
-- SEED: Insertar escalas validadas
-- ============================================

INSERT OR IGNORE INTO clinical_scales (id, name, full_name, description, condition, max_score, item_count, time_to_complete, source) VALUES
  ('phq9', 'PHQ-9', 'Patient Health Questionnaire-9', 'Screening de depresión. 9 ítems, cada uno 0-3.', 'Depresión, Ansiedad, TEPT', 27, 9, '~2 min', 'Kroenke et al., 2001'),
  ('gad7', 'GAD-7', 'Generalized Anxiety Disorder-7', 'Screening de ansiedad generalizada. 7 ítems, cada uno 0-3.', 'Ansiedad Generalizada', 21, 7, '~1.5 min', 'Spitzer et al., 2006'),
  ('bdii', 'BDI-II', 'Beck Depression Inventory-II', 'Inventario de depresión de Beck. 21 ítems, cada uno 0-3.', 'Depresión', 63, 21, '~5 min', 'Beck et al., 1996'),
  ('pcl5', 'PCL-5', 'PTSD Checklist for DSM-5', 'Evaluación de TEPT. 20 ítems, cada uno 0-4.', 'TEPT', 80, 20, '~5 min', 'Weathers et al., 2013'),
  ('audit', 'AUDIT', 'Alcohol Use Disorders Identification Test', 'Screening de consumo de alcohol. 10 ítems.', 'Alcohol', 40, 10, '~2 min', 'WHO, 2001'),
  ('dass21', 'DASS-21', 'Depression Anxiety Stress Scales-21', 'Evaluación de depresión, ansiedad y estrés. 21 ítems.', 'Depresión, Ansiedad, Estrés', 63, 21, '~5 min', 'Lovibond & Lovibond, 1995');
