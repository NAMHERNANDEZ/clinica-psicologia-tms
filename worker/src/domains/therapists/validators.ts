export interface TherapistInput {
  name: string;
  email: string;
  phone?: string;
  specialty: string;
}

export function validateTherapist(data: unknown): { valid: true; data: TherapistInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.name || typeof input.name !== 'string') return { valid: false, error: 'Nombre requerido' };
  if (!input.email || typeof input.email !== 'string') return { valid: false, error: 'Email requerido' };
  if (!input.specialty || typeof input.specialty !== 'string') return { valid: false, error: 'Especialidad requerida' };
  return { valid: true, data: input as TherapistInput };
}
