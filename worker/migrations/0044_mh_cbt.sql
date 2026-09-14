-- ============================================
-- MIGRATION 0044 — MH-EXPANSION 1.2 CBT integrado
-- Integración sobre therapeutic-engine existente (mh_*),
-- NO crea segundo motor ni catálogo paralelo.
-- ============================================

-- Sesión CBT: estado + formulación + estrategia + reevaluación
CREATE TABLE IF NOT EXISTS mh_cbt_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  phase TEXT NOT NULL DEFAULT 'listen' CHECK(phase IN ('listen','reflect','validate','explore','formulate','intervene','practice','reevaluate','next_step','closure')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),

  -- Formulación CBT parcial (todos opcionales para permitir sesiones parciales)
  situation TEXT,
  automatic_thought TEXT,
  emotion TEXT,
  emotion_intensity INTEGER CHECK(emotion_intensity IS NULL OR (emotion_intensity BETWEEN 1 AND 10)),
  behavior TEXT,
  evidence_for TEXT,
  evidence_against TEXT,
  balanced_thought TEXT,
  experiment TEXT,
  experiment_outcome TEXT,

  -- Estrategia y mapping a intervención existente
  selected_strategy TEXT CHECK(selected_strategy IS NULL OR selected_strategy IN ('breathing','cognitive_restructuring','grounding','behavioral_activation','sleep_hygiene','mindfulness','problem_solving','exposure')),
  intervention_slug TEXT,
  intervention_id INTEGER,

  -- Reevaluación before/after reutilizando lógica MH
  before_score INTEGER CHECK(before_score IS NULL OR (before_score BETWEEN 1 AND 10)),
  after_score INTEGER CHECK(after_score IS NULL OR (after_score BETWEEN 1 AND 10)),
  delta INTEGER,

  -- Insight / next_step (no diagnóstico)
  insight TEXT,
  next_step TEXT,

  -- Contexto de origen (check-in / wellbeing opcional)
  linked_checkin_id INTEGER,
  linked_wellbeing_id INTEGER,
  context_json TEXT,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (intervention_id) REFERENCES mh_interventions(id),
  FOREIGN KEY (linked_checkin_id) REFERENCES mh_checkins(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mh_cbt_user_created ON mh_cbt_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mh_cbt_user_phase ON mh_cbt_sessions(user_id, phase);
CREATE INDEX IF NOT EXISTS idx_mh_cbt_user_status ON mh_cbt_sessions(user_id, status);

-- Trigger para updated_at
CREATE TRIGGER IF NOT EXISTS trg_mh_cbt_updated
AFTER UPDATE ON mh_cbt_sessions
FOR EACH ROW
BEGIN
  UPDATE mh_cbt_sessions SET updated_at = datetime('now') WHERE id = OLD.id;
END;
