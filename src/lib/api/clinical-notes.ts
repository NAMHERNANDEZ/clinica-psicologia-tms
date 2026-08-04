const API = process.env.VITE_API_URL || 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiCall(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export interface ClinicalNote {
  id: number;
  patient_id: number;
  therapist_id: number;
  note: string;
  note_type: string;
  template_type: string;
  fields_json: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical' | null;
  status: 'draft' | 'final' | 'locked' | 'archived';
  version: number;
  is_locked: number;
  signed_at: string | null;
  signed_by: number | null;
  cosigned_by: number | null;
  cosigned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteTemplate {
  id: number;
  name: string;
  template_type: 'SOAP' | 'DAP' | 'BIRP' | 'Libre';
  structure: string;
}

export async function getPatientNotes(patientId: number): Promise<ClinicalNote[]> {
  const data = await apiCall(`/api/clinical-notes/${patientId}`);
  return data.data || [];
}

export async function createNote(note: {
  patient_id: number;
  note: string;
  note_type?: string;
  template_type?: string;
  fields_json?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
}): Promise<{ id: number }> {
  const data = await apiCall('/api/clinical-notes', {
    method: 'POST',
    body: JSON.stringify(note),
  });
  return data.data;
}

export async function updateNote(id: number, updates: {
  note?: string;
  note_type?: string;
  template_type?: string;
  fields_json?: string;
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  status?: string;
}): Promise<{ id: number; version: number }> {
  const data = await apiCall(`/api/clinical-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return data.data;
}

export async function lockNote(id: number): Promise<{ id: number; is_locked: number }> {
  return apiCall(`/api/clinical-notes/${id}/lock`, { method: 'POST' }).then(d => d.data);
}

export async function unlockNote(id: number): Promise<{ id: number; is_locked: number }> {
  return apiCall(`/api/clinical-notes/${id}/unlock`, { method: 'POST' }).then(d => d.data);
}

export async function signNote(id: number): Promise<{ id: number; signed_at: string; signature_hash: string }> {
  return apiCall(`/api/clinical-notes/${id}/sign`, { method: 'POST' }).then(d => d.data);
}

export async function cosignNote(id: number): Promise<{ id: number; cosigned_by: number; cosigned_at: string }> {
  return apiCall(`/api/clinical-notes/${id}/cosign`, { method: 'POST' }).then(d => d.data);
}

export async function getNoteVersions(id: number): Promise<any[]> {
  const data = await apiCall(`/api/clinical-notes/${id}/versions`);
  return data.data?.versions || [];
}

export async function getNoteAudit(id: number): Promise<any[]> {
  const data = await apiCall(`/api/clinical-notes/${id}/audit`);
  return data.data?.audit || [];
}

export async function getNoteTemplates(): Promise<NoteTemplate[]> {
  const data = await apiCall('/api/clinical-notes/templates');
  return data.data?.templates || [];
}
