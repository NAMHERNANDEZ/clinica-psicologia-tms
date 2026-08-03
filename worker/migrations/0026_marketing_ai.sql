-- FASE 11.7: Marketing AI — contenido, campanas, SEO y auditoria de generacion IA

-- Contenido generado (blog/social/email/whatsapp) con validacion clinica
CREATE TABLE IF NOT EXISTS marketing_content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  content_type TEXT NOT NULL DEFAULT 'social',
  topic TEXT NOT NULL,
  content_json TEXT NOT NULL,
  validation_score INTEGER NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL DEFAULT 'requires_review',
  model TEXT,
  source TEXT NOT NULL DEFAULT 'template',
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  created_by INTEGER,
  reviewed_by INTEGER,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_marketing_content_clinic ON marketing_content(clinic_id);
CREATE INDEX IF NOT EXISTS idx_marketing_content_status ON marketing_content(status);

-- Campanas de marketing generadas
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  campaign_json TEXT NOT NULL,
  validation_score INTEGER NOT NULL DEFAULT 0,
  validation_status TEXT NOT NULL DEFAULT 'requires_review',
  model TEXT,
  source TEXT NOT NULL DEFAULT 'template',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by INTEGER,
  reviewed_by INTEGER,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_clinic ON marketing_campaigns(clinic_id);

-- Analisis SEO
CREATE TABLE IF NOT EXISTS seo_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  keyword TEXT NOT NULL,
  seo_json TEXT NOT NULL,
  model TEXT,
  source TEXT NOT NULL DEFAULT 'template',
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_seo_analysis_clinic ON seo_analysis(clinic_id);

-- Auditoria de generacion IA (rastreo de cada llamada)
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  model TEXT,
  source TEXT,
  validation_score INTEGER,
  validation_status TEXT,
  prompt_hash TEXT,
  latency_ms INTEGER,
  created_by INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_audit_clinic ON ai_audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_action ON ai_audit_logs(action);
