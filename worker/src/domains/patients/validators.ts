export interface PatientInput {
  name: string;
  phone: string;
  email?: string;
  birthdate?: string;
}

export function validatePatient(data: unknown): { valid: true; data: PatientInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.name || typeof input.name !== 'string') return { valid: false, error: 'Nombre requerido' };
  if (!input.phone || typeof input.phone !== 'string') return { valid: false, error: 'Teléfono requerido' };
  if (input.name.length < 2) return { valid: false, error: 'Nombre muy corto' };
  if (input.phone.length < 10) return { valid: false, error: 'Teléfono inválido' };
  return { valid: true, data: input as PatientInput };
}
