export const LEAD_ESTADOS_VALIDOS = ['NUEVO', 'CONTACTADO', 'CITA_CONFIRMADA', 'ATENDIDO', 'CERRADO'];

export interface LeadCreateInput {
  nombre?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  servicio_interesado?: string;
  motivo?: string;
  origen?: string;
  clinic_id?: number;
}

export function validateLeadCreate(input: unknown): { valid: boolean; data?: LeadCreateInput; error?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid input' };
  }

  const { nombre, telefono, email, ciudad, servicio_interesado, motivo, origen, clinic_id } = input as Record<string, unknown>;

  // Al menos un dato de contacto es necesario para que sea una oportunidad real
  if (!nombre && !telefono && !email && !ciudad && !servicio_interesado) {
    return { valid: false, error: 'At least one field (nombre, telefono, email, ciudad, servicio_interesado) is required' };
  }

  const stringFields: Array<[string, unknown]> = [
    ['nombre', nombre],
    ['telefono', telefono],
    ['email', email],
    ['ciudad', ciudad],
    ['servicio_interesado', servicio_interesado],
    ['motivo', motivo],
    ['origen', origen],
  ];
  for (const [field, value] of stringFields) {
    if (value !== undefined && typeof value !== 'string') {
      return { valid: false, error: `${field} must be a string` };
    }
  }

  if (email !== undefined && (email as string).length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email as string)) {
    return { valid: false, error: 'email must be valid' };
  }

  if (clinic_id !== undefined && typeof clinic_id !== 'number') {
    return { valid: false, error: 'clinic_id must be a number' };
  }

  return {
    valid: true,
    data: {
      nombre: nombre as string | undefined,
      telefono: telefono as string | undefined,
      email: email as string | undefined,
      ciudad: ciudad as string | undefined,
      servicio_interesado: servicio_interesado as string | undefined,
      motivo: motivo as string | undefined,
      origen: (origen as string | undefined) || 'chat',
      clinic_id: clinic_id as number | undefined,
    },
  };
}

export const LEAD_EDITABLE_FIELDS = ['nombre', 'telefono', 'email', 'ciudad', 'servicio_interesado', 'motivo'] as const;

export interface LeadUpdateInput {
  nombre?: unknown;
  telefono?: unknown;
  email?: unknown;
  ciudad?: unknown;
  servicio_interesado?: unknown;
  motivo?: unknown;
}

export function validateLeadUpdate(input: unknown): { valid: boolean; data?: LeadUpdateInput; error?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid input' };
  }
  const asRecord = input as Record<string, unknown>;
  const data: LeadUpdateInput = {};
  let hasField = false;

  for (const field of LEAD_EDITABLE_FIELDS) {
    const value = asRecord[field];
    if (value === undefined) continue;
    hasField = true;
    if (value !== null && typeof value !== 'string') {
      return { valid: false, error: `${field} must be a string or null` };
    }
    if (field === 'email' && typeof value === 'string' && value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { valid: false, error: 'email must be valid' };
    }
    (data as Record<string, unknown>)[field] = value;
  }

  if (!hasField) {
    return { valid: false, error: `At least one editable field: ${LEAD_EDITABLE_FIELDS.join(', ')}` };
  }
  return { valid: true, data };
}

export function validateNote(input: unknown): { valid: boolean; note?: string; error?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Invalid input' };
  }
  const note = (input as Record<string, unknown>).note;
  if (typeof note !== 'string' || !note.trim()) {
    return { valid: false, error: 'note is required and must be a string' };
  }
  return { valid: true, note: note.trim() };
}

export function validateEstado(estado: unknown): { valid: boolean; estado?: string; error?: string } {
  if (typeof estado !== 'string' || !LEAD_ESTADOS_VALIDOS.includes(estado)) {
    return { valid: false, error: `estado must be one of: ${LEAD_ESTADOS_VALIDOS.join(', ')}` };
  }
  return { valid: true, estado };
}
