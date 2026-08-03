-- FASE 6: Disaster Recovery
CREATE TABLE IF NOT EXISTS restore_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  backup_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed','verifying')),
  restore_type TEXT NOT NULL CHECK(restore_type IN ('full','partial','fire_drill')),
  target_backup_key TEXT,
  rows_restored INTEGER DEFAULT 0,
  tables_restored INTEGER DEFAULT 0,
  integrity_check_passed INTEGER DEFAULT 0,
  error_message TEXT,
  restored_by_user_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_restore_attempts_clinic ON restore_attempts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_restore_attempts_backup ON restore_attempts(backup_id);
CREATE INDEX IF NOT EXISTS idx_restore_attempts_status ON restore_attempts(status);
CREATE INDEX IF NOT EXISTS idx_restore_attempts_type ON restore_attempts(restore_type);