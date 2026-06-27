export type StimulationType = 'high_freq' | 'low_freq' | 'theta_burst' | 'intermittent' | 'continuous';
export type EvidenceLevel = 'strong' | 'moderate' | 'emerging';

export interface TmsProtocolInput {
  name: string;
  description?: string;
  indication: string;
  target_area: string;
  frequency_hz: number;
  intensity_pct_mt: number;
  pulses_per_session: number;
  session_duration_min: number;
  total_sessions: number;
  rest_period_sec: number;
  stimulation_type: StimulationType;
  evidence_level: EvidenceLevel;
}

export function validateTmsProtocol(data: unknown): { valid: true; data: TmsProtocolInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.name || typeof input.name !== 'string') return { valid: false, error: 'Nombre requerido' };
  if (!input.indication || typeof input.indication !== 'string') return { valid: false, error: 'Indicación requerida' };
  if (!input.target_area || typeof input.target_area !== 'string') return { valid: false, error: 'Área objetivo requerida' };

  if (input.frequency_hz === undefined || typeof input.frequency_hz !== 'number' || input.frequency_hz <= 0) {
    return { valid: false, error: 'Frecuencia (Hz) requerida y debe ser mayor a 0' };
  }
  if (input.intensity_pct_mt === undefined || typeof input.intensity_pct_mt !== 'number' || input.intensity_pct_mt <= 0) {
    return { valid: false, error: 'Intensidad (% MT) requerida y debe ser mayor a 0' };
  }
  if (input.pulses_per_session === undefined || typeof input.pulses_per_session !== 'number' || input.pulses_per_session <= 0) {
    return { valid: false, error: 'Pulsos por sesión requerido y debe ser mayor a 0' };
  }
  if (input.session_duration_min === undefined || typeof input.session_duration_min !== 'number' || input.session_duration_min <= 0) {
    return { valid: false, error: 'Duración de sesión (min) requerida y debe ser mayor a 0' };
  }
  if (input.total_sessions !== undefined && (typeof input.total_sessions !== 'number' || input.total_sessions <= 0)) {
    return { valid: false, error: 'Total de sesiones debe ser mayor a 0' };
  }

  const validStimulationTypes = ['high_freq', 'low_freq', 'theta_burst', 'intermittent', 'continuous'];
  if (input.stimulation_type && !validStimulationTypes.includes(input.stimulation_type as string)) {
    return { valid: false, error: 'Tipo de estimulación inválido' };
  }

  const validEvidenceLevels = ['strong', 'moderate', 'emerging'];
  if (input.evidence_level && !validEvidenceLevels.includes(input.evidence_level as string)) {
    return { valid: false, error: 'Nivel de evidencia inválido' };
  }

  return {
    valid: true,
    data: {
      name: input.name as string,
      description: (input.description as string) || undefined,
      indication: input.indication as string,
      target_area: input.target_area as string,
      frequency_hz: input.frequency_hz as number,
      intensity_pct_mt: input.intensity_pct_mt as number,
      pulses_per_session: input.pulses_per_session as number,
      session_duration_min: input.session_duration_min as number,
      total_sessions: (input.total_sessions as number) || 20,
      rest_period_sec: (input.rest_period_sec as number) || 30,
      stimulation_type: (input.stimulation_type as StimulationType) || 'high_freq',
      evidence_level: (input.evidence_level as EvidenceLevel) || 'moderate',
    },
  };
}
