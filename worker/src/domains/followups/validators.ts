export type FollowupType = 'CONTROL' | 'REVISION' | 'TRATAMIENTO' | 'URGENCIA' | 'TELEMEDICINA';
export type FollowupStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO' | 'NO_ASISTIO';
export type FollowupPriority = 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export interface FollowupInput {
  patient_id: number;
  type: FollowupType;
  scheduled_at: string;
  priority?: FollowupPriority;
  notes?: string;
  created_by?: number | null;
}

export interface FollowupCompleteInput {
  outcome: string;
  outcome_notes?: string;
}

const VALID_TYPES: FollowupType[] = ['CONTROL', 'REVISION', 'TRATAMIENTO', 'URGENCIA', 'TELEMEDICINA'];
const VALID_STATUSES: FollowupStatus[] = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO', 'NO_ASISTIO'];
const VALID_PRIORITIES: FollowupPriority[] = ['BAJA', 'NORMAL', 'ALTA', 'URGENTE'];

export function validateFollowup(data: unknown): { valid: true; data: FollowupInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.patient_id || typeof input.patient_id !== 'number') return { valid: false, error: 'patient_id requerido (number)' };
  if (!input.type || typeof input.type !== 'string' || !VALID_TYPES.includes(input.type as FollowupType)) {
    return { valid: false, error: `type debe ser uno de: ${VALID_TYPES.join(', ')}` };
  }
  if (!input.scheduled_at || typeof input.scheduled_at !== 'string') return { valid: false, error: 'scheduled_at requerido (string, formato ISO)' };

  if (input.priority !== undefined && (!VALID_PRIORITIES.includes(input.priority as FollowupPriority))) {
    return { valid: false, error: `priority debe ser uno de: ${VALID_PRIORITIES.join(', ')}` };
  }
  if (input.notes !== undefined && typeof input.notes !== 'string') return { valid: false, error: 'notes debe ser string' };
  if (input.created_by !== undefined && typeof input.created_by !== 'number') return { valid: false, error: 'created_by debe ser number' };

  return {
    valid: true,
    data: {
      patient_id: input.patient_id,
      type: input.type as FollowupType,
      scheduled_at: input.scheduled_at,
      priority: (input.priority as FollowupPriority) || 'NORMAL',
      notes: typeof input.notes === 'string' ? input.notes : undefined,
      created_by: typeof input.created_by === 'number' ? input.created_by : null,
    },
  };
}

export function validateCompleteFollowup(data: unknown): { valid: true; data: FollowupCompleteInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.outcome || typeof input.outcome !== 'string') return { valid: false, error: 'outcome requerido (string)' };
  if (input.outcome_notes !== undefined && typeof input.outcome_notes !== 'string') return { valid: false, error: 'outcome_notes debe ser string' };

  return {
    valid: true,
    data: {
      outcome: input.outcome,
      outcome_notes: typeof input.outcome_notes === 'string' ? input.outcome_notes : undefined,
    },
  };
}

export { VALID_TYPES, VALID_STATUSES, VALID_PRIORITIES };
