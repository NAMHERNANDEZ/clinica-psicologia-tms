export interface AlertInput {
  type: string;
  title: string;
  message: string;
  severity?: string;
  entity?: string;
  entity_id?: number;
}

export function validateAlertCreate(data: unknown): AlertInput {
  if (!data || typeof data !== 'object') {
    throw new Error('Request body is required');
  }

  const input = data as Record<string, unknown>;

  if (!input.type || typeof input.type !== 'string') {
    throw new Error('type is required');
  }

  if (!input.title || typeof input.title !== 'string') {
    throw new Error('title is required');
  }

  if (!input.message || typeof input.message !== 'string') {
    throw new Error('message is required');
  }

  const severity = input.severity ?? 'info';
  if (!['info', 'warning', 'critical'].includes(severity as string)) {
    throw new Error('severity must be info, warning, or critical');
  }

  return {
    type: input.type as string,
    title: input.title as string,
    message: input.message as string,
    severity: severity as string,
    entity: (input.entity as string) || undefined,
    entity_id: (input.entity_id as number) || undefined,
  };
}
