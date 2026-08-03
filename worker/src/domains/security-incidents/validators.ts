export interface IncidentInput {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

export function validateIncident(data: unknown): { valid: true; data: IncidentInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.type || typeof input.type !== 'string') return { valid: false, error: 'type requerido' };
  if (!input.description || typeof input.description !== 'string') return { valid: false, error: 'description requerido' };
  if (!input.severity || !VALID_SEVERITIES.includes(input.severity as string)) return { valid: false, error: 'severity invalido (low/medium/high/critical)' };

  return { valid: true, data: input as unknown as IncidentInput };
}