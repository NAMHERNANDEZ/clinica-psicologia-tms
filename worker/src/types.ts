export type Role = 'admin' | 'therapist' | 'reception' | 'patient';
export type PatientStatus = 'active' | 'inactive' | 'discharged';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  REFRESH_SECRET: string;
  ENCRYPTION_KEY: string;
  ALLOWED_ORIGINS: string;
  SETUP_TOKEN: string;
  BACKUPS_BUCKET?: R2Bucket;
  GEMINI_API_KEY?: string;
}

export interface Clinic {
  id: number;
  name: string;
  created_at: string;
}

export interface User {
  id: number;
  clinic_id: number;
  email: string;
  password_hash: string;
  role: Role;
  refresh_token?: string;
  refresh_token_expires_at?: string;
  created_at: string;
}

export interface Patient {
  id: number;
  clinic_id: number;
  name: string;
  phone: string;
  email?: string;
  birthdate?: string;
  status: PatientStatus;
  created_at: string;
}

export interface Therapist {
  id: number;
  clinic_id: number;
  user_id?: number;
  name: string;
  email: string;
  phone?: string;
  specialty: string;
  active: number;
  created_at: string;
}

export interface Appointment {
  id: number;
  clinic_id: number;
  patient_id: number;
  therapist_id: number;
  date: string;
  time: string;
  duration: number;
  status: AppointmentStatus;
  reminder_24h_sent: number;
  reminder_1h_sent: number;
  lead_id?: number | null;
  type?: string | null;
  deleted_at?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface JWTPayload {
  sub: number;
  email: string;
  role: Role;
  clinic_id: number;
  type: 'access' | 'refresh';
  exp: number;
  iat: number;
}

export interface ClinicalRecord {
  id: number;
  clinic_id: number;
  patient_id: number;
  psychologist_id: number;
  reason_consultation: string;
  history?: string;
  evaluation?: string;
  diagnosis?: string;
  treatment_plan?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionNote {
  id: number;
  clinic_id: number;
  patient_id: number;
  therapist_id: number;
  session_date: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  signature?: string;
  created_at: string;
  updated_at: string;
}

export type ConsentType = 'CONSENTIMIENTO_TERAPIA' | 'CONSENTIMIENTO_DATOS' | 'CONSENTIMIENTO_TMS' | 'CONSENTIMIENTO_TELEPSICOLOGIA';

export interface Consent {
  id: number;
  clinic_id: number;
  patient_id: number;
  type: ConsentType;
  document_hash: string;
  accepted_at: string;
  ip?: string;
  signature?: string;
  created_at: string;
}

export type DocumentType = 'CONSENTIMIENTO_INFORMADO' | 'AVISO_PRIVACIDAD' | 'EXPEDIENTE'
  | 'NOTA_CLINICA' | 'EVALUACION' | 'PLAN_TRATAMIENTO' | 'FORMATO_ADMISION'
  | 'RECETA' | 'REFERENCIA' | 'CONTRATO';

export type DocumentStatus = 'DRAFT' | 'GENERATED' | 'SIGNED' | 'SUPERSEDED' | 'ARCHIVED';

export interface Document {
  id: number;
  clinic_id: number;
  patient_id: number;
  document_type: DocumentType;
  status: DocumentStatus;
  version: number;
  hash?: string;
  storage_key?: string;
  signed_by?: string;
  signed_at?: string;
  expires_at?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}
