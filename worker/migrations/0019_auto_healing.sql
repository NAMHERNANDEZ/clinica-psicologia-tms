-- FASE 5.2: Auto-Healing Engine

CREATE TABLE IF NOT EXISTS healing_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK(condition_type IN ('threshold','count','rate','anomaly')),
  condition_config TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  action_type TEXT NOT NULL CHECK(action_type IN ('CLEAR_CACHE','RETRY_JOB','CREATE_INCIDENT','SEND_ALERT','DISABLE_JOB','BLOCK_IP','ANALYZE_QUERY','RESTART_WORKER')),
  action_config TEXT,
  cooldown_seconds INTEGER NOT NULL DEFAULT 300,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_healing_rules_enabled ON healing_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_healing_rules_code ON healing_rules(code);

CREATE TABLE IF NOT EXISTS healing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_code TEXT NOT NULL,
  detected_at DATETIME NOT NULL DEFAULT (datetime('now')),
  severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  condition_value TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  action_config TEXT,
  status TEXT NOT NULL DEFAULT 'DETECTED' CHECK(status IN ('DETECTED','RUNNING','SUCCESS','FAILED','ESCALATED')),
  result TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  resolved_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_healing_events_rule ON healing_events(rule_code);
CREATE INDEX IF NOT EXISTS idx_healing_events_status ON healing_events(status);
CREATE INDEX IF NOT EXISTS idx_healing_events_detected ON healing_events(detected_at);

CREATE TABLE IF NOT EXISTS healing_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  started_at DATETIME NOT NULL DEFAULT (datetime('now')),
  finished_at DATETIME,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','RUNNING','SUCCESS','FAILED')),
  result TEXT,
  error_message TEXT,
  FOREIGN KEY (event_id) REFERENCES healing_events(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_healing_actions_event ON healing_actions(event_id);
CREATE INDEX IF NOT EXISTS idx_healing_actions_status ON healing_actions(status);