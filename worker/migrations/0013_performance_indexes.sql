-- ============================================
-- FASE 6: PERFORMANCE INDEXES
-- ============================================

-- Audit trail indexes
CREATE INDEX IF NOT EXISTS idx_audit_module_action ON audit_logs(module, action);
CREATE INDEX IF NOT EXISTS idx_audit_correlation_id ON audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity_action ON audit_logs(entity, action);

-- Document management indexes
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_documents_storage_key ON documents(storage_key);

-- Compliance engine indexes
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status_severity ON compliance_alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status_category ON compliance_alerts(status, category);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_open_category ON compliance_alerts(status, category, severity);
CREATE INDEX IF NOT EXISTS idx_compliance_runs_started ON compliance_runs(started_at);

-- Backup runs indexes
CREATE INDEX IF NOT EXISTS idx_backup_runs_status_created ON backup_runs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_backup_runs_storage_key ON backup_runs(storage_key);

-- Session notes indexes
CREATE INDEX IF NOT EXISTS idx_session_notes_patient_date ON session_notes(patient_id, session_date);

-- Clinical records indexes
CREATE INDEX IF NOT EXISTS idx_clinical_records_patient ON clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_complete ON clinical_records(patient_id, reason_consultation);

-- Quality metrics indexes
CREATE INDEX IF NOT EXISTS idx_quality_metrics_type_period ON quality_metrics(metric_type, period_start);

-- Consent indexes
CREATE INDEX IF NOT EXISTS idx_consents_patient_type ON consents(patient_id, type);

-- TMS engine indexes
CREATE INDEX IF NOT EXISTS idx_motor_thresholds_patient ON motor_thresholds(patient_id);
CREATE INDEX IF NOT EXISTS idx_motor_thresholds_patient_date ON motor_thresholds(patient_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_tms_patient_profiles_patient ON tms_patient_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_tms_patient_profiles_status ON tms_patient_profiles(status);
CREATE INDEX IF NOT EXISTS idx_tms_sessions_profile ON tms_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_adverse_effects_session ON adverse_effects(tms_session_id);
CREATE INDEX IF NOT EXISTS idx_adverse_effects_patient ON adverse_effects(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_response_session ON clinical_response_tracking(tms_session_id);

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_date ON appointments(patient_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Reminders indexes
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders_queue(scheduled_at, status);

-- Reception queue indexes
CREATE INDEX IF NOT EXISTS idx_reception_priority ON reception_queue(priority, status);

-- Security incidents indexes
CREATE INDEX IF NOT EXISTS idx_security_incidents_clinic_resolved ON security_incidents(clinic_id, resolved_at);

-- Patient timeline indexes
CREATE INDEX IF NOT EXISTS idx_patient_timeline_patient ON patient_timeline_events(patient_id, created_at);

-- TWIN / SIMULATION indexes
CREATE INDEX IF NOT EXISTS idx_twin_patient_session ON twin_predictions(patient_id, session_number);
CREATE INDEX IF NOT EXISTS idx_simulation_patient ON simulation_comparisons(patient_id, created_at);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);