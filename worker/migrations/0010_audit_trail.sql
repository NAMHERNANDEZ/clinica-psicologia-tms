-- FASE 1: Audit Trail completo
ALTER TABLE audit_logs ADD COLUMN old_value TEXT;
ALTER TABLE audit_logs ADD COLUMN new_value TEXT;
ALTER TABLE audit_logs ADD COLUMN request_id TEXT;
ALTER TABLE audit_logs ADD COLUMN session_id TEXT;
ALTER TABLE audit_logs ADD COLUMN correlation_id TEXT;
ALTER TABLE audit_logs ADD COLUMN result TEXT;
-- Backfill existing data
UPDATE audit_logs SET old_value = before_data WHERE old_value IS NULL AND before_data IS NOT NULL;
UPDATE audit_logs SET new_value = after_data WHERE new_value IS NULL AND after_data IS NOT NULL;
UPDATE audit_logs SET result = 'SUCCESS' WHERE result IS NULL AND action NOT LIKE '%fail%' AND action NOT LIKE '%error%';
