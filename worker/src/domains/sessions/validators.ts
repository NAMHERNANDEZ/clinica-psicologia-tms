export interface SessionUpdateInput {
  session_id: number;
  status: 'pending' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
}

export function validateSessionUpdate(data: unknown): { valid: true; data: SessionUpdateInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.session_id || typeof input.session_id !== 'number') return { valid: false, error: 'ID de sesión requerido' };
  const allowedStatuses = ['pending', 'completed', 'cancelled', 'no_show'];
  if (!input.status || typeof input.status !== 'string' || !allowedStatuses.includes(input.status as string)) {
    return { valid: false, error: 'Estado inválido. Valores permitidos: pending, completed, cancelled, no_show' };
  }
  const result: SessionUpdateInput = {
    session_id: input.session_id as number,
    status: input.status as SessionUpdateInput['status'],
  };
  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes === 'string') result.notes = input.notes;
  }
  return { valid: true, data: result };
}
