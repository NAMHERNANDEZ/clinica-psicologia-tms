-- FASE 1: Expandir audit_logs con module y severity
ALTER TABLE audit_logs ADD COLUMN module TEXT NOT NULL DEFAULT 'general';
ALTER TABLE audit_logs ADD COLUMN severity TEXT CHECK(severity IN ('info','warning','critical')) DEFAULT 'info';
-- Backfill existing data
UPDATE audit_logs SET module = 'general' WHERE module IS NULL OR module = '';
UPDATE audit_logs SET severity = 'info' WHERE severity IS NULL;