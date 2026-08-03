-- FASE 2: Document Management
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  document_type TEXT NOT NULL CHECK(document_type IN (
    'CONSENTIMIENTO_INFORMADO','AVISO_PRIVACIDAD','EXPEDIENTE',
    'NOTA_CLINICA','EVALUACION','PLAN_TRATAMIENTO','FORMATO_ADMISION',
    'RECETA','REFERENCIA','CONTRATO'
  )),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN (
    'DRAFT','GENERATED','SIGNED','SUPERSEDED','ARCHIVED'
  )),
  version INTEGER DEFAULT 1,
  hash TEXT,
  storage_key TEXT,
  signed_by TEXT,
  signed_at TEXT,
  expires_at TEXT,
  metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);
CREATE INDEX IF NOT EXISTS idx_documents_patient ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_patient_type ON documents(patient_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_expires ON documents(expires_at);
