-- ============================================
-- 0043_wellbeing_assessments.sql
-- Wellbeing assessments (user-scoped, self-reported)
-- Separate from clinical assessments to preserve clinical integrity
-- ============================================

-- Wellbeing scales metadata (distinct from clinical_scales)
CREATE TABLE IF NOT EXISTS wellbeing_scales (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  domain TEXT NOT NULL DEFAULT 'wellbeing',
  max_score INTEGER NOT NULL,
  item_count INTEGER NOT NULL,
  time_to_complete TEXT,
  source TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Main wellbeing assessments table (user-scoped, NO clinic/patient/therapist)
CREATE TABLE IF NOT EXISTS wellbeing_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scale_id TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  domain TEXT NOT NULL DEFAULT 'wellbeing',
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  interpretation TEXT,
  band TEXT, -- e.g., 'low', 'moderate', 'high' for wellbeing bands
  provenance TEXT NOT NULL DEFAULT 'user_self_report', -- 'user_self_report' | 'imported' | 'system_generated'
  disclaimer TEXT NOT NULL DEFAULT 'Esta es una autoevaluación de bienestar y no constituye un diagnóstico.',
  administered_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scale_id) REFERENCES wellbeing_scales(id) ON DELETE RESTRICT
);

-- Individual item responses
CREATE TABLE IF NOT EXISTS wellbeing_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL,
  scale_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  question_text TEXT, -- store question for audit/review
  answer_value INTEGER NOT NULL, -- normalized 0-N
  answer_raw TEXT, -- original answer if different (e.g., text)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (assessment_id) REFERENCES wellbeing_assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (scale_id) REFERENCES wellbeing_scales(id) ON DELETE RESTRICT
);

-- Indexes for wellbeing queries
CREATE INDEX IF NOT EXISTS idx_wellbeing_assessments_user ON wellbeing_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_assessments_user_domain ON wellbeing_assessments(user_id, domain);
CREATE INDEX IF NOT EXISTS idx_wellbeing_assessments_user_completed ON wellbeing_assessments(user_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_wellbeing_assessments_scale ON wellbeing_assessments(scale_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_responses_assessment ON wellbeing_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_responses_scale ON wellbeing_responses(scale_id);
CREATE INDEX IF NOT EXISTS idx_wellbeing_scales_active ON wellbeing_scales(active);

-- ============================================
-- SEED: Initial wellbeing scales
-- These are SHORT, self-reported wellbeing scales
-- ============================================

-- Stress (PSS-4: 4 items, 0-4 each, max 16)
INSERT OR IGNORE INTO wellbeing_scales (id, name, full_name, description, domain, max_score, item_count, time_to_complete, source) VALUES
  ('stress-pss4', 'PSS-4', 'Perceived Stress Scale-4', 'Evaluación breve de estrés percibido. 4 ítems, cada uno 0-4.', 'wellbeing', 16, 4, '~1 min', 'Cohen et al., 1983 (adaptado)');

-- Sleep quality (SQ-5: 5 items, 0-3 each, max 15)
INSERT OR IGNORE INTO wellbeing_scales (id, name, full_name, description, domain, max_score, item_count, time_to_complete, source) VALUES
  ('sleep-sq5', 'SQ-5', 'Sleep Quality-5', 'Calidad de sueño breve. 5 ítems, cada uno 0-3.', 'wellbeing', 15, 5, '~1 min', 'Basado en PSQI abreviado');

-- Mood/Wellbeing (WHO-5: 5 items, 0-5 each, max 25)
INSERT OR IGNORE INTO wellbeing_scales (id, name, full_name, description, domain, max_score, item_count, time_to_complete, source) VALUES
  ('wellbeing-who5', 'WHO-5', 'WHO-5 Well-Being Index', 'Bienestar emocional general. 5 ítems, cada uno 0-5.', 'wellbeing', 25, 5, '~1 min', 'WHO, 1998');

-- Activation/Anxiety (GAD-2: 2 items, 0-3 each, max 6)
INSERT OR IGNORE INTO wellbeing_scales (id, name, full_name, description, domain, max_score, item_count, time_to_complete, source) VALUES
  ('activation-gad2', 'GAD-2', 'Generalized Anxiety Disorder-2', 'Activación/ansiedad cotidiana. 2 ítems, cada uno 0-3.', 'wellbeing', 6, 2, '~30 seg', 'Kroenke et al., 2007');

-- Energy/Vitality (VAS-3: 3 items, 0-10 each, max 30)
INSERT OR IGNORE INTO wellbeing_scales (id, name, full_name, description, domain, max_score, item_count, time_to_complete, source) VALUES
  ('energy-vas3', 'VAS-3', 'Vitality Assessment Scale-3', 'Nivel de energía y vitalidad. 3 ítems, cada uno 0-10.', 'wellbeing', 30, 3, '~1 min', 'Adaptado de SF-36 vitality');

-- Concentration/Focus (CFQ-3: 3 items, 0-4 each, max 12)
INSERT OR IGNORE INTO wellbeing_scales (id, name, full_name, description, domain, max_score, item_count, time_to_complete, source) VALUES
  ('focus-cfq3', 'CFQ-3', 'Cognitive Failure Questionnaire-3', 'Concentración y fallos cognitivos cotidianos. 3 ítems, cada uno 0-4.', 'wellbeing', 12, 3, '~1 min', 'Broadbent et al., 1982 (adaptado)');

-- ============================================
-- SEED: Scale items with questions and options
-- Stored as JSON in wellbeing_scales would be ideal but keeping simple for now
-- Items will be defined in validators.ts (code) and persisted here for audit
-- ============================================