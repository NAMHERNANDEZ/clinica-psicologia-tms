const API = import.meta.env.VITE_API_URL || 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';

export type DocumentType =
  | 'CONSENTIMIENTO_INFORMADO' | 'AVISO_PRIVACIDAD' | 'EXPEDIENTE'
  | 'NOTA_CLINICA' | 'EVALUACION' | 'PLAN_TRATAMIENTO' | 'FORMATO_ADMISION'
  | 'RECETA' | 'REFERENCIA' | 'CONTRATO';

export type DocumentStatus = 'DRAFT' | 'GENERATED' | 'SIGNED' | 'SUPERSEDED' | 'ARCHIVED';

export interface PatientDocument {
  id: number;
  clinic_id: number;
  patient_id: number;
  document_type: DocumentType;
  status: DocumentStatus;
  version: number;
  description?: string;
  hash?: string;
  storage_key?: string;
  signed_by?: string;
  signed_at?: string;
  expires_at?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface FileUploadPayload {
  name?: string;
  type?: string;
  content?: string; // base64 (sin prefijo data:)
  size?: number;
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

export const documentsApi = {
  async list(patientId: number): Promise<PatientDocument[]> {
    const data = await jsonRes(await req('GET', `/api/documents?patient_id=${patientId}`));
    return data.data?.documents || [];
  },

  async get(id: number): Promise<PatientDocument> {
    const data = await jsonRes(await req('GET', `/api/documents/${id}`));
    return data.data?.document;
  },

  async create(input: {
    patient_id: number;
    document_type: DocumentType;
    description?: string;
    hash?: string;
    file?: FileUploadPayload;
  }): Promise<{ id: number }> {
    const data = await jsonRes(await req('POST', '/api/documents', input));
    return data.data || { id: 0 };
  },

  async sign(id: number, opts?: { signed_by?: string; signature?: string }): Promise<void> {
    await jsonRes(await req('PUT', `/api/documents/${id}/sign`, {
      signed_by: opts?.signed_by,
      signature: opts?.signature,
    }));
  },

  async archive(id: number): Promise<void> {
    await jsonRes(await req('PUT', `/api/documents/${id}/archive`));
  },

  async supersede(id: number, input: {
    document_type: DocumentType;
    description?: string;
    file?: FileUploadPayload;
  }): Promise<{ newId: number }> {
    const data = await jsonRes(await req('POST', `/api/documents/${id}/supersede`, input));
    return data.data || { newId: 0 };
  },

  async download(id: number): Promise<{ blob: Blob; fileName: string; contentType: string }> {
    const res = await fetch(`${API}/api/documents/${id}/download`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      let error = `HTTP ${res.status}`;
      try {
        const d = await res.json();
        if (d.error) error = d.error;
      } catch { /* ignore */ }
      throw new Error(error);
    }
    const disposition = res.headers.get('Content-Disposition') || '';
    const m = disposition.match(/filename="?([^";]+)"?/);
    const fileName = m ? m[1] : `documento-${id}`;
    return { blob: await res.blob(), fileName, contentType: res.headers.get('Content-Type') || 'application/octet-stream' };
  },
};

export const DOCUMENT_TYPES: { value: DocumentType; label: string; allowed: string[] }[] = [
  { value: 'CONSENTIMIENTO_INFORMADO', label: 'Consentimiento informado', allowed: ['application/pdf'] },
  { value: 'AVISO_PRIVACIDAD', label: 'Aviso de privacidad', allowed: ['application/pdf', 'text/plain'] },
  { value: 'EXPEDIENTE', label: 'Expediente', allowed: ['application/pdf', 'image/png', 'image/jpeg'] },
  { value: 'NOTA_CLINICA', label: 'Nota clínica', allowed: ['application/pdf', 'image/png', 'image/jpeg'] },
  { value: 'EVALUACION', label: 'Evaluación', allowed: ['application/pdf', 'image/png', 'image/jpeg'] },
  { value: 'PLAN_TRATAMIENTO', label: 'Plan de tratamiento', allowed: ['application/pdf'] },
  { value: 'FORMATO_ADMISION', label: 'Formato de admisión', allowed: ['application/pdf', 'text/plain'] },
  { value: 'RECETA', label: 'Receta', allowed: ['application/pdf', 'image/png', 'image/jpeg'] },
  { value: 'REFERENCIA', label: 'Referencia', allowed: ['application/pdf'] },
  { value: 'CONTRATO', label: 'Contrato', allowed: ['application/pdf'] },
];

export const DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB (espejo del backend)

export function documentTypeLabel(type: string): string {
  const found = DOCUMENT_TYPES.find(d => d.value === type);
  return found ? found.label : type.replace(/_/g, ' ');
}

export function readFileAsBase64(file: File): Promise<{ base64: string; sizeBytes: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      resolve({ base64, sizeBytes: (base64.length * 3) / 4 });
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
