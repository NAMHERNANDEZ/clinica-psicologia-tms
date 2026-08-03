-- FASE 11.8: Chat IA Clinico - tablas de sesiones, mensajes y analytics

CREATE TABLE IF NOT EXISTS clinical_chat_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT NOT NULL DEFAULT (datetime('now')),
  message_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'transferred')),
  lead_id INTEGER,
  patient_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_clinic ON clinical_chat_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON clinical_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started ON clinical_chat_sessions(started_at DESC);

CREATE TABLE IF NOT EXISTS clinical_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  intent TEXT,
  confidence REAL DEFAULT 0.8,
  action TEXT,
  knowledge_used TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON clinical_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_intent ON clinical_chat_messages(intent);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON clinical_chat_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS clinical_chat_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  date TEXT NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  avg_confidence REAL DEFAULT 0,
  appointments_requested INTEGER DEFAULT 0,
  emergency_transfers INTEGER DEFAULT 0,
  leads_captured INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chat_analytics_date ON clinical_chat_analytics(date DESC);
