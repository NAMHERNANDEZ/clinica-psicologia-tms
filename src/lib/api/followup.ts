const API = import.meta.env.VITE_API_URL || 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';

// ============================================
// TYPES (espejo de worker/src/domains/followups/validators.ts + types.ts)
// ============================================

export type FollowupType = 'CONTROL' | 'REVISION' | 'TRATAMIENTO' | 'URGENCIA' | 'TELEMEDICINA';
export type FollowupStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO' | 'NO_ASISTIO';
export type FollowupPriority = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export interface Followup {
  id: number;
  clinic_id: number;
  patient_id: number;
  type: FollowupType;
  scheduled_at: string;
  completed_at: string | null;
  status: FollowupStatus;
  priority: FollowupPriority;
  notes: string | null;
  outcome: string | null;
  outcome_notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface FollowupInput {
  patient_id: number;
  type: FollowupType;
  scheduled_at: string;
  priority?: FollowupPriority;
  notes?: string;
}

export interface FollowupCompleteInput {
  outcome: string;
  outcome_notes?: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method,
    headers: authHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function jsonRes<T = any>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const followupsApi = {
  async list(patientId?: number): Promise<Followup[]> {
    const path = patientId ? `/api/followups?patient_id=${patientId}` : '/api/followups';
    const data = await jsonRes(await req('GET', path));
    return data.data?.followups || [];
  },

  async get(id: number): Promise<Followup> {
    const data = await jsonRes(await req('GET', `/api/followups/${id}`));
    return data.data?.followup;
  },

  async create(input: FollowupInput): Promise<{ id: number }> {
    const data = await jsonRes(await req('POST', '/api/followups', input));
    return data.data || { id: 0 };
  },

  async update(id: number, input: Partial<FollowupInput> & { status?: FollowupStatus }): Promise<{ id: number }> {
    const data = await jsonRes(await req('PUT', `/api/followups/${id}`, input));
    return data.data || { id: 0 };
  },

  async complete(id: number, input: FollowupCompleteInput): Promise<{ id: number }> {
    const data = await jsonRes(await req('POST', `/api/followups/${id}/complete`, input));
    return data.data || { id: 0 };
  },

  async remove(id: number): Promise<{ id: number }> {
    const data = await jsonRes(await req('DELETE', `/api/followups/${id}`));
    return data.data || { id: 0 };
  },
};

// ============================================
// CONSTANTES + LABELS (UI)
// ============================================

export const FOLLOWUP_TYPES: { value: FollowupType; label: string }[] = [
  { value: 'CONTROL', label: 'Control post-tratamiento' },
  { value: 'REVISION', label: 'Revisión de evolución' },
  { value: 'TRATAMIENTO', label: 'Sesión de tratamiento' },
  { value: 'URGENCIA', label: 'Seguimiento de urgencia' },
  { value: 'TELEMEDICINA', label: 'Telemedicina' },
];

export const FOLLOWUP_STATUSES: { value: FollowupStatus; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROGRESO', label: 'En progreso' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'CANCELADO', label: 'Cancelado' },
  { value: 'NO_ASISTIO', label: 'No asistió' },
];

export const FOLLOWUP_PRIORITIES: { value: FollowupPriority; label: string }[] = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

export function followupTypeLabel(type: string): string {
  const found = FOLLOWUP_TYPES.find(t => t.value === type);
  return found ? found.label : type.replace(/_/g, ' ');
}

export function followupStatusLabel(status: string): string {
  const found = FOLLOWUP_STATUSES.find(s => s.value === status);
  return found ? found.label : status.replace(/_/g, ' ');
}

export function followupPriorityLabel(priority: string): string {
  const found = FOLLOWUP_PRIORITIES.find(p => p.value === priority);
  return found ? found.label : priority.replace(/_/g, ' ');
}
