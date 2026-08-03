-- FASE 12.1: Patient demographics overhaul (NOM-004 / ISO 27789)
-- Adds: CURP, gender, address, emergency contact, insurance, allergies, medications, photo

-- New columns via ALTER TABLE (idempotent: each guarded)
ALTER TABLE patients ADD COLUMN curp TEXT;
ALTER TABLE patients ADD COLUMN gender TEXT CHECK (gender IN ('M', 'F', 'Otro', ''));
ALTER TABLE patients ADD COLUMN marital_status TEXT;
ALTER TABLE patients ADD COLUMN address_street TEXT;
ALTER TABLE patients ADD COLUMN address_city TEXT;
ALTER TABLE patients ADD COLUMN address_state TEXT;
ALTER TABLE patients ADD COLUMN address_zip TEXT;
ALTER TABLE patients ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE patients ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE patients ADD COLUMN emergency_contact_relationship TEXT;
ALTER TABLE patients ADD COLUMN insurance_provider TEXT;
ALTER TABLE patients ADD COLUMN insurance_id TEXT;
ALTER TABLE patients ADD COLUMN occupation TEXT;
ALTER TABLE patients ADD COLUMN nationality TEXT DEFAULT 'Mexicana';
ALTER TABLE patients ADD COLUMN photo_url TEXT;
ALTER TABLE patients ADD COLUMN allergies TEXT;
ALTER TABLE patients ADD COLUMN current_medications TEXT;
ALTER TABLE patients ADD COLUMN medical_history TEXT;
ALTER TABLE patients ADD COLUMN family_history TEXT;
ALTER TABLE patients ADD COLUMN social_history TEXT;
ALTER TABLE patients ADD COLUMN blood_type TEXT;
ALTER TABLE patients ADD COLUMN referral_source TEXT;
ALTER TABLE patients ADD COLUMN updated_at TEXT;

-- Emergency contacts table (separate, for multiple contacts)
CREATE TABLE IF NOT EXISTS patient_emergency_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  is_primary INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX IF NOT EXISTS idx_emergency_patient ON patient_emergency_contacts(patient_id);

-- Insurance table (multiple insurance records per patient)
CREATE TABLE IF NOT EXISTS patient_insurance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  provider TEXT NOT NULL,
  policy_number TEXT,
  group_number TEXT,
  effective_date TEXT,
  expiry_date TEXT,
  is_primary INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX IF NOT EXISTS idx_insurance_patient ON patient_insurance(patient_id);

-- Allergies table (separate, for drug interaction checks)
CREATE TABLE IF NOT EXISTS patient_allergies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  allergen TEXT NOT NULL,
  severity TEXT DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
  reaction TEXT,
  onset_date TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX IF NOT EXISTS idx_allergies_patient ON patient_allergies(patient_id);

-- Medications table (for reconciliation)
CREATE TABLE IF NOT EXISTS patient_medications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  clinic_id INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  route TEXT,
  prescribing_doctor TEXT,
  start_date TEXT,
  end_date TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discontinued', 'completed')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE INDEX IF NOT EXISTS idx_medications_patient ON patient_medications(patient_id);
