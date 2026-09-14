// ============================================
// TESTS — MH-EXPANSION 1.2 CBT integrado
// Contrato, mapper, safety, phase, delta, reevaluación
// ============================================

import { describe, it, expect } from 'vitest';
import { validateCbtCreate, validateCbtFormulation, validateCbtUpdate, validateCbtReevaluate, CBT_PHASES, CBT_STRATEGIES } from '../src/domains/mental-health/cbt-validators';
import { mapFormulationToStrategy, checkCrisisGate, computeCbtDelta, buildCbtInsight, nextPhase, isValidTransition } from '../src/domains/mental-health/cbt-service';

// ---- validators ----
describe('cbt validators', () => {
  it('acepta create mínimo', () => { expect(validateCbtCreate({ before_score: 5 }).valid).toBe(true); });
  it('rechaza before_score fuera de rango', () => { expect(validateCbtCreate({ before_score: 11 }).valid).toBe(false); });
  it('acepta formulación parcial', () => {
    const r = validateCbtFormulation({ situation: 'reunión', automatic_thought: 'fracasaré', emotion_intensity: 8 });
    expect(r.valid).toBe(true);
  });
  it('rechaza emotion_intensity fuera de rango', () => {
    expect(validateCbtFormulation({ emotion_intensity: 11 }).valid).toBe(false);
  });
  it('rechaza reevaluate sin after_score', () => {
    expect(validateCbtReevaluate({}).valid).toBe(false);
  });
  it('acepta reevaluate válido', () => {
    expect(validateCbtReevaluate({ after_score: 3 }).valid).toBe(true);
  });
  it('update acepta phase válida y rechaza inválida', () => {
    expect(validateCbtUpdate({ phase: 'formulate' }).valid).toBe(true);
    expect(validateCbtUpdate({ phase: 'invalid' as any }).valid).toBe(false);
  });
  it('10 fases terapéuticas definidas', () => {
    expect(CBT_PHASES).toEqual(['listen','reflect','validate','explore','formulate','intervene','practice','reevaluate','next_step','closure']);
  });
  it('8 estrategias sin duplicar catálogo', () => {
    expect(CBT_STRATEGIES.length).toBe(8);
  });
});

// ---- safety gate ----
describe('safety gate', () => {
  it('activa crisis si before_score >=9', () => {
    const r = checkCrisisGate(9, null, null);
    expect(r.crisis).toBe(true);
    expect(r.message).toBeTruthy();
    // debe aclarar que NO es diagnóstico
    expect(r.message).toMatch(/no un diagnóstico/);
    expect(r.message).not.toMatch(/tienes (ansiedad|depresión|trastorno)/i);
  });
  it('no activa crisis con valores moderados', () => {
    expect(checkCrisisGate(5, 5, 5).crisis).toBe(false);
  });
  it('activa si checkin intensidad >=9', () => {
    expect(checkCrisisGate(5, 5, 9).crisis).toBe(true);
  });
});

// ---- strategy mapper ----
describe('strategy mapper (reutiliza slugs existentes)', () => {
  it('pensamiento catastrófico → cognitive_restructuring / pensamiento-cbt', () => {
    const d = mapFormulationToStrategy({ automatic_thought: 'siempre fracaso, nunca podré' });
    expect(d.selected_strategy).toBe('cognitive_restructuring');
    expect(d.intervention_slug).toBe('pensamiento-cbt');
    expect(d.disclaimer).toBeTruthy();
  });
  it('evitación → exposure / grounding-54321', () => {
    const d = mapFormulationToStrategy({ behavior: 'evité salir de casa', situation: 'reunión evitada' });
    expect(d.selected_strategy).toBe('exposure');
    expect(d.intervention_slug).toBe('grounding-54321');
  });
  it('ansiedad alta → breathing', () => {
    const d = mapFormulationToStrategy({ emotion: 'ansiedad', emotion_intensity: 8, before_score: 8 });
    expect(d.selected_strategy).toBe('breathing');
    expect(['respiracion-caja','respiracion-478']).toContain(d.intervention_slug);
  });
  it('sueño corto en context → sleep_hygiene / relajacion-progresiva', () => {
    const d = mapFormulationToStrategy({ context_json: JSON.stringify({ sleep_hours: 4, activation: 4 }) });
    expect(d.selected_strategy).toBe('sleep_hygiene');
    expect(d.intervention_slug).toBe('relajacion-progresiva');
  });
  it('todos los slugs mapeados existen en catálogo V1', () => {
    const allowed = new Set(['respiracion-478','respiracion-caja','grounding-54321','atencion-plena-minuto','relajacion-progresiva','pensamiento-cbt']);
    const cases = [
      mapFormulationToStrategy({ automatic_thought: 'siempre es un fracaso' }),
      mapFormulationToStrategy({ behavior: 'evité' }),
      mapFormulationToStrategy({ emotion: 'ansiedad', before_score: 8 }),
      mapFormulationToStrategy({ context_json: JSON.stringify({ sleep_hours: 4 }) }),
      mapFormulationToStrategy({ emotion: 'triste', behavior: 'no hice nada' }),
      mapFormulationToStrategy({}),
    ];
    for (const c of cases) expect(allowed.has(c.intervention_slug)).toBe(true);
  });
  it('no afirma diagnóstico', () => {
    const d = mapFormulationToStrategy({ automatic_thought: 'todo mal' });
    expect(d.reason.toLowerCase()).not.toMatch(/diagnóstico|trastorno|padeces/);
  });
});

// ---- phase machine ----
describe('phase machine', () => {
  it('nextPhase avanza correctamente', () => {
    expect(nextPhase('listen')).toBe('reflect');
    expect(nextPhase('closure')).toBeNull();
  });
  it('isValidTransition permite avance, no retroceso', () => {
    expect(isValidTransition('listen','formulate')).toBe(true);
    expect(isValidTransition('formulate','listen')).toBe(false);
  });
});

// ---- delta / insight ----
describe('reevaluate before/after', () => {
  it('delta negativo si mejora', () => { expect(computeCbtDelta(8,5)).toBe(-3); });
  it('insight menciona observación y aclara no diagnóstico', () => {
    const msg = buildCbtInsight(-3,8,5);
    expect(msg.toLowerCase()).toContain('observación');
    expect(msg).toMatch(/no un diagnóstico|no.*diagnóstico/i);
  });
  it('insight delta positivo también observado', () => {
    expect(buildCbtInsight(2,4,6).toLowerCase()).toContain('observación');
  });
});
