export type Role = 'admin' | 'therapist' | 'reception' | 'patient';
export type PatientStatus = 'active' | 'inactive' | 'discharged';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  REFRESH_SECRET: string;
  ALLOWED_ORIGINS: string;
  SETUP_TOKEN: string;
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
