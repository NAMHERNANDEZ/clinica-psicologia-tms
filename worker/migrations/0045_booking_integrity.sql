-- Integridad anti-abuso de reservas (2026-09-14):
-- 1. rate_limits: el repo nunca tuvo su DDL (el codigo la usa; en prod existe).
-- 2. booking_requests: ciclo de vida solicitud -> verificacion -> confirmacion -> cita.
--    Sin solicitud verificada+confirmada NO hay evento Calendar (gate en backend).
-- 3. Holds con TTL: claims vinculados a request expiran con ella (15 min).
-- 4. booking_sessions.request_id: vinculo conversacion <-> solicitud.

CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TEXT DEFAULT (datetime('now')),
  UNIQUE(ip_address, endpoint)
);

CREATE TABLE IF NOT EXISTS booking_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  session_id TEXT,
  ip TEXT,
  appt_type TEXT,
  modality TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  patient_name TEXT,
  email TEXT,
  phone TEXT,
  email_hash TEXT,
  phone_hash TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'verified', 'confirmed', 'cancelled', 'expired', 'flagged')),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'contact_validated', 'flagged')),
  expires_at TEXT NOT NULL,
  verified_at TEXT,
  confirmed_at TEXT,
  cancelled_at TEXT,
  calendar_event_id TEXT,
  cancel_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_breq_phone ON booking_requests(phone_hash);
CREATE INDEX IF NOT EXISTS idx_breq_email ON booking_requests(email_hash);
CREATE INDEX IF NOT EXISTS idx_breq_session ON booking_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_breq_status_exp ON booking_requests(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_breq_slot ON booking_requests(date, time);

ALTER TABLE booking_slot_claims ADD COLUMN request_id INTEGER;
ALTER TABLE booking_sessions ADD COLUMN request_id INTEGER;
