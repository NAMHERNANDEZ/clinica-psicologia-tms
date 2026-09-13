// ============================================
// VALIDATORS — worker/src/domains/mental-health/validators.ts
// Dominio Mental Health (bienestar personal, user-scoped).
// ============================================

export const MH_EMOTIONAL_STATES = [
  'calm', 'happy', 'content', 'neutral', 'sad', 'anxious',
  'stressed', 'overwhelmed', 'angry', 'tired', 'low',
] as const;
export type MhEmotionalState = (typeof MH_EMOTIONAL_STATES)[number];

export const MH_CONSENT_TYPES = [
  'bienestar',          // registrar datos de bienestar/mood
  'analisis_patrones',  // generar insights sobre el historial propio
  'compartir_profesional', // compartir resumen con profesional (solo con consentimiento explicit)
] as const;
export type MhConsentType = (typeof MH_CONSENT_TYPES)[number];

export const MH_CATEGORIES = [
  'breathing', 'grounding', 'mindfulness', 'relaxation', 'focus', 'sleep', 'reflection',
] as const;
export type MhCategory = (typeof MH_CATEGORIES)[number];

export interface MhCheckInInput {
  emotional_state: MhEmotionalState;
  intensity: number;      // 1..10
  activation: number;     // 1..10 (ansiedad / activacion)
  energy: number;         // 1..10
  concentration: number;  // 1..10
  sleep_hours: number | null; // 0..24
  context: string;
  note: string;
}

export interface MhSessionInput {
  before_intensity: number; // 1..10
  after_intensity: number;  // 1..10
  completion: 0 | 1;
  duration_sec: number | null;
  feedback: number | null;  // 1..5
  note: string;
}

export interface MhConsentInput {
  consent_type: MhConsentType;
  granted: boolean;
}

export interface MhJournalInput {
  content: string;
  linked_checkin_id: number | null;
}

// Catalogo de intervenciones (estructura; los datos viven en D1 seed).
export interface MhIntervention {
  id: number;
  slug: string;
  title: string;
  description: string;
  duration_sec: number;
  category: MhCategory;
  difficulty: string;
  instructions: string;
  before_measurements: string;
  after_measurements: string;
  contraindications_or_limits: string | null;
}

type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

// ============================================
// Validators
// ============================================

function asRecord(data: unknown): Record<string, unknown> {
  return (data ?? {}) as Record<string, unknown>;
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

export function validateCheckIn(data: unknown): ValidationResult<MhCheckInInput> {
  const input = asRecord(data);

  if (typeof input.emotional_state !== 'string' || !(MH_EMOTIONAL_STATES as readonly string[]).includes(input.emotional_state)) {
    return { valid: false, error: `emotional_state inválido. Valores permitidos: ${MH_EMOTIONAL_STATES.join(', ')}` };
  }
  if (!isIntInRange(input.intensity, 1, 10)) {
    return { valid: false, error: 'intensity debe ser un entero entre 1 y 10' };
  }
  if (!isIntInRange(input.activation, 1, 10)) {
    return { valid: false, error: 'activation debe ser un entero entre 1 y 10' };
  }
  if (!isIntInRange(input.energy, 1, 10)) {
    return { valid: false, error: 'energy debe ser un entero entre 1 y 10' };
  }
  if (!isIntInRange(input.concentration, 1, 10)) {
    return { valid: false, error: 'concentration debe ser un entero entre 1 y 10' };
  }

  let sleepHours: number | null = null;
  if (input.sleep_hours !== undefined && input.sleep_hours !== null) {
    if (typeof input.sleep_hours !== 'number' || !Number.isFinite(input.sleep_hours) || input.sleep_hours < 0 || input.sleep_hours > 24) {
      return { valid: false, error: 'sleep_hours debe ser un número entre 0 y 24' };
    }
    sleepHours = input.sleep_hours;
  }

  const context = input.context === undefined ? '' : String(input.context);
  if (context.length > 200) return { valid: false, error: 'context no puede superar 200 caracteres' };
  const note = input.note === undefined ? '' : String(input.note);
  if (note.length > 1000) return { valid: false, error: 'note no puede superar 1000 caracteres' };

  return {
    valid: true,
    data: {
      emotional_state: input.emotional_state as MhEmotionalState,
      intensity: input.intensity as number,
      activation: input.activation as number,
      energy: input.energy as number,
      concentration: input.concentration as number,
      sleep_hours: sleepHours,
      context,
      note,
    },
  };
}

export function validateInterventionSession(data: unknown): ValidationResult<MhSessionInput> {
  const input = asRecord(data);

  if (!isIntInRange(input.before_intensity, 1, 10)) {
    return { valid: false, error: 'before_intensity debe ser un entero entre 1 y 10' };
  }
  if (!isIntInRange(input.after_intensity, 1, 10)) {
    return { valid: false, error: 'after_intensity debe ser un entero entre 1 y 10' };
  }

  let completion: 0 | 1 = 1;
  if (input.completion !== undefined) {
    if (input.completion !== 0 && input.completion !== 1) {
      return { valid: false, error: 'completion debe ser 0 o 1' };
    }
    completion = input.completion as 0 | 1;
  }

  let durationSec: number | null = null;
  if (input.duration_sec !== undefined && input.duration_sec !== null) {
    if (typeof input.duration_sec !== 'number' || !Number.isFinite(input.duration_sec) || input.duration_sec <= 0 || input.duration_sec > 7200) {
      return { valid: false, error: 'duration_sec debe ser un número entre 1 y 7200' };
    }
    durationSec = Math.round(input.duration_sec);
  }

  let feedback: number | null = null;
  if (input.feedback !== undefined && input.feedback !== null) {
    if (!isIntInRange(input.feedback, 1, 5)) {
      return { valid: false, error: 'feedback debe ser un entero entre 1 y 5' };
    }
    feedback = input.feedback;
  }

  const note = input.note === undefined ? '' : String(input.note);
  if (note.length > 500) return { valid: false, error: 'note no puede superar 500 caracteres' };

  return {
    valid: true,
    data: { before_intensity: input.before_intensity as number, after_intensity: input.after_intensity as number, completion, duration_sec: durationSec, feedback, note },
  };
}

export function validateConsent(data: unknown): ValidationResult<MhConsentInput> {
  const input = asRecord(data);
  if (typeof input.consent_type !== 'string' || !(MH_CONSENT_TYPES as readonly string[]).includes(input.consent_type)) {
    return { valid: false, error: `consent_type inválido. Valores permitidos: ${MH_CONSENT_TYPES.join(', ')}` };
  }
  if (typeof input.granted !== 'boolean') {
    return { valid: false, error: 'granted debe ser un booleano' };
  }
  return { valid: true, data: { consent_type: input.consent_type as MhConsentType, granted: input.granted } };
}

export function validateJournal(data: unknown): ValidationResult<MhJournalInput> {
  const input = asRecord(data);
  if (typeof input.content !== 'string' || input.content.trim().length === 0) {
    return { valid: false, error: 'content es requerido' };
  }
  const content = input.content.trim();
  if (content.length > 4000) return { valid: false, error: 'content no puede superar 4000 caracteres' };

  let linkedCheckinId: number | null = null;
  if (input.linked_checkin_id !== undefined && input.linked_checkin_id !== null) {
    const id = Number(input.linked_checkin_id);
    if (!Number.isInteger(id) || id <= 0) {
      return { valid: false, error: 'linked_checkin_id inválido' };
    }
    linkedCheckinId = id;
  }

  return { valid: true, data: { content, linked_checkin_id: linkedCheckinId } };
}

export function validateId(value: unknown): ValidationResult<number> {
  if (value === undefined || value === null) return { valid: false, error: 'id es requerido' };
  const id = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  if (!Number.isInteger(id) || id <= 0) return { valid: false, error: 'id debe ser un número entero positivo' };
  return { valid: true, data: id };
}

// Rango de fecha ISO usado en queries
export function toISO(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}