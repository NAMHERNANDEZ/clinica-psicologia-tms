export interface QualityMetric {
  id: number;
  clinic_id: number;
  metric_type: string;
  value: number;
  unit: string;
  period_start: string;
  period_end: string;
  notes?: string;
}

export interface CreateQualityMetric {
  metric_type: string;
  value: number;
  unit: string;
  period_start: string;
  period_end: string;
  notes?: string;
}

const VALID_METRIC_TYPES = [
  'treatment_completion_rate',
  'patient_satisfaction',
  'adverse_effect_rate',
  'session_attendance',
  'protocol_adherence',
  'clinical_improvement',
  'appointment_no_show_rate',
  'average_wait_time',
  'response_time_days',
];

export function validateQualityMetric(body: unknown): { valid: true; data: CreateQualityMetric } | { valid: false; error: string; status: number } {
  const data = body as Record<string, unknown>;

  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Body requerido', status: 400 };
  }

  if (!data.metric_type || typeof data.metric_type !== 'string' || !VALID_METRIC_TYPES.includes(data.metric_type)) {
    return { valid: false, error: `metric_type debe ser: ${VALID_METRIC_TYPES.join(', ')}`, status: 400 };
  }

  if (data.value === undefined || typeof data.value !== 'number' || data.value < 0) {
    return { valid: false, error: 'value debe ser un numero >= 0', status: 400 };
  }

  if (!data.unit || typeof data.unit !== 'string') {
    return { valid: false, error: 'unit requerido (%, hours, count, score)', status: 400 };
  }

  if (!data.period_start || typeof data.period_start !== 'string') {
    return { valid: false, error: 'period_start requerido (ISO date)', status: 400 };
  }

  if (!data.period_end || typeof data.period_end !== 'string') {
    return { valid: false, error: 'period_end requerido (ISO date)', status: 400 };
  }

  return {
    valid: true,
    data: {
      metric_type: data.metric_type,
      value: data.value,
      unit: data.unit as string,
      period_start: data.period_start as string,
      period_end: data.period_end as string,
      notes: data.notes as string | undefined,
    },
  };
}

export function parseDateRange(query: URLSearchParams): { from: string | null; to: string | null } {
  return {
    from: query.get('from') || null,
    to: query.get('to') || null,
  };
}
