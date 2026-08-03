-- FASE 5: Cron Manager Centralizado

CREATE TABLE IF NOT EXISTS cron_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  schedule TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  handler TEXT NOT NULL,
  description TEXT,
  last_run DATETIME,
  next_run DATETIME,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','success','failed')),
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(enabled);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run);

CREATE TABLE IF NOT EXISTS cron_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  started_at DATETIME NOT NULL DEFAULT (datetime('now')),
  finished_at DATETIME,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','success','failed')),
  error_message TEXT,
  result TEXT,
  FOREIGN KEY (job_id) REFERENCES cron_jobs(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cron_executions_job ON cron_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_cron_executions_started ON cron_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_cron_executions_status ON cron_executions(status);

CREATE TABLE IF NOT EXISTS cron_failures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  execution_id INTEGER,
  error_message TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES cron_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (execution_id) REFERENCES cron_executions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_cron_failures_job ON cron_failures(job_id);
CREATE INDEX IF NOT EXISTS idx_cron_failures_resolved ON cron_failures(resolved);