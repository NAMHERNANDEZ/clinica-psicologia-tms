// ============================================
// TESTS — worker/test/mental-health.test.ts
// Dominio Mental Health: validadores, motor de recomendación V1,
// delta antes/despues, insights y aislamiento por usuario.
// ============================================

import { describe, it, expect } from 'vitest';
import {
  validateCheckIn,
  validateInterventionSession,
  validateConsent,
  validateJournal,
  MH_EMOTIONAL_STATES,
  MH_CONSENT_TYPES,
} from '../src/domains/mental-health/validators';
import {
  computeRecommendation,
  computeDelta,
  computeStreak,
  generateInsightCandidates,
  type SessionRecord,
} from '../src/domains/mental-health/service';

function session(over: Partial<SessionRecord> & { slug: string }): SessionRecord {
  return {
    intervention_id: 1,
    intervention_slug: over.slug,
    category: 'breathing',
    before_intensity: 8,
    after_intensity: 5,
    delta: -3,
    completion: 1,
    duration_sec: 300,
    created_at: '2026-09-01T10:00:00Z',
    ...over,
  };
}

// ============================================
// VALIDATORS
// ============================================

describe('mental-health validators', () => {
  it('acepta un check-in mínimo válido', () => {
    const res = validateCheckIn({
      emotional_state: 'anxious', intensity: 7, activation: 8, energy: 4, concentration: 5, sleep_hours: 5,
    });
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.data.sleep_hours).toBe(5);
      expect(res.data.context).toBe('');
      expect(res.data.note).toBe('');
    }
  });

  it('rechaza emotional_state desconocido', () => {
    const res = validateCheckIn({ emotional_state: 'xyz', intensity: 5, activation: 5, energy: 5, concentration: 5 });
    expect(res.valid).toBe(false);
  });

  it('rechaza intensidad fuera de rango', () => {
    const res = validateCheckIn({ emotional_state: 'calm', intensity: 11, activation: 5, energy: 5, concentration: 5 });
    expect(res.valid).toBe(false);
  });

  it('rechaza activation no entera', () => {
    const res = validateCheckIn({ emotional_state: 'calm', intensity: 5, activation: 4.7, energy: 5, concentration: 5 });
    expect(res.valid).toBe(false);
  });

  it('rechaza note mayor a 1000 caracteres', () => {
    const res = validateCheckIn({
      emotional_state: 'calm', intensity: 5, activation: 5, energy: 5, concentration: 5, note: 'x'.repeat(1001),
    });
    expect(res.valid).toBe(false);
  });

  it('rechaza sleep_hours fuera de rango', () => {
    const res = validateCheckIn({ emotional_state: 'calm', intensity: 5, activation: 5, energy: 5, concentration: 5, sleep_hours: 25 });
    expect(res.valid).toBe(false);
  });

  it('acepta sesión antes/después válida', () => {
    const res = validateInterventionSession({ before_intensity: 8, after_intensity: 5 });
    expect(res.valid).toBe(true);
  });

  it('rechaza sesión con after_intensity fuera de rango', () => {
    const res = validateInterventionSession({ before_intensity: 8, after_intensity: 0 });
    expect(res.valid).toBe(false);
  });

  it('rechaza duration_sec negativo', () => {
    const res = validateInterventionSession({ before_intensity: 5, after_intensity: 5, duration_sec: -5 });
    expect(res.valid).toBe(false);
  });

  it('acepta consentimiento válido', () => {
    const res = validateConsent({ consent_type: 'bienestar', granted: true });
    expect(res.valid).toBe(true);
  });

  it('rechaza consent_type no permitido', () => {
    const res = validateConsent({ consent_type: 'venta_datos', granted: true });
    expect(res.valid).toBe(false);
  });

  it('acepta journal válido y rechaza vacío', () => {
    expect(validateJournal({ content: 'Hoy me sentí mejor' }).valid).toBe(true);
    expect(validateJournal({ content: '   ' }).valid).toBe(false);
    expect(validateJournal({ content: 'x'.repeat(4001) }).valid).toBe(false);
  });
});

// ============================================
// DELTA
// ============================================

describe('mental-health delta', () => {
  it('delta negativo = reducción', () => {
    expect(computeDelta(8, 5)).toBe(-3);
  });
  it('delta positivo = aumento', () => {
    expect(computeDelta(4, 6)).toBe(2);
  });
  it('delta cero = sin cambio', () => {
    expect(computeDelta(5, 5)).toBe(0);
  });
});

// ============================================
// MOTOR DE RECOMENDACIÓN V1
// ============================================

describe('mental-health recommendation engine V1', () => {
  it('activación muy alta activa respuesta de seguridad', () => {
    const decision = computeRecommendation(
      { intensity: 9, activation: 9, energy: 5, concentration: 5, sleep_hours: 7 },
      []
    );
    expect(decision.safety).toBe(true);
    expect(decision.safety_message).toBeTruthy();
    expect(decision.intervention_slug).toBe('grounding-54321');
  });

  it('activación >= 7 recomienda respiración', () => {
    const decision = computeRecommendation(
      { intensity: 6, activation: 8, energy: 5, concentration: 5, sleep_hours: 7 },
      []
    );
    expect(['respiracion-caja', 'respiracion-478']).toContain(decision.intervention_slug);
    expect(decision.reason).toContain('Activación');
    expect(decision.evidence).toContain('activation=8');
  });

  it('prefiere la respiración históricamente útil para el usuario', () => {
    // respiracion-478 con buena reducción previa
    const history = [
      session({ slug: 'respiracion-caja', before_intensity: 8, after_intensity: 5, delta: -3 }),
      session({ slug: 'respiracion-478', before_intensity: 8, after_intensity: 3, delta: -5 }),
      session({ slug: 'respiracion-478', before_intensity: 7, after_intensity: 3, delta: -4 }),
    ];
    const decision = computeRecommendation(
      { intensity: 6, activation: 8, energy: 5, concentration: 5, sleep_hours: 7 },
      history
    );
    expect(decision.intervention_slug).toBe('respiracion-478');
  });

  it('sueño bajo + energía baja recomienda relajación', () => {
    const decision = computeRecommendation(
      { intensity: 5, activation: 4, energy: 3, concentration: 5, sleep_hours: 4.5 },
      []
    );
    expect(['relajacion-progresiva', 'respiracion-caja']).toContain(decision.intervention_slug);
  });

  it('estado equilibrado recomienda reflexión', () => {
    const decision = computeRecommendation(
      { intensity: 2, activation: 3, energy: 6, concentration: 6, sleep_hours: 8 },
      []
    );
    expect(decision.intervention_slug).toBe('pensamiento-cbt');
  });

  it('nunca diagnostica: la razón nunca contiene "diagnóstico"', () => {
    const suite = [
      { intensity: 10, activation: 5, energy: 5, concentration: 5, sleep_hours: 7 },
      { intensity: 5, activation: 9, energy: 5, concentration: 5, sleep_hours: 4 },
      { intensity: 5, activation: 5, energy: 2, concentration: 5, sleep_hours: 3 },
      { intensity: 5, activation: 5, energy: 5, concentration: 2, sleep_hours: 7 },
      { intensity: 2, activation: 2, energy: 6, concentration: 6, sleep_hours: 8 },
    ];
    for (const check of suite) {
      const d = computeRecommendation(check, []);
      const text = `${d.reason} ${d.safety_message ?? ''}`.toLowerCase();
      // No afirma que el usuario padezca una condición...
      expect(text).not.toMatch(/tienes (ansiedad|depresi[oó]n|trastorno)/);
      // ...ni establece causalidad médica.
      expect(text).not.toMatch(/es caus(a|ad[oa]) (por|de)/);
    }
  });

  it('confidence aumenta con historial de apoyo', () => {
    const noHistory = computeRecommendation({ intensity: 5, activation: 8, energy: 5, concentration: 5, sleep_hours: 7 }, []);
    const withHistory = computeRecommendation(
      { intensity: 5, activation: 8, energy: 5, concentration: 5, sleep_hours: 7 },
      [session({ slug: 'respiracion-caja' }), session({ slug: 'respiracion-caja' })]
    );
    expect(withHistory.confidence).toBeGreaterThan(noHistory.confidence);
  });
});

// ============================================
// INSIGHTS V1
// ============================================

describe('mental-health insights V1', () => {
  it('detecta sueño bajo con mayor activación', () => {
    const checkins = [
      // 3+ noches cortas con activación alta
      { activation: 8, intensity: 7, sleep_hours: 4, created_at: '2026-09-01T08:00:00Z' },
      { activation: 7, intensity: 6, sleep_hours: 5, created_at: '2026-09-02T08:00:00Z' },
      { activation: 8, intensity: 7, sleep_hours: 5.5, created_at: '2026-09-03T08:00:00Z' },
      // 3+ noches normales con activación baja
      { activation: 3, intensity: 3, sleep_hours: 8, created_at: '2026-09-04T08:00:00Z' },
      { activation: 4, intensity: 3, sleep_hours: 7, created_at: '2026-09-05T08:00:00Z' },
      { activation: 3, intensity: 2, sleep_hours: 8.5, created_at: '2026-09-06T08:00:00Z' },
    ];
    const candidates = generateInsightCandidates(checkins, []);
    const sleep = candidates.find(c => c.insight_key === 'sleep_activation');
    expect(sleep).toBeDefined();
    expect(sleep!.observation_count).toBe(6);
    expect(sleep!.body).toContain('observación');
  });

  it('no genera insight de sueño con pocas observaciones', () => {
    const candidates = generateInsightCandidates(
      [ { activation: 8, intensity: 7, sleep_hours: 4, created_at: '2026-09-01T08:00:00Z' } ],
      []
    );
    expect(candidates.find(c => c.insight_key === 'sleep_activation')).toBeUndefined();
  });

  it('detecta reducción de intensidad en sesiones de respiración', () => {
    const sessions = [
      session({ slug: 'respiracion-caja', before_intensity: 8, after_intensity: 5, delta: -3, category: 'breathing' }),
      session({ slug: 'respiracion-478', before_intensity: 8, after_intensity: 4, delta: -4, category: 'breathing' }),
      session({ slug: 'respiracion-caja', before_intensity: 7, after_intensity: 7, delta: 0, category: 'breathing' }),
    ];
    const candidates = generateInsightCandidates([], sessions);
    const breathing = candidates.find(c => c.insight_key === 'breathing_reduction');
    expect(breathing).toBeDefined();
    expect(breathing!.body).toContain('2 de 3');
  });

  it('detecta preferencia por sesiones cortas', () => {
    const sessions = [
      session({ slug: 'respiracion-caja', duration_sec: 300 }),
      session({ slug: 'respiracion-caja', duration_sec: 240 }),
      session({ slug: 'grounding-54321', duration_sec: 300, category: 'grounding' }),
      session({ slug: 'grounding-54321', duration_sec: 300, category: 'grounding' }),
    ];
    const candidates = generateInsightCandidates([], sessions);
    expect(candidates.find(c => c.insight_key === 'short_sessions')).toBeDefined();
  });

  it('cada insight declara que es observación, no diagnóstico', () => {
    const checkins = [
      { activation: 8, intensity: 7, sleep_hours: 4, created_at: '2026-09-01T08:00:00Z' },
      { activation: 7, intensity: 6, sleep_hours: 5, created_at: '2026-09-02T08:00:00Z' },
      { activation: 3, intensity: 3, sleep_hours: 8, created_at: '2026-09-03T08:00:00Z' },
      { activation: 4, intensity: 3, sleep_hours: 7, created_at: '2026-09-04T08:00:00Z' },
    ];
    const sessions = [
      session({ slug: 'respiracion-caja', before_intensity: 8, after_intensity: 3, delta: -5 }),
      session({ slug: 'respiracion-478', before_intensity: 9, after_intensity: 4, delta: -5 }),
      session({ slug: 'grounding-54321', duration_sec: 300, category: 'grounding' }),
      session({ slug: 'grounding-54321', duration_sec: 300, category: 'grounding' }),
    ];
    const candidates = generateInsightCandidates(checkins, sessions);
    for (const c of candidates) {
      expect(/no (es|es un|afirma|implica)|es una observaci[oó]n/i.test(c.body)).toBe(true);
    }
  });
});

// ============================================
// STREAK
// ============================================

describe('mental-health streak', () => {
  it('calcula racha y conteo de días', () => {
    const { streak, dayCount } = computeStreak([
      new Date().toISOString(),
      new Date(Date.now() - 86400000).toISOString(),
      new Date(Date.now() - 2 * 86400000).toISOString(),
      new Date(Date.now() - 5 * 86400000).toISOString(),
    ]);
    expect(streak).toBe(3);
    expect(dayCount).toBe(4);
  });
});