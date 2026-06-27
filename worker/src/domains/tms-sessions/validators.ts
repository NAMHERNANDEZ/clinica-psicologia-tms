export type TmsSessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface TmsSessionInput {
  profile_id: number;
  session_number: number;
  appointment_id?: number;
  motor_threshold_pct: number;
  intensity_pct_mt: number;
  effective_intensity?: number;
  target_area: string;
  coil_position?: string;
  frequency_hz: number;
  pulses_delivered: number;
  session_duration_min: number;
  stimulation_type?: string;
  status?: TmsSessionStatus;
  notes?: string;
}

export function validateTmsSession(data: unknown): { valid: true; data: TmsSessionInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.profile_id || typeof input.profile_id !== 'number') {
    return { valid: false, error: 'profile_id requerido' };
  }
  if (!input.session_number || typeof input.session_number !== 'number') {
    return { valid: false, error: 'session_number requerido' };
  }
  if (input.motor_threshold_pct === undefined || typeof input.motor_threshold_pct !== 'number' || input.motor_threshold_pct <= 0) {
    return { valid: false, error: 'motor_threshold_pct requerido y debe ser mayor a 0' };
  }
  if (input.intensity_pct_mt === undefined || typeof input.intensity_pct_mt !== 'number' || input.intensity_pct_mt <= 0) {
    return { valid: false, error: 'intensity_pct_mt requerido y debe ser mayor a 0' };
  }
  if (!input.target_area || typeof input.target_area !== 'string') {
    return { valid: false, error: 'target_area requerido' };
  }
  if (input.frequency_hz === undefined || typeof input.frequency_hz !== 'number' || input.frequency_hz <= 0) {
    return { valid: false, error: 'frequency_hz requerido y debe ser mayor a 0' };
  }
  if (input.pulses_delivered === undefined || typeof input.pulses_delivered !== 'number' || input.pulses_delivered <= 0) {
    return { valid: false, error: 'pulses_delivered requerido y debe ser mayor a 0' };
  }
  if (input.session_duration_min === undefined || typeof input.session_duration_min !== 'number' || input.session_duration_min <= 0) {
    return { valid: false, error: 'session_duration_min requerido y debe ser mayor a 0' };
  }

  const validStatuses: TmsSessionStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'];
  if (input.status !== undefined && !validStatuses.includes(input.status as TmsSessionStatus)) {
    return { valid: false, error: 'Estado inválido. Valores permitidos: scheduled, in_progress, completed, cancelled, no_show' };
  }

  return {
    valid: true,
    data: {
      profile_id: input.profile_id as number,
      session_number: input.session_number as number,
      appointment_id: input.appointment_id !== undefined ? (input.appointment_id as number) : undefined,
      motor_threshold_pct: input.motor_threshold_pct as number,
      intensity_pct_mt: input.intensity_pct_mt as number,
      effective_intensity: input.effective_intensity !== undefined ? (input.effective_intensity as number) : undefined,
      target_area: input.target_area as string,
      coil_position: input.coil_position !== undefined ? (input.coil_position as string) : undefined,
      frequency_hz: input.frequency_hz as number,
      pulses_delivered: input.pulses_delivered as number,
      session_duration_min: input.session_duration_min as number,
      stimulation_type: input.stimulation_type !== undefined ? (input.stimulation_type as string) : undefined,
      status: (input.status as TmsSessionStatus) || undefined,
      notes: input.notes !== undefined ? (input.notes as string) : undefined,
    },
  };
}

export interface TmsSessionUpdateStatusInput {
  session_id: number;
  status: TmsSessionStatus;
  notes?: string;
}

export function validateTmsSessionUpdateStatus(data: unknown): { valid: true; data: TmsSessionUpdateStatusInput } | { valid: false; error: string } {
  const input = data as Record<string, unknown>;

  if (!input.session_id || typeof input.session_id !== 'number') {
    return { valid: false, error: 'session_id requerido' };
  }

  const validStatuses: TmsSessionStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'];
  if (!input.status || typeof input.status !== 'string' || !validStatuses.includes(input.status as TmsSessionStatus)) {
    return { valid: false, error: 'Estado inválido. Valores permitidos: scheduled, in_progress, completed, cancelled, no_show' };
  }

  return {
    valid: true,
    data: {
      session_id: input.session_id as number,
      status: input.status as TmsSessionStatus,
      notes: input.notes !== undefined ? (input.notes as string) : undefined,
    },
  };
}
