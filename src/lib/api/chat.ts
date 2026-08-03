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

// Public chat (no auth)
export async function sendChatMessage(message: string, sessionId?: string) {
  return apiCall('/api/clinical-chat/message', {
    method: 'POST',
    body: JSON.stringify({ message, sessionId }),
  });
}

// Admin endpoints (auth required)
export async function getChatSessions(limit = 50, offset = 0) {
  return apiCall(`/api/clinical-chat/sessions?limit=${limit}&offset=${offset}`);
}

export async function getChatSessionMessages(sessionId: string) {
  return apiCall(`/api/clinical-chat/sessions/${sessionId}/messages`);
}

export async function getChatStats() {
  return apiCall('/api/clinical-chat/stats');
}
