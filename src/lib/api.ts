const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================
// TYPES
// ============================================

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'therapist' | 'reception' | 'patient';
  clinic_id: number;
}

export interface LoginResponse {
  success: boolean;
  data: { user: User; accessToken: string };
}

export interface Patient {
  id: number;
  clinic_id: number;
  name: string;
  phone: string;
  email?: string;
  birthdate?: string;
  status: 'active' | 'inactive' | 'discharged';
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
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  notes?: string;
  patient_name?: string;
  therapist_name?: string;
  created_at: string;
}

export interface Reminder {
  id: number;
  appointment_id: number;
  patient_id: number;
  patient_name?: string;
  therapist_name?: string;
  type: '24h' | '1h';
  status: 'pending' | 'sent' | 'opened';
  scheduled_at: string;
}

export interface Treatment {
  id: number;
  clinic_id: number;
  patient_id: number;
  therapist_id: number;
  name: string;
  protocol?: string;
  total_sessions: number;
  completed_sessions: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  start_date: string;
  end_date?: string;
  patient_name?: string;
  therapist_name?: string;
}

export interface TmsProtocol {
  id: number;
  clinic_id: number;
  name: string;
  description?: string;
  indication: string;
  target_area: string;
  frequency_hz: number;
  intensity_pct_mt: number;
  pulses_per_session: number;
  session_duration_min: number;
  total_sessions: number;
  stimulation_type: string;
  evidence_level: string;
  active: number;
}

export interface MotorThreshold {
  id: number;
  clinic_id: number;
  patient_id: number;
  therapist_id: number;
  mt_pct: number;
  measured_at: string;
  coil_type?: string;
  stimulation_site: string;
  method: string;
  notes?: string;
  patient_name?: string;
}

export interface TmsProfile {
  id: number;
  clinic_id: number;
  patient_id: number;
  protocol_id: number;
  therapist_id: number;
  assigned_diagnosis: string;
  baseline_bdi?: number;
  baseline_gad7?: number;
  baseline_phq9?: number;
  status: 'evaluation' | 'active' | 'completed' | 'discontinued';
  start_date?: string;
  end_date?: string;
  patient_name?: string;
  protocol_name?: string;
  therapist_name?: string;
}

export interface TmsSession {
  id: number;
  clinic_id: number;
  profile_id: number;
  session_number: number;
  motor_threshold_pct: number;
  intensity_pct_mt: number;
  effective_intensity: number;
  target_area: string;
  coil_position?: string;
  frequency_hz: number;
  pulses_delivered: number;
  session_duration_min: number;
  stimulation_type: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  completed_at?: string;
}

export interface ClinicalResponse {
  id: number;
  tms_session_id: number;
  patient_id: number;
  mood_score: number;
  energy_score?: number;
  anxiety_score?: number;
  sleep_score?: number;
  concentration_score?: number;
  overall_response?: number;
  notes?: string;
}

export interface TwinPrediction {
  id: number;
  patient_id: number;
  session_number: number;
  predicted_mood: number;
  predicted_anxiety?: number;
  predicted_energy?: number;
  predicted_overall: number;
  confidence: number;
  risk_score: number;
  rule_applied?: string;
}

export interface AdverseEffect {
  id: number;
  tms_session_id: number;
  patient_id: number;
  effect_type: string;
  severity: 'mild' | 'moderate' | 'severe';
  description?: string;
  resolved: number;
  action_taken?: string;
}

export interface ClinicalNote {
  id: number;
  clinic_id: number;
  patient_id: number;
  therapist_id: number;
  note: string;
  note_type: string;
  created_at: string;
  therapist_name?: string;
}

export interface TimelineEvent {
  id: number;
  patient_id: number;
  type: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface Alert {
  id: number;
  clinic_id: number;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: number;
  created_at: string;
}

export interface Template {
  id: number;
  clinic_id: number;
  name: string;
  content: string;
  type: 'whatsapp' | 'email';
  is_default: number;
}

export interface ReceptionQueue {
  id: number;
  appointment_id?: number;
  patient_id?: number;
  patient_name?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'waiting' | 'in_progress' | 'done';
  notes?: string;
  created_at: string;
}

export interface DashboardStats {
  active_patients: number;
  sessions_today: number;
  response_rates: { improving: number; stable: number; declining: number };
  protocol_distribution: Array<{ name: string; count: number }>;
}

export interface SimulationComparison {
  protocol_a: { name: string; predicted_curve: Array<{ session: number; overall: number }> };
  protocol_b: { name: string; predicted_curve: Array<{ session: number; overall: number }> };
  recommendation: string;
}

export interface TreatmentSummary {
  patient: { id: number; name: string };
  protocol: { name: string; total_sessions: number };
  progress: { completed: number; total: number; percentage: number };
  clinical_scores: { baseline: Record<string, number>; latest: Record<string, number> };
}

export interface JourneyStage {
  stage: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  completed_at?: string;
}

export interface PatientJourney {
  patient_id: number;
  patient_name: string;
  current_stage: string;
  stages: JourneyStage[];
  progress_pct: number;
  next_action: string;
}

// ============================================
// REQUEST HELPER
// ============================================

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  console.log(`[API] ${response.status} ${path}`);

  if (response.status === 401 && path !== '/api/auth/login') {
    const refreshed = await refreshToken();
    if (refreshed) {
      const retry = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      if (!retry.ok) throw new Error('Error en la solicitud');
      return retry.json();
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    console.error(`[API] Error ${response.status}:`, error);
    throw new Error(error.error || `Error ${response.status}`);
  }

  return response.json();
}

// ============================================
// AUTH
// ============================================

export const auth = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: { email: string; password: string; name: string; clinic_name: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  refresh: () => fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' }).then(r => r.ok),
  me: () => request<{ success: boolean; data: User }>('/api/auth/me'),
};

// ============================================
// PATIENTS
// ============================================

export const patients = {
  list: (search?: string) => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ success: boolean; data: Patient[] }>(`/api/patients${params}`);
  },
  get: (id: number) => request<{ success: boolean; data: Patient }>(`/api/patients/${id}`),
  create: (data: Omit<Patient, 'id' | 'clinic_id' | 'created_at'>) =>
    request('/api/patients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Patient>) =>
    request(`/api/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/api/patients/${id}`, { method: 'DELETE' }),
};

// ============================================
// THERAPISTS
// ============================================

export const therapists = {
  list: () => request<{ success: boolean; data: Therapist[] }>('/api/therapists'),
  get: (id: number) => request<{ success: boolean; data: Therapist }>(`/api/therapists/${id}`),
  create: (data: Omit<Therapist, 'id' | 'clinic_id' | 'created_at'>) =>
    request('/api/therapists', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Therapist>) =>
    request(`/api/therapists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/api/therapists/${id}`, { method: 'DELETE' }),
};

// ============================================
// APPOINTMENTS
// ============================================

export const appointments = {
  list: (filters?: Record<string, string | number>) => {
    const params = new URLSearchParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => params.set(k, String(v)));
    const q = params.toString();
    return request<{ success: boolean; data: Appointment[] }>(`/api/appointments${q ? `?${q}` : ''}`);
  },
  get: (id: number) => request<{ success: boolean; data: Appointment }>(`/api/appointments/${id}`),
  create: (data: Omit<Appointment, 'id' | 'clinic_id' | 'created_at'>) =>
    request('/api/appointments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Appointment>) =>
    request(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/api/appointments/${id}`, { method: 'DELETE' }),
};

// ============================================
// REMINDERS
// ============================================

export const reminders = {
  list: () => request<{ success: boolean; data: Reminder[] }>('/api/reminders'),
  generate: () => request('/api/reminders/generate', { method: 'POST' }),
};

// ============================================
// TREATMENTS
// ============================================

export const treatments = {
  list: () => request<{ success: boolean; data: Treatment[] }>('/api/treatments'),
  get: (id: number) => request<{ success: boolean; data: Treatment }>(`/api/treatments/${id}`),
  create: (data: Omit<Treatment, 'id' | 'clinic_id' | 'completed_sessions' | 'created_at'>) =>
    request('/api/treatments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Treatment>) =>
    request(`/api/treatments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/api/treatments/${id}`, { method: 'DELETE' }),
};

// ============================================
// TMS PROTOCOLS
// ============================================

export const tmsProtocols = {
  list: () => request<{ success: boolean; data: TmsProtocol[] }>('/api/tms/protocols'),
  get: (id: number) => request<{ success: boolean; data: TmsProtocol }>(`/api/tms/protocols/${id}`),
  create: (data: Omit<TmsProtocol, 'id' | 'clinic_id' | 'active'>) =>
    request('/api/tms/protocols', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<TmsProtocol>) =>
    request(`/api/tms/protocols/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deactivate: (id: number) => request(`/api/tms/protocols/${id}/deactivate`, { method: 'PUT' }),
  suggest: (indication: string, motorThreshold: number) =>
    request('/api/tms/protocols/suggest', { method: 'POST', body: JSON.stringify({ indication, motorThreshold }) }),
};

// ============================================
// MOTOR THRESHOLDS
// ============================================

export const motorThresholds = {
  listByPatient: (patientId: number) =>
    request<{ success: boolean; data: MotorThreshold[] }>(`/api/tms/motor-thresholds/patient/${patientId}`),
  list: () => request<{ success: boolean; data: MotorThreshold[] }>('/api/tms/motor-thresholds'),
  create: (data: { patient_id: number; mt_pct: number; measured_at: string; coil_type?: string; method?: string; notes?: string }) =>
    request('/api/tms/motor-thresholds', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/api/tms/motor-thresholds/${id}`, { method: 'DELETE' }),
};

// ============================================
// TMS PROFILES
// ============================================

export const tmsProfiles = {
  listByPatient: (patientId: number) =>
    request<{ success: boolean; data: TmsProfile[] }>(`/api/tms/profiles/patient/${patientId}`),
  list: () => request<{ success: boolean; data: TmsProfile[] }>('/api/tms/profiles'),
  get: (id: number) => request<{ success: boolean; data: TmsProfile }>(`/api/tms/profiles/${id}`),
  create: (data: { patient_id: number; protocol_id: number; therapist_id: number; motor_threshold_id: number; assigned_diagnosis: string }) =>
    request('/api/tms/profiles', { method: 'POST', body: JSON.stringify(data) }),
  activate: (id: number) => request(`/api/tms/profiles/${id}/activate`, { method: 'PUT' }),
  complete: (id: number) => request(`/api/tms/profiles/${id}/complete`, { method: 'PUT' }),
  discontinue: (id: number) => request(`/api/tms/profiles/${id}/discontinue`, { method: 'PUT' }),
};

// ============================================
// TMS SESSIONS
// ============================================

export const tmsSessions = {
  listByProfile: (profileId: number) =>
    request<{ success: boolean; data: TmsSession[] }>(`/api/tms/sessions/${profileId}`),
  create: (data: Omit<TmsSession, 'id' | 'clinic_id' | 'status' | 'completed_at' | 'created_at'>) =>
    request('/api/tms/sessions', { method: 'POST', body: JSON.stringify(data) }),
  complete: (sessionId: number) =>
    request('/api/tms/sessions/complete', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
  update: (id: number, data: Partial<TmsSession>) =>
    request(`/api/tms/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ============================================
// CLINICAL RESPONSE
// ============================================

export const clinicalResponse = {
  listByPatient: (patientId: number) =>
    request<{ success: boolean; data: ClinicalResponse[] }>(`/api/tms/clinical-response/patient/${patientId}`),
  getCurve: (patientId: number) =>
    request<{ success: boolean; data: Array<{ session_number: number; mood_score: number; overall_response: number }> }>(`/api/tms/clinical-response/patient/${patientId}/curve`),
  record: (data: { tms_session_id: number; mood_score: number; energy_score?: number; anxiety_score?: number; sleep_score?: number; concentration_score?: number; notes?: string }) =>
    request('/api/tms/clinical-response', { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================
// DIGITAL TWIN
// ============================================

export const digitalTwin = {
  predict: (data: { patient_id: number; session_number?: number }) =>
    request('/api/tms/digital-twin/predict', { method: 'POST', body: JSON.stringify(data) }),
  getPredictions: (patientId: number) =>
    request<{ success: boolean; data: TwinPrediction[] }>(`/api/tms/digital-twin/patient/${patientId}`),
  getHistory: (patientId: number) =>
    request(`/api/tms/digital-twin/history/${patientId}`),
  getConfidence: (patientId: number) =>
    request(`/api/tms/digital-twin/confidence/${patientId}`),
};

// ============================================
// ADVERSE EFFECTS
// ============================================

export const adverseEffects = {
  listByPatient: (patientId: number) =>
    request<{ success: boolean; data: AdverseEffect[] }>(`/api/tms/adverse-effects/patient/${patientId}`),
  record: (data: { tms_session_id: number; patient_id: number; effect_type: string; severity?: string; description?: string }) =>
    request('/api/tms/adverse-effects', { method: 'POST', body: JSON.stringify(data) }),
  resolve: (id: number, actionTaken: string) =>
    request(`/api/tms/adverse-effects/${id}/resolve`, { method: 'PUT', body: JSON.stringify({ action_taken: actionTaken }) }),
  getStats: () => request('/api/tms/adverse-effects/stats'),
};

// ============================================
// SIMULATION
// ============================================

export const simulation = {
  simulate: (patientId: number, protocolId: number) =>
    request('/api/tms/simulation/simulate', { method: 'POST', body: JSON.stringify({ patient_id: patientId, protocol_id: protocolId }) }),
  compare: (patientId: number, protocolAId: number, protocolBId: number) =>
    request('/api/tms/simulation/compare', { method: 'POST', body: JSON.stringify({ patient_id: patientId, protocol_a_id: protocolAId, protocol_b_id: protocolBId }) }),
  getHistory: (patientId: number) =>
    request(`/api/tms/simulation/history/${patientId}`),
  getDashboard: () => request('/api/tms/simulation/dashboard'),
  getBrainState: (protocolId: number) =>
    request(`/api/tms/simulation/brain/${protocolId}`),
};

// ============================================
// TMS ENGINE
// ============================================

export const tmsEngine = {
  getDashboard: () => request<{ success: boolean; data: DashboardStats }>('/api/tms/engine/dashboard'),
  getPatientDashboard: (patientId: number) =>
    request(`/api/tms/engine/patient/${patientId}`),
  analyze: (patientId: number) =>
    request(`/api/tms/engine/analyze/${patientId}`),
  suggestAdjustment: (patientId: number) =>
    request(`/api/tms/engine/adjust/${patientId}`),
  getEfficiency: () => request('/api/tms/engine/efficiency'),
};

// ============================================
// REPORTS
// ============================================

export const reports = {
  generate: (patientId: number, format: 'pdf' | 'csv' = 'pdf') =>
    request('/api/tms/reports/generate', { method: 'POST', body: JSON.stringify({ patient_id: patientId, format }) }),
  getTreatmentSummary: (patientId: number) =>
    request<{ success: boolean; data: TreatmentSummary }>(`/api/tms/reports/treatment/${patientId}`),
  exportCSV: (patientId: number) =>
    request(`/api/tms/reports/export/${patientId}`),
  getHistory: (patientId: number) =>
    request(`/api/tms/reports/history/${patientId}`),
};

// ============================================
// CLINICAL NOTES
// ============================================

export const clinicalNotes = {
  listByPatient: (patientId: number) =>
    request<{ success: boolean; data: ClinicalNote[] }>(`/api/clinical-notes/${patientId}`),
  list: () => request<{ success: boolean; data: ClinicalNote[] }>('/api/clinical-notes'),
  create: (data: { patient_id: number; note: string; note_type?: string; appointment_id?: number; treatment_id?: number }) =>
    request('/api/clinical-notes', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/api/clinical-notes/${id}`, { method: 'DELETE' }),
};

// ============================================
// CLINICAL ASSESSMENTS (escalas validadas)
// ============================================

export interface ClinicalAssessment {
  id: number;
  patient_id: number;
  assessment_type: string;
  score: number;
  max_score: number;
  interpretation: string;
  administered_at: string;
}

export const assessments = {
  create: (data: {
    patient_id: number;
    assessment_type: string;
    score: number;
    max_score: number;
    interpretation: string;
    administered_at: string;
  }) => request<{ success: boolean; data: { id: number } }>('/api/assessments', { method: 'POST', body: JSON.stringify(data) }),

  listByPatient: (patientId: number) =>
    request<{ success: boolean; data: ClinicalAssessment[] }>(`/api/assessments/patient/${patientId}`),

  listByType: (patientId: number, assessmentType: string) =>
    request<{ success: boolean; data: ClinicalAssessment[] }>(`/api/assessments/patient/${patientId}/${assessmentType}`),
};

// ============================================
// TIMELINE
// ============================================

export const timeline = {
  listByPatient: (patientId: number) =>
    request<{ success: boolean; data: TimelineEvent[] }>(`/api/timeline/${patientId}`),
  list: () => request<{ success: boolean; data: TimelineEvent[] }>('/api/timeline'),
  create: (data: { patient_id: number; type: string; title: string; description?: string }) =>
    request('/api/timeline', { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================
// ALERTS
// ============================================

export const alerts = {
  list: (unread?: boolean) => {
    const params = unread ? '?unread=true' : '';
    return request<{ success: boolean; data: Alert[] }>(`/api/alerts${params}`);
  },
  getSummary: () => request<{ success: boolean; data: { total: number; unread: number; critical: number; warnings: number } }>('/api/alerts/summary'),
  create: (data: { type: string; title: string; message: string; severity?: string }) =>
    request('/api/alerts', { method: 'POST', body: JSON.stringify(data) }),
  markRead: (id: number) => request(`/api/alerts/${id}/read`, { method: 'PUT' }),
  markAllRead: () => request('/api/alerts/read-all', { method: 'PUT' }),
  delete: (id: number) => request(`/api/alerts/${id}`, { method: 'DELETE' }),
};

// ============================================
// TEMPLATES
// ============================================

export const templates = {
  list: () => request<{ success: boolean; data: Template[] }>('/api/templates'),
  create: (data: { name: string; content: string; type: 'whatsapp' | 'email'; is_default?: number }) =>
    request('/api/templates', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Template>) =>
    request(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => request(`/api/templates/${id}`, { method: 'DELETE' }),
};

// ============================================
// RECEPTION
// ============================================

export const reception = {
  getQueue: () => request<{ success: boolean; data: ReceptionQueue[] }>('/api/reception/queue'),
  addToQueue: (data: { patient_id: number; appointment_id?: number; priority?: string; notes?: string }) =>
    request('/api/reception/queue', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) =>
    request(`/api/reception/queue/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

// ============================================
// NOTIFICATIONS
// ============================================

export const notifications = {
  list: () => request('/api/notifications'),
  log: (data: { type: string; message: string; channel: string; appointment_id?: number }) =>
    request('/api/notifications/log', { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================
// WHATSAPP
// ============================================

export const whatsapp = {
  preview: (data: { patient_name: string; phone: string; date: string; time: string; therapist_name: string; template?: string }) =>
    request<{ success: boolean; data: { message: string; url: string } }>('/api/whatsapp/preview', { method: 'POST', body: JSON.stringify(data) }),
};

// ============================================
// PATIENT JOURNEY (FASE 8)
// ============================================

export const journey = {
  getPatient: (patientId: number) =>
    request<{ success: boolean; data: PatientJourney }>(`/api/journey/patient/${patientId}`),
  startTreatment: (data: { patient_id: number; protocol_id: number; therapist_id: number; motor_threshold_id: number; diagnosis: string }) =>
    request('/api/journey/start-treatment', { method: 'POST', body: JSON.stringify(data) }),
  completeSession: (data: { session_id: number; mood_score: number; anxiety_score?: number; energy_score?: number; side_effects?: Array<{ type: string; severity: string }> }) =>
    request('/api/journey/complete-session', { method: 'POST', body: JSON.stringify(data) }),
  getReception: () => request('/api/journey/reception'),
  getTherapist: (therapistId?: number) => {
    const params = therapistId ? `?therapist_id=${therapistId}` : '';
    return request(`/api/journey/therapist${params}`);
  },
  discharge: (patientId: number) =>
    request(`/api/journey/discharge/${patientId}`, { method: 'POST' }),
};

// ============================================
// COS-L: CLINICAL OPERATING SYSTEM LAYER
// ============================================

export const cos = {
  getToday: (date?: string) => {
    const params = date ? `?date=${date}` : '';
    return request('/api/cos/today' + params);
  },
  getNextAction: (patientId: number) =>
    request(`/api/cos/next-action?id=${patientId}`),
  getPatientStates: () => request('/api/cos/patient-states'),
  getTasks: () => request('/api/cos/tasks'),
  getAlerts: () => request('/api/cos/alerts'),
};

// ============================================
// REFRESH TOKEN HELPER (used in request interceptor)
// ============================================

async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    return response.ok;
  } catch {
    return false;
  }
}
