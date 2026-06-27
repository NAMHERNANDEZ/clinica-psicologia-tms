-- ============================================
-- CLINICA TMS - FASE 1+2+3 SCHEMA
-- Cloudflare D1
-- ============================================

-- CLINICS (multi-tenant)
CREATE TABLE IF NOT EXISTS clinics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- USERS (auth + RBAC)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin','therapist','reception','patient')) NOT NULL,
  refresh_token TEXT,
  refresh_token_expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- PATIENTS
CREATE TABLE IF NOT EXISTS patients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  birthdate TEXT,
  status TEXT CHECK(status IN ('active','inactive','discharged')) DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- THERAPISTS
CREATE TABLE IF NOT EXISTS therapists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  user_id INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialty TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  therapist_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER DEFAULT 60,
  status TEXT CHECK(status IN ('scheduled','completed','cancelled','no_show','rescheduled')) DEFAULT 'scheduled',
  reminder_24h_sent INTEGER DEFAULT 0,
  reminder_1h_sent INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id)
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  before_data TEXT,
  after_data TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- RATE LIMITS
CREATE TABLE IF NOT EXISTS rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TEXT DEFAULT (datetime('now')),
  UNIQUE(ip_address, endpoint)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(clinic_id, name);
CREATE INDEX IF NOT EXISTS idx_therapists_clinic ON therapists(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_reminder ON appointments(date, time, reminder_24h_sent, reminder_1h_sent);
CREATE INDEX IF NOT EXISTS idx_audit_clinic ON audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address);

-- ============================================
-- FASE 2: OPERACION CLINICA
-- ============================================

-- REMINDERS QUEUE
CREATE TABLE IF NOT EXISTS reminders_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  appointment_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  therapist_id INTEGER NOT NULL,
  type TEXT CHECK(type IN ('24h','1h')) NOT NULL,
  status TEXT CHECK(status IN ('pending','sent','opened')) DEFAULT 'pending',
  scheduled_at TEXT NOT NULL,
  sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id)
);

-- NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  user_id INTEGER,
  appointment_id INTEGER,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT CHECK(channel IN ('whatsapp','email','internal')) DEFAULT 'internal',
  status TEXT CHECK(status IN ('sent','failed','opened')) DEFAULT 'sent',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- MESSAGE TEMPLATES
CREATE TABLE IF NOT EXISTS message_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK(type IN ('whatsapp','email')) NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- RECEPTION QUEUE
CREATE TABLE IF NOT EXISTS reception_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  appointment_id INTEGER,
  patient_id INTEGER,
  priority TEXT CHECK(priority IN ('low','medium','high','urgent')) DEFAULT 'medium',
  status TEXT CHECK(status IN ('waiting','in_progress','done')) DEFAULT 'waiting',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- INTERNAL ALERTS
CREATE TABLE IF NOT EXISTS internal_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('info','warning','critical')) DEFAULT 'info',
  read INTEGER DEFAULT 0,
  entity TEXT,
  entity_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- ============================================
-- FASE 3: CLINICO (TRATAMIENTOS + NOTAS + TIMELINE)
-- ============================================

-- TREATMENTS
CREATE TABLE IF NOT EXISTS treatments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  therapist_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  protocol TEXT,
  total_sessions INTEGER NOT NULL DEFAULT 20,
  completed_sessions INTEGER NOT NULL DEFAULT 0,
  status TEXT CHECK(status IN ('active','completed','paused','cancelled')) DEFAULT 'active',
  start_date TEXT NOT NULL,
  end_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id)
);

-- CLINICAL NOTES
CREATE TABLE IF NOT EXISTS clinical_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  therapist_id INTEGER NOT NULL,
  appointment_id INTEGER,
  treatment_id INTEGER,
  note TEXT NOT NULL,
  note_type TEXT CHECK(note_type IN ('session','assessment','progress','discharge')) DEFAULT 'session',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id)
);

-- PATIENT TIMELINE EVENTS
CREATE TABLE IF NOT EXISTS patient_timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entity TEXT,
  entity_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  treatment_id INTEGER NOT NULL,
  appointment_id INTEGER,
  session_number INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending','completed','cancelled','no_show')) DEFAULT 'pending',
  notes TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (treatment_id) REFERENCES treatments(id)
);

-- ============================================
-- FASE 2+3 INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reminders_clinic ON reminders_queue(clinic_id);
CREATE INDEX IF NOT EXISTS idx_reminders_appointment ON reminders_queue(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic ON notification_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_templates_clinic ON message_templates(clinic_id);
CREATE INDEX IF NOT EXISTS idx_reception_clinic ON reception_queue(clinic_id);
CREATE INDEX IF NOT EXISTS idx_reception_status ON reception_queue(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_clinic ON internal_alerts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON internal_alerts(clinic_id, read);
CREATE INDEX IF NOT EXISTS idx_treatments_clinic ON treatments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_notes_clinic ON clinical_notes(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_timeline_clinic ON patient_timeline_events(clinic_id);
CREATE INDEX IF NOT EXISTS idx_timeline_patient ON patient_timeline_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_clinic ON sessions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_sessions_treatment ON sessions(treatment_id);

-- ============================================
-- FASE 5: TMS CLINICAL ENGINE (NEUROMODULACION)
-- ============================================

-- TMS PROTOCOLS (templates de tratamiento)
CREATE TABLE IF NOT EXISTS tms_protocols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  indication TEXT NOT NULL,
  target_area TEXT NOT NULL,
  frequency_hz REAL NOT NULL,
  intensity_pct_mt REAL NOT NULL,
  pulses_per_session INTEGER NOT NULL,
  session_duration_min INTEGER NOT NULL,
  total_sessions INTEGER NOT NULL DEFAULT 20,
  rest_period_sec INTEGER DEFAULT 30,
  stimulation_type TEXT CHECK(stimulation_type IN ('high_freq','low_freq','theta_burst','intermittent','continuous')) DEFAULT 'high_freq',
  evidence_level TEXT CHECK(evidence_level IN ('strong','moderate','emerging')) DEFAULT 'moderate',
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- MOTOR THRESHOLDS (mediciones por paciente)
CREATE TABLE IF NOT EXISTS motor_thresholds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  therapist_id INTEGER NOT NULL,
  mt_pct REAL NOT NULL,
  measured_at TEXT NOT NULL,
  coil_type TEXT,
  stimulation_site TEXT DEFAULT 'M1',
  method TEXT CHECK(method IN ('relative','active','resting')) DEFAULT 'active',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id)
);

-- PATIENT TMS PROFILES (asignacion de protocolo a paciente)
CREATE TABLE IF NOT EXISTS tms_patient_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  protocol_id INTEGER NOT NULL,
  therapist_id INTEGER NOT NULL,
  motor_threshold_id INTEGER,
  assigned_diagnosis TEXT NOT NULL,
  baseline_bdi REAL,
  baseline_gad7 REAL,
  baseline_phq9 REAL,
  status TEXT CHECK(status IN ('evaluation','active','completed','discontinued')) DEFAULT 'evaluation',
  start_date TEXT,
  end_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (protocol_id) REFERENCES tms_protocols(id),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id),
  FOREIGN KEY (motor_threshold_id) REFERENCES motor_thresholds(id)
);

-- TMS SESSIONS (sesiones neuroclinicas)
CREATE TABLE IF NOT EXISTS tms_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  profile_id INTEGER NOT NULL,
  session_number INTEGER NOT NULL,
  appointment_id INTEGER,
  motor_threshold_pct REAL NOT NULL,
  intensity_pct_mt REAL NOT NULL,
  effective_intensity REAL NOT NULL,
  target_area TEXT NOT NULL,
  coil_position TEXT,
  frequency_hz REAL NOT NULL,
  pulses_delivered INTEGER NOT NULL,
  session_duration_min INTEGER NOT NULL,
  stimulation_type TEXT NOT NULL,
  status TEXT CHECK(status IN ('scheduled','in_progress','completed','cancelled','no_show')) DEFAULT 'scheduled',
  notes TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (profile_id) REFERENCES tms_patient_profiles(id)
);

-- CLINICAL RESPONSE TRACKING (scores por sesion)
CREATE TABLE IF NOT EXISTS clinical_response_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  tms_session_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  mood_score REAL CHECK(mood_score >= 1 AND mood_score <= 10),
  energy_score REAL CHECK(energy_score >= 1 AND energy_score <= 10),
  anxiety_score REAL CHECK(anxiety_score >= 1 AND anxiety_score <= 10),
  sleep_score REAL CHECK(sleep_score >= 1 AND sleep_score <= 10),
  concentration_score REAL CHECK(concentration_score >= 1 AND concentration_score <= 10),
  overall_response REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (tms_session_id) REFERENCES tms_sessions(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ADVERSE EFFECTS MONITORING
CREATE TABLE IF NOT EXISTS adverse_effects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  tms_session_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  effect_type TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('mild','moderate','severe')) DEFAULT 'mild',
  description TEXT,
  onset_time TEXT,
  duration_min INTEGER,
  resolved INTEGER DEFAULT 0,
  action_taken TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (tms_session_id) REFERENCES tms_sessions(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- CLINICAL ASSESSMENTS (escalas validadas)
CREATE TABLE IF NOT EXISTS clinical_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  therapist_id INTEGER NOT NULL,
  assessment_type TEXT CHECK(assessment_type IN ('bdi','gad7','phq9','пси','custom')) NOT NULL,
  score REAL NOT NULL,
  max_score REAL,
  interpretation TEXT,
  administered_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (therapist_id) REFERENCES therapists(id)
);

-- TMS ENGINE RULES (reglas de decision clinica)
CREATE TABLE IF NOT EXISTS tms_engine_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  rule_type TEXT NOT NULL,
  condition_text TEXT NOT NULL,
  action_text TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- ============================================
-- FASE 5 INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tms_protocols_clinic ON tms_protocols(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tms_protocols_indication ON tms_protocols(clinic_id, indication);
CREATE INDEX IF NOT EXISTS idx_mt_patient ON motor_thresholds(patient_id);
CREATE INDEX IF NOT EXISTS idx_mt_clinic ON motor_thresholds(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tms_profiles_patient ON tms_patient_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_tms_profiles_clinic ON tms_patient_profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tms_profiles_status ON tms_patient_profiles(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_tms_sessions_profile ON tms_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_tms_sessions_clinic ON tms_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tms_sessions_status ON tms_sessions(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_response_session ON clinical_response_tracking(tms_session_id);
CREATE INDEX IF NOT EXISTS idx_response_patient ON clinical_response_tracking(patient_id);
CREATE INDEX IF NOT EXISTS idx_adverse_session ON adverse_effects(tms_session_id);
CREATE INDEX IF NOT EXISTS idx_adverse_patient ON adverse_effects(patient_id);
CREATE INDEX IF NOT EXISTS idx_assessments_patient ON clinical_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_assessments_clinic ON clinical_assessments(clinic_id);

-- ============================================
-- FASE 7: REAL-TIME TMS SIMULATOR
-- ============================================

-- STIMULATION PARAMETERS (parametros por sesion)
CREATE TABLE IF NOT EXISTS stimulation_parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  tms_session_id INTEGER NOT NULL,
  frequency_hz REAL NOT NULL,
  intensity_pct_mt REAL NOT NULL,
  pulse_count INTEGER NOT NULL,
  coil_position TEXT NOT NULL,
  coil_angle REAL DEFAULT 0,
  train_duration_sec REAL NOT NULL,
  intertrain_interval_sec REAL NOT NULL,
  total_trains INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (tms_session_id) REFERENCES tms_sessions(id)
);

-- TWIN PREDICTIONS (predicciones del digital twin)
CREATE TABLE IF NOT EXISTS twin_predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  session_number INTEGER NOT NULL,
  predicted_mood REAL,
  predicted_anxiety REAL,
  predicted_energy REAL,
  predicted_sleep REAL,
  predicted_concentration REAL,
  predicted_overall REAL,
  confidence REAL NOT NULL,
  risk_score REAL DEFAULT 0,
  rule_applied TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- TMS ALERT RULES (reglas de alerta configurables)
CREATE TABLE IF NOT EXISTS tms_alert_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  condition_config TEXT NOT NULL,
  severity TEXT CHECK(severity IN ('info','warning','critical')) DEFAULT 'warning',
  message_template TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id)
);

-- SIMULATION COMPARISONS (comparaciones de protocolos)
CREATE TABLE IF NOT EXISTS simulation_comparisons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  protocol_a_id INTEGER NOT NULL,
  protocol_b_id INTEGER NOT NULL,
  result_a TEXT NOT NULL,
  result_b TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

-- ============================================
-- FASE 7 INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_stim_params_session ON stimulation_parameters(tms_session_id);
CREATE INDEX IF NOT EXISTS idx_stim_params_clinic ON stimulation_parameters(clinic_id);
CREATE INDEX IF NOT EXISTS idx_twin_patient ON twin_predictions(patient_id);
CREATE INDEX IF NOT EXISTS idx_twin_clinic ON twin_predictions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_twin_session ON twin_predictions(patient_id, session_number);
CREATE INDEX IF NOT EXISTS idx_alert_rules_clinic ON tms_alert_rules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_simulation_clinic ON simulation_comparisons(clinic_id);
