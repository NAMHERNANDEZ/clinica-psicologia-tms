const ALLOWED_COLUMNS: Record<string, string[]> = {
  patients: ['name', 'phone', 'email', 'birthdate', 'status'],
  therapists: ['name', 'email', 'phone', 'specialty', 'active'],
  appointments: ['patient_id', 'therapist_id', 'date', 'time', 'duration', 'status', 'notes'],
  treatments: ['name', 'protocol', 'total_sessions', 'completed_sessions', 'status', 'start_date', 'end_date', 'notes', 'patient_id', 'therapist_id'],
  tms_protocols: ['name', 'description', 'indication', 'target_area', 'frequency_hz', 'intensity_pct_mt', 'pulses_per_session', 'session_duration_min', 'total_sessions', 'rest_period_sec', 'stimulation_type', 'evidence_level', 'active'],
};

export function sanitizeUpdateFields(table: string, data: Record<string, unknown>): { fields: string[]; values: unknown[] } {
  const allowed = ALLOWED_COLUMNS[table];
  if (!allowed) return { fields: [], values: [] };

  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && allowed.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  return { fields, values };
}
