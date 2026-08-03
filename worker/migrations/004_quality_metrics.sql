-- FASE 4: QUALITY METRICS (ISO 9001)
CREATE TABLE IF NOT EXISTS quality_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  metric_type TEXT CHECK(metric_type IN (
    'treatment_completion_rate','patient_satisfaction','adverse_effect_rate',
    'session_attendance','protocol_adherence','clinical_improvement',
    'appointment_no_show_rate','average_wait_time','response_time_days'
  )) NOT NULL,
  value REAL NOT NULL,
  unit TEXT CHECK(unit IN ('%', 'hours', 'count', 'score')) NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

CREATE INDEX IF NOT EXISTS idx_quality_metrics_clinic ON quality_metrics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_type ON quality_metrics(clinic_id, metric_type);
