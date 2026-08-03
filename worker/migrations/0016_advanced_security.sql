-- FASE 3: Advanced Security

CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME NOT NULL DEFAULT (datetime('now')),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  user_id INTEGER,
  clinic_id INTEGER,
  ip TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  country TEXT,
  city TEXT,
  details TEXT NOT NULL,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

CREATE TABLE IF NOT EXISTS blocked_ips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_by INTEGER,
  blocked_at DATETIME NOT NULL DEFAULT (datetime('now')),
  expires_at DATETIME,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON blocked_ips(active, expires_at);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip);

CREATE TABLE IF NOT EXISTS device_fingerprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  ip TEXT NOT NULL,
  country TEXT,
  city TEXT,
  is_trusted INTEGER NOT NULL DEFAULT 0,
  first_seen DATETIME NOT NULL DEFAULT (datetime('now')),
  last_seen DATETIME NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, fingerprint)
);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON device_fingerprints(user_id);
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fingerprint ON device_fingerprints(fingerprint);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  device_fingerprint TEXT,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  country TEXT,
  city TEXT,
  created_at DATETIME NOT NULL DEFAULT (datetime('now')),
  expires_at DATETIME NOT NULL,
  last_activity DATETIME NOT NULL DEFAULT (datetime('now')),
  revoked INTEGER NOT NULL DEFAULT 0,
  revoked_by INTEGER,
  revoked_at DATETIME,
  revoke_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON user_sessions(revoked, expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  email TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  first_attempt DATETIME NOT NULL DEFAULT (datetime('now')),
  last_attempt DATETIME NOT NULL DEFAULT (datetime('now')),
  blocked_until DATETIME,
  UNIQUE(ip, email)
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip);
CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked ON login_attempts(blocked_until);

CREATE TABLE IF NOT EXISTS secret_rotation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  secret_name TEXT NOT NULL,
  rotated_at DATETIME NOT NULL DEFAULT (datetime('now')),
  rotated_by INTEGER,
  old_version TEXT,
  new_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('SUCCESS','FAILED')),
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_secret_rotation_name ON secret_rotation_log(secret_name);
CREATE INDEX IF NOT EXISTS idx_secret_rotation_date ON secret_rotation_log(rotated_at);

CREATE TABLE IF NOT EXISTS document_integrity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  sha256_hash TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'SHA-256',
  checked_at DATETIME NOT NULL DEFAULT (datetime('now')),
  checked_by INTEGER,
  is_valid INTEGER NOT NULL DEFAULT 1,
  previous_hash TEXT,
  previous_checked_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_document_integrity_doc ON document_integrity(document_id);
CREATE INDEX IF NOT EXISTS idx_document_integrity_checked ON document_integrity(checked_at);