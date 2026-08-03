-- FASE 4: Backup Runs
CREATE TABLE IF NOT EXISTS backup_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed','verifying')),
  storage_key TEXT,
  sha256 TEXT,
  size_bytes INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_backup_runs_status ON backup_runs(status);
CREATE INDEX IF NOT EXISTS idx_backup_runs_created ON backup_runs(created_at);
