-- FASE 12.3: Consent lifecycle + document content + access logging

-- Consent lifecycle extensions
ALTER TABLE consents ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired'));
ALTER TABLE consents ADD COLUMN revoked_at TEXT;
ALTER TABLE consents ADD COLUMN revoked_by INTEGER;
ALTER TABLE consents ADD COLUMN witness_name TEXT;
ALTER TABLE consents ADD COLUMN witness_signature TEXT;
ALTER TABLE consents ADD COLUMN language TEXT DEFAULT 'es';
ALTER TABLE consents ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE consents ADD COLUMN template_id TEXT;
ALTER TABLE consents ADD COLUMN expires_at TEXT;
ALTER TABLE consents ADD COLUMN updated_at TEXT;

-- Document content extensions
ALTER TABLE documents ADD COLUMN content TEXT;
ALTER TABLE documents ADD COLUMN file_size INTEGER;
ALTER TABLE documents ADD COLUMN mime_type TEXT;
ALTER TABLE documents ADD COLUMN checksum_algorithm TEXT DEFAULT 'SHA-256';
ALTER TABLE documents ADD COLUMN description TEXT;
ALTER TABLE documents ADD COLUMN tags TEXT;

-- Consent templates (for generating standard consents)
CREATE TABLE IF NOT EXISTS consent_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CONSENTIMIENTO_TERAPIA', 'CONSENTIMIENTO_DATOS', 'CONSENTIMIENTO_TMS', 'CONSENTIMIENTO_TELEPSICOLOGIA', 'AVISO_PRIVACIDAD', 'CUSTOM')),
  content TEXT NOT NULL,
  language TEXT DEFAULT 'es',
  version INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_consent_templates_type ON consent_templates(type);

-- Seed default consent templates
INSERT OR IGNORE INTO consent_templates (clinic_id, name, type, content, language) VALUES
  (1, 'Consentimiento Informado - Terapia Psicologica', 'CONSENTIMIENTO_TERAPIA',
   'Yo, _________________________, manifiesto que he sido informado(a) de manera clara y comprensible sobre el proceso de terapia psicologica que se me propone, incluyendo sus objetivos, metodos, duracion estimada, beneficios esperados, riesgos posibles y alternativas de tratamiento. Declaro que tengo la oportunidad de hacer todas las preguntas que considere necesarias y que he recibido satisfactorias explicaciones. Entiendo que puedo retirar mi consentimiento en cualquier momento. Firma: _______________ Fecha: _______________', 'es'),
  (1, 'Consentimiento Informado - TMS', 'CONSENTIMIENTO_TMS',
   'Yo, _________________________, manifiesto que he sido informado(a) sobre la Terapia Magnetica Transcraneal (TMS), incluyendo: naturaleza del tratamiento, procedimiento, sesiones requeridas, posibles efectos secundarios, resultados esperados y cuidados posteriores. Entiendo que este tratamiento no garantiza resultados y que los efectos pueden variar segun cada persona. Declaro que he tenido la oportunidad de resolver todas mis dudas. Firma: _______________ Fecha: _______________', 'es'),
  (1, 'Aviso de Privacidad', 'AVISO_PRIVACIDAD',
   'Neurociencia Clinica, con domicilio en 5 de Febrero esquina con Benito Juarez, Xiutetelco Centro, Puebla, es responsable del tratamiento de sus datos personales. Sus datos seran utilizados exclusivamente para fins de atencion clinica, facturacion y cumplimiento normativo. Sus datos podran ser compartidos con autoridades sanitarias cuando la ley lo requiera. Puede ejercer sus derechos de acceso, rectificacion, cancelacion y oposicion contactando a nuestro departmento de privacidad.', 'es');

-- Access logging (who viewed what, when — NOM-004 / HIPAA requirement)
CREATE TABLE IF NOT EXISTS access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  user_id INTEGER NOT NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete', 'export', 'print', 'share')),
  resource_type TEXT NOT NULL,
  resource_id INTEGER,
  patient_id INTEGER,
  ip TEXT,
  user_agent TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_access_log_user ON access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_log_patient ON access_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_access_log_resource ON access_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_access_log_created ON access_log(created_at DESC);

-- Vital signs table (linked to clinical records or standalone)
CREATE TABLE IF NOT EXISTS vital_signs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  recorded_by INTEGER,
  systolic INTEGER,
  diastolic INTEGER,
  heart_rate INTEGER,
  temperature REAL,
  weight REAL,
  height REAL,
  oxygen_saturation INTEGER,
  notes TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded ON vital_signs(recorded_at DESC);
