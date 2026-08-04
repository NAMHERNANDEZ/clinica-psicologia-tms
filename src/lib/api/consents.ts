const BASE_URL = import.meta.env.VITE_API_URL || 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req(method: string, path: string, body?: any) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

export const consentsApi = {
  async list(patientId: number) {
    const res = await req('GET', `/api/consents?patient_id=${patientId}`);
    return res.json();
  },
  async get(id: number) {
    const res = await req('GET', `/api/consents/${id}`);
    return res.json();
  },
  async create(data: { patient_id: number; type: string; document_hash: string; accepted_at: string; signature?: string; template_id?: number; version?: number }) {
    const res = await req('POST', '/api/consents', data);
    return res.json();
  },
  async sign(id: number, data: { signer_type?: 'patient' | 'therapist' | 'witness' | 'guardian'; signer_name: string; signature_hash: string; ip?: string; user_agent?: string; metadata_json?: string }) {
    const res = await req('POST', `/api/consents/${id}/sign`, data);
    return res.json();
  },
  async revoke(id: number, reason?: string) {
    const res = await req('PUT', `/api/consents/${id}/revoke`, { reason });
    return res.json();
  },
  async signatures(id: number) {
    const res = await req('GET', `/api/consents/${id}/signatures`);
    return res.json();
  },
  async versions(id: number) {
    const res = await req('GET', `/api/consents/${id}/versions`);
    return res.json();
  },
  async templates(activeOnly = true) {
    const res = await req('GET', `/api/consents/templates?active=${activeOnly}`);
    return res.json();
  },
  async createTemplate(data: { name: string; type: string; content: string; language?: string }) {
    const res = await req('POST', '/api/consents/templates', data);
    return res.json();
  },
  async updateTemplate(id: number, data: { name?: string; content?: string; language?: string; is_active?: number }) {
    const res = await req('PUT', `/api/consents/templates/${id}`, data);
    return res.json();
  },
};

export const consentTemplatesApi = {
  async list(activeOnly = true) {
    return consentsApi.templates(activeOnly);
  },
  async create(data: { name: string; type: string; content: string; language?: string }) {
    return consentsApi.createTemplate(data);
  },
  async update(id: number, data: { name?: string; content?: string; language?: string; is_active?: number }) {
    return consentsApi.updateTemplate(id, data);
  },
};