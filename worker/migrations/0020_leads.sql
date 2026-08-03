-- FASE 11.1: Captura de leads (solicitudes del chat)

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  nombre TEXT,
  telefono TEXT,
  ciudad TEXT,
  servicio_interesado TEXT,
  motivo TEXT,
  estado TEXT NOT NULL DEFAULT 'NUEVO'
    CHECK(estado IN ('NUEVO','CONTACTADO','CITA_CONFIRMADA','ATENDIDO','CERRADO')),
  origen TEXT NOT NULL DEFAULT 'chat',
  fecha_creacion DATETIME NOT NULL DEFAULT (datetime('now')),
  fecha_actualizacion DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_creacion ON leads(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_leads_clinic ON leads(clinic_id);
