-- FASE 12.4: Consentimientos avanzados
-- Firma digital, ciclo de vida, versionado, auditoria completa

-- Plantillas adicionales de consentimientos
INSERT OR IGNORE INTO consent_templates (clinic_id, name, type, content, language) VALUES
  (1, 'Consentimiento Comunicación WhatsApp/Email', 'COMUNICACION_WHATSAPP',
   'Autorizo a Neurociencia Clínica a contactarme vía WhatsApp, correo electrónico o SMS para: recordatorios de citas, confirmaciones, información clínica relevante, seguimiento de tratamiento y comunicaciones administrativas. Entiendo que puedo revocar esta autorización en cualquier momento.', 'es'),
  (1, 'Consentimiento Uso de Datos Clínicos', 'DATOS_CLINICOS',
   'Autorizo el uso anonimizado de mis datos clínicos para fines de investigación, mejora de calidad, estadísticas internas y desarrollo de protocolos. Mis datos personales identificables no serán compartidos. Puedo revocar esta autorización sin afectar mi atención.', 'es'),
  (1, 'Consentimiento Telepsicología', 'CONSENTIMIENTO_TELEPSICOLOGIA',
   'Consiento recibir atención psicológica mediante videoconferencia. Entiendo las limitaciones técnicas, la confidencialidad se mantiene bajo los mismos estándares que la atención presencial, y puedo solicitar cambio a modalidad presencial.', 'es');

-- Firma digital de consentimientos
CREATE TABLE IF NOT EXISTS consent_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  consent_id INTEGER NOT NULL,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('patient', 'therapist', 'witness', 'guardian')),
  signer_name TEXT NOT NULL,
  signer_user_id INTEGER,
  signature_hash TEXT NOT NULL,
  signed_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  metadata_json TEXT,
  FOREIGN KEY (consent_id) REFERENCES consents(id)
);

CREATE INDEX IF NOT EXISTS idx_consent_signatures_consent ON consent_signatures(consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_signatures_signer ON consent_signatures(signer_type);

-- Versionado de consentimientos (historial de documentos firmados)
CREATE TABLE IF NOT EXISTS consent_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  consent_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  changed_by INTEGER,
  change_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (consent_id) REFERENCES consents(id)
);

CREATE INDEX IF NOT EXISTS idx_consent_versions_consent ON consent_versions(consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_versions_version ON consent_versions(consent_id, version);

-- Ciclo de vida: DRAFT -> PENDING_SIGNATURE -> SIGNED -> ACTIVE -> EXPIRED/REVOKED
ALTER TABLE consents ADD COLUMN lifecycle TEXT DEFAULT 'draft';
ALTER TABLE consents ADD COLUMN signed_at TEXT;
ALTER TABLE consents ADD COLUMN signed_by INTEGER;
ALTER TABLE consents ADD COLUMN signed_by_name TEXT;
ALTER TABLE consents ADD COLUMN signer_type TEXT DEFAULT 'patient';
ALTER TABLE consents ADD COLUMN signature_hash TEXT;
ALTER TABLE consents ADD COLUMN user_agent TEXT;
ALTER TABLE consents ADD COLUMN metadata_json TEXT;
ALTER TABLE consents ADD COLUMN revoked_reason TEXT;
ALTER TABLE consents ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE consents ADD COLUMN updated_by INTEGER;

-- Indices
CREATE INDEX IF NOT EXISTS idx_consents_lifecycle ON consents(lifecycle);
CREATE INDEX IF NOT EXISTS idx_consents_signed ON consents(signed_at);
CREATE INDEX IF NOT EXISTS idx_consents_status ON consents(status);
