-- ============================================
-- MIGRATION 0042 — MENTAL HEALTH DOMAIN (bienestar personal)
-- Separacion estricta: dominio MH es user-scoped (users.id).
-- NUNCA referencia pacientes/clinica. Reutiliza auth y D1 existentes.
-- ============================================

-- Perfil de bienestar del usuario -------------------------------------------------
CREATE TABLE IF NOT EXISTS mh_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  display_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  onboarding_completed INTEGER DEFAULT 0,
  notification_preference TEXT DEFAULT 'none',
  preferences_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mh_profiles_user ON mh_profiles(user_id);

-- Check-ins: registro rapido de estado emocional (mood + estado) -----------------
CREATE TABLE IF NOT EXISTS mh_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  emotional_state TEXT NOT NULL,
  intensity INTEGER NOT NULL CHECK(intensity BETWEEN 1 AND 10),
  activation INTEGER NOT NULL CHECK(activation BETWEEN 1 AND 10),
  energy INTEGER NOT NULL CHECK(energy BETWEEN 1 AND 10),
  concentration INTEGER NOT NULL CHECK(concentration BETWEEN 1 AND 10),
  sleep_hours REAL,
  context TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mh_checkins_user_created ON mh_checkins(user_id, created_at);

-- Catalogo de intervenciones (seed abajo) ----------------------------------------
CREATE TABLE IF NOT EXISTS mh_interventions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  instructions TEXT NOT NULL,
  before_measurements TEXT NOT NULL,
  after_measurements TEXT NOT NULL,
  contraindications_or_limits TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Sesiones de intervencion con resultado antes/despues ---------------------------
CREATE TABLE IF NOT EXISTS mh_intervention_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  intervention_id INTEGER NOT NULL,
  before_intensity INTEGER NOT NULL CHECK(before_intensity BETWEEN 1 AND 10),
  after_intensity INTEGER NOT NULL CHECK(after_intensity BETWEEN 1 AND 10),
  delta INTEGER NOT NULL,
  completion INTEGER NOT NULL DEFAULT 1,
  duration_sec INTEGER,
  feedback INTEGER,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (intervention_id) REFERENCES mh_interventions(id)
);
CREATE INDEX IF NOT EXISTS idx_mh_sessions_user_created ON mh_intervention_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_mh_sessions_intervention ON mh_intervention_sessions(intervention_id);

-- Recomendaciones (motor V1: por que se recomendo, evidencia, confianza) ---------
CREATE TABLE IF NOT EXISTS mh_recommendations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  intervention_id INTEGER NOT NULL,
  source_checkin_id INTEGER,
  reason TEXT NOT NULL,
  evidence_json TEXT,
  confidence REAL NOT NULL DEFAULT 0.5,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (intervention_id) REFERENCES mh_interventions(id)
);
CREATE INDEX IF NOT EXISTS idx_mh_recs_user_created ON mh_recommendations(user_id, created_at);

-- Insights (patrones trazables, no repetitivos) -----------------------------------
CREATE TABLE IF NOT EXISTS mh_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  insight_key TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  evidence_json TEXT,
  period_start TEXT,
  period_end TEXT,
  variables_json TEXT,
  observation_count INTEGER DEFAULT 0,
  confidence REAL DEFAULT 0.5,
  status TEXT DEFAULT 'open',
  first_seen TEXT DEFAULT (datetime('now')),
  last_seen TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mh_insights_user_status ON mh_insights(user_id, status);
-- Deduplicacion: a lo sumo un insight "open" por clave y usuario.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mh_insights_user_key_open
  ON mh_insights(user_id, insight_key) WHERE status = 'open';

-- Consentimientos de privacidad granulares ----------------------------------------
CREATE TABLE IF NOT EXISTS mh_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  consent_type TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 1,
  granted_at TEXT DEFAULT (datetime('now')),
  revoked_at TEXT,
  version TEXT DEFAULT '1.0',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mh_consents_user ON mh_consents(user_id);

-- Diario (journal) minimal --------------------------------------------------------
CREATE TABLE IF NOT EXISTS mh_journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  linked_checkin_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (linked_checkin_id) REFERENCES mh_checkins(id)
);
CREATE INDEX IF NOT EXISTS idx_mh_journal_user_created ON mh_journal_entries(user_id, created_at);

-- ============================================
-- SEED: catalogo inicial de intervenciones
-- ============================================

INSERT OR IGNORE INTO mh_interventions (slug, title, description, duration_sec, category, difficulty, instructions, before_measurements, after_measurements, contraindications_or_limits) VALUES
('respiracion-478', 'Respiración 4-7-8', 'Técnica de respiración para reducir la activación: inhala 4s, mantén 7s, exhala 8s.', 180, 'breathing', 'facil', '1|Siéntate cómodamente con la espalda recta.\n2|Inhala suavemente por la nariz contando 4 segundos.\n3|Mantén la respiración contando 7 segundos.\n4|Exhala lentamente por la boca contando 8 segundos.\n5|Repite el ciclo durante 2-3 minutos.', '["intensity","activation"]', '["intensity","activation"]', 'Si te sientes mareada/o, detente y respira de forma natural. No lo fuerces si te resulta incómodo.'),
('respiracion-caja', 'Respiración cuadrada', 'Respiración de caja (4-4-4-4) para calmar el sistema nervioso.', 300, 'breathing', 'facil', '1|Inhala por la nariz contando 4 segundos.\n2|Mantén el aire contando 4 segundos.\n3|Exhala por la boca contando 4 segundos.\n4|Mantén los pulmones vacíos contando 4 segundos.\n5|Repite 4-6 ciclos.', '["intensity","activation"]', '["intensity","activation"]', 'No la practiques mientras conduces. Si aparece ansiedad intensa, vuelve a la respiración natural.'),
('grounding-54321', 'Aterrizaje 5-4-3-2-1', 'Técnica de aterrizaje sensorial para momentos de ansiedad o disociación.', 300, 'grounding', 'facil', '1|Observa y nombra 5 cosas que puedes ver a tu alrededor.\n2|Nombra 4 cosas que puedes tocar.\n3|Nombra 3 sonidos que puedes escuchar.\n4|Nombra 2 olores que puedes percibir.\n5|Nombra 1 sabor que puedes notar en tu boca.', '["intensity","activation"]', '["intensity","activation"]', 'Si estás en un entorno ruidoso, adapta los sonidos. Es una técnica de apoyo, no reemplaza ayuda profesional.'),
('atencion-plena-minuto', 'Minuto de atención plena', 'Un minuto de atención a la respiración para recuperar la concentración.', 60, 'mindfulness', 'facil', '1|Ponte un temporizador de 60 segundos.\n2|Lleva tu atención a la sensación del aire entrando y saliendo.\n3|Cada vez que notes un pensamiento, vuelve con calma a la respiración.\n4|Al terminar, abre los ojos y nota cómo te sientes.', '["intensity","activation"]', '["intensity","activation"]', 'Si te cuesta concentrarte, es normal. No se trata de vaciar la mente.'),
('relajacion-progresiva', 'Relajación muscular progresiva', 'Tensar y soltar grupos musculares para reducir tensión física y fatiga.', 480, 'relaxation', 'medio', '1|Siéntate o túmbate cómodamente.\n2|Tensa los puños 5 segundos y suelta por completo.\n3|Tensa los hombros hacia las orejas 5 segundos y suelta.\n4|Tensa la cara 5 segundos y suelta.\n5|Tensa piernas y pies 5 segundos y suelta.\n6|Termina con 30 segundos de respiración tranquila.', '["intensity","activation"]', '["intensity","activation"]', 'Evítala si tienes lesiones musculares o dolor agudo. Suelta siempre antes de notar calambres.'),
('pensamiento-cbt', 'Reestructuración de pensamiento', 'Ejercicio de estilo CBT: identificar un pensamiento automático y responder con evidencia.', 600, 'reflection', 'medio', '1|Identifica una situación que te esté alterando.\n2|Escribe el pensamiento automático asociado.\n3|Pregúntate: ¿qué evidencia apoya este pensamiento?\n4|Pregúntate: ¿qué evidencia lo contradice?\n5|Escribe un pensamiento alternativo más equilibrado.\n6|Nota cómo cambia tu intensidad emocional al considerar el nuevo pensamiento.', '["intensity","activation"]', '["intensity","activation"]', 'Este ejercicio no sustituye terapia profesional. Si aparecen ideas de daño, busca ayuda inmediata.');