// ============================================
// CBT VALIDATORS — MH-EXPANSION 1.2
// Formulación CBT integrada sobre therapeutic-engine existente.
// No crea lógica de scoring paralela ni catálogo duplicado.
// ============================================

export const CBT_PHASES = [
  'listen','reflect','validate','explore','formulate','intervene','practice','reevaluate','next_step','closure'
] as const;
export type CbtPhase = typeof CBT_PHASES[number];

export const CBT_STRATEGIES = [
  'breathing','cognitive_restructuring','grounding','behavioral_activation','sleep_hygiene','mindfulness','problem_solving','exposure'
] as const;
export type CbtStrategy = typeof CBT_STRATEGIES[number];

export const CBT_STATUS = ['active','completed','cancelled'] as const;
export type CbtStatus = typeof CBT_STATUS[number];

export interface CbtFormulationInput {
  situation?: string;
  automatic_thought?: string;
  emotion?: string;
  emotion_intensity?: number | null;
  behavior?: string;
  evidence_for?: string;
  evidence_against?: string;
  balanced_thought?: string;
  experiment?: string;
  experiment_outcome?: string;
}

export interface CbtCreateInput {
  linked_checkin_id?: number | null;
  before_score?: number | null;
  context_json?: string | null;
}

export interface CbtUpdateInput extends CbtFormulationInput {
  phase?: CbtPhase;
  selected_strategy?: CbtStrategy | null;
  intervention_slug?: string | null;
  before_score?: number | null;
  after_score?: number | null;
  insight?: string | null;
  next_step?: string | null;
  status?: CbtStatus;
}

type ValidationResult<T> = { valid: true; data: T } | { valid: false; error: string };

function asRecord(v: unknown): Record<string, unknown> {
  return (v ?? {}) as Record<string, unknown>;
}
function isIntInRange(v: unknown, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}
function strOrEmpty(v: unknown, max: number, field: string): ValidationResult<string> {
  if (v === undefined || v === null) return { valid: true, data: '' };
  const s = String(v);
  if (s.length > max) return { valid: false, error: `${field} no puede superar ${max} caracteres` };
  return { valid: true, data: s };
}

export function validateCbtPhase(v: unknown): ValidationResult<CbtPhase> {
  if (typeof v !== 'string' || !(CBT_PHASES as readonly string[]).includes(v)) {
    return { valid: false, error: `phase inválida. Valores: ${CBT_PHASES.join(', ')}` };
  }
  return { valid: true, data: v as CbtPhase };
}

export function validateCbtStrategy(v: unknown): ValidationResult<CbtStrategy> {
  if (typeof v !== 'string' || !(CBT_STRATEGIES as readonly string[]).includes(v)) {
    return { valid: false, error: `selected_strategy inválida. Valores: ${CBT_STRATEGIES.join(', ')}` };
  }
  return { valid: true, data: v as CbtStrategy };
}

export function validateCbtCreate(data: unknown): ValidationResult<CbtCreateInput> {
  const r = asRecord(data);
  let linked_checkin_id: number | null = null;
  if (r.linked_checkin_id !== undefined && r.linked_checkin_id !== null) {
    const n = Number(r.linked_checkin_id);
    if (!Number.isInteger(n) || n <= 0) return { valid: false, error: 'linked_checkin_id inválido' };
    linked_checkin_id = n;
  }
  let before_score: number | null = null;
  if (r.before_score !== undefined && r.before_score !== null) {
    if (!isIntInRange(r.before_score, 1, 10)) return { valid: false, error: 'before_score debe ser entero 1..10' };
    before_score = r.before_score as number;
  }
  let context_json: string | null = null;
  if (r.context_json !== undefined && r.context_json !== null) {
    const s = String(r.context_json);
    if (s.length > 4000) return { valid: false, error: 'context_json no puede superar 4000 caracteres' };
    // validar que sea JSON si parece JSON
    try { if (s.trim().startsWith('{') || s.trim().startsWith('[')) JSON.parse(s); } catch { return { valid: false, error: 'context_json debe ser JSON válido' }; }
    context_json = s;
  }
  return { valid: true, data: { linked_checkin_id, before_score, context_json } };
}

export function validateCbtFormulation(data: unknown): ValidationResult<CbtFormulationInput> {
  const r = asRecord(data);
  const fields: Array<[string, number]> = [
    ['situation', 1000], ['automatic_thought', 1000], ['emotion', 200], ['behavior', 1000],
    ['evidence_for', 2000], ['evidence_against', 2000], ['balanced_thought', 2000],
    ['experiment', 2000], ['experiment_outcome', 2000],
  ];
  const out: CbtFormulationInput = {};
  for (const [field, max] of fields) {
    if (r[field] !== undefined && r[field] !== null) {
      const s = String(r[field]);
      if (s.length > max) return { valid: false, error: `${field} no puede superar ${max} caracteres` };
      (out as Record<string, unknown>)[field] = s;
    }
  }
  if (r.emotion_intensity !== undefined && r.emotion_intensity !== null) {
    if (!isIntInRange(r.emotion_intensity, 1, 10)) return { valid: false, error: 'emotion_intensity debe ser 1..10' };
    out.emotion_intensity = r.emotion_intensity as number;
  }
  if (r.emotion_intensity === null) out.emotion_intensity = null;
  return { valid: true, data: out };
}

export function validateCbtUpdate(data: unknown): ValidationResult<CbtUpdateInput> {
  const r = asRecord(data);
  const base = validateCbtFormulation(data);
  if (!base.valid) return base;
  const out: CbtUpdateInput = { ...base.data };

  if (r.phase !== undefined && r.phase !== null) {
    const v = validateCbtPhase(r.phase);
    if (!v.valid) return v;
    out.phase = v.data;
  }
  if (r.selected_strategy !== undefined) {
    if (r.selected_strategy === null) out.selected_strategy = null;
    else {
      const v = validateCbtStrategy(r.selected_strategy);
      if (!v.valid) return v;
      out.selected_strategy = v.data;
    }
  }
  if (r.intervention_slug !== undefined) {
    if (r.intervention_slug === null) out.intervention_slug = null;
    else {
      const s = String(r.intervention_slug);
      if (s.length > 100) return { valid: false, error: 'intervention_slug no puede superar 100 caracteres' };
      out.intervention_slug = s;
    }
  }
  if (r.before_score !== undefined) {
    if (r.before_score === null) out.before_score = null;
    else if (!isIntInRange(r.before_score, 1, 10)) return { valid: false, error: 'before_score 1..10' };
    else out.before_score = r.before_score as number;
  }
  if (r.after_score !== undefined) {
    if (r.after_score === null) out.after_score = null;
    else if (!isIntInRange(r.after_score, 1, 10)) return { valid: false, error: 'after_score 1..10' };
    else out.after_score = r.after_score as number;
  }
  if (r.insight !== undefined) {
    if (r.insight === null) out.insight = null;
    else {
      const s = String(r.insight);
      if (s.length > 2000) return { valid: false, error: 'insight no puede superar 2000 caracteres' };
      out.insight = s;
    }
  }
  if (r.next_step !== undefined) {
    if (r.next_step === null) out.next_step = null;
    else {
      const s = String(r.next_step);
      if (s.length > 2000) return { valid: false, error: 'next_step no puede superar 2000 caracteres' };
      out.next_step = s;
    }
  }
  if (r.status !== undefined && r.status !== null) {
    if (typeof r.status !== 'string' || !(CBT_STATUS as readonly string[]).includes(r.status)) {
      return { valid: false, error: `status inválido: ${CBT_STATUS.join(', ')}` };
    }
    out.status = r.status as CbtStatus;
  }
  return { valid: true, data: out };
}

export function validateCbtReevaluate(data: unknown): ValidationResult<{ after_score: number; experiment_outcome?: string }> {
  const r = asRecord(data);
  if (!isIntInRange(r.after_score, 1, 10)) return { valid: false, error: 'after_score requerido 1..10' };
  let experiment_outcome: string | undefined;
  if (r.experiment_outcome !== undefined && r.experiment_outcome !== null) {
    const s = String(r.experiment_outcome);
    if (s.length > 2000) return { valid: false, error: 'experiment_outcome no puede superar 2000 caracteres' };
    experiment_outcome = s;
  }
  return { valid: true, data: { after_score: r.after_score as number, experiment_outcome } };
}
