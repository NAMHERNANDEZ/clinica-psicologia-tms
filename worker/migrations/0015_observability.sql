-- FASE 7: Observability

CREATE TABLE IF NOT EXISTS observability_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now')),
  level TEXT NOT NULL CHECK(level IN ('DEBUG','INFO','WARNING','ERROR','CRITICAL')),
  category TEXT NOT NULL,
  service TEXT NOT NULL,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  request_id TEXT,
  user_id INTEGER,
  clinic_id INTEGER,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ms',
  collected_at DATETIME NOT NULL DEFAULT (datetime('now')),
  tags TEXT
);

CREATE TABLE IF NOT EXISTS health_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subsystem TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('HEALTHY','DEGRADED','UNHEALTHY')),
  response_ms INTEGER,
  checked_at DATETIME NOT NULL DEFAULT (datetime('now')),
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_obs_timestamp ON observability_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_obs_service ON observability_events(service);
CREATE INDEX IF NOT EXISTS idx_obs_level ON observability_events(level);
CREATE INDEX IF NOT EXISTS idx_health_time ON health_history(checked_at);
CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON performance_metrics(metric_name, collected_at);