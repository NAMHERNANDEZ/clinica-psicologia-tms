export type TimelineEventType = 'registration' | 'assessment' | 'treatment_start' | 'session' | 'note' | 'status_change' | 'discharge';

export interface TimelineEventInput {
  patient_id: number;
  type: TimelineEventType;
  title: string;
  description?: string;
  entity?: string;
  entity_id?: number;
}

const VALID_TYPES: TimelineEventType[] = ['registration', 'assessment', 'treatment_start', 'session', 'note', 'status_change', 'discharge'];

export function validateTimelineEvent(data: unknown): { valid: true; data: TimelineEventInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;
  if (!input.patient_id) return { valid: false, error: 'Paciente requerido' };
  if (!input.type || typeof input.type !== 'string') return { valid: false, error: 'Tipo requerido' };
  if (!VALID_TYPES.includes(input.type as TimelineEventType)) {
    return { valid: false, error: `Tipo inválido. Valores permitidos: ${VALID_TYPES.join(', ')}` };
  }
  if (!input.title || typeof input.title !== 'string') return { valid: false, error: 'Título requerido' };

  return {
    valid: true,
    data: {
      patient_id: input.patient_id as number,
      type: input.type as TimelineEventType,
      title: input.title as string,
      description: (input.description as string) || undefined,
      entity: (input.entity as string) || undefined,
      entity_id: (input.entity_id as number) || undefined,
    },
  };
}
