import { describe, it, expect } from 'vitest';
import {
  WELLBEING_QUESTIONS,
  getWellbeingQuestions,
  buildResponses,
  isWellbeingComplete,
  WELLBEING_QUESTION_MAX,
} from '../src/lib/wellbeing-questions';

describe('wellbeing-questions (contenido de instrumentos)', () => {
  it('tiene las 6 escalas wellbeing con el item_count y max_score coherentes con el backend', () => {
    // Contrato backend (worker validators): stress 4x4=16, sleep 5x3=15, who5 5x5=25,
    // gad2 2x3=6, energy 3x10=30, focus 3x4=12
    const expected = {
      'stress-pss4': { items: 4, max: 16, per: 4 },
      'sleep-sq5': { items: 5, max: 15, per: 3 },
      'wellbeing-who5': { items: 5, max: 25, per: 5 },
      'activation-gad2': { items: 2, max: 6, per: 3 },
      'energy-vas3': { items: 3, max: 30, per: 10 },
      'focus-cfq3': { items: 3, max: 12, per: 4 },
    };
    for (const [scaleId, spec] of Object.entries(expected)) {
      const qs = getWellbeingQuestions(scaleId);
      expect(qs.length).toBe(spec.items);
      expect(WELLBEING_QUESTION_MAX[scaleId]).toBe(spec.per);
      // valores de las opciones dentro de [0, per]
      for (const q of qs) {
        for (const o of q.options) {
          expect(o.value).toBeGreaterThanOrEqual(0);
          expect(o.value).toBeLessThanOrEqual(spec.per);
        }
      }
    }
  });

  it('las opciones de cada pregunta son únicas por valor y con label no vacío', () => {
    for (const [scaleId, qs] of Object.entries(WELLBEING_QUESTIONS)) {
      for (const q of qs) {
        const values = q.options.map((o) => o.value);
        expect(new Set(values).size).toBe(values.length);
        for (const o of q.options) expect(o.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('buildResponses genera el payload {item_id, value} que el backend espera', () => {
    const answers = { s1: 3, s2: 2, s3: 1, s4: 2 };
    const resp = buildResponses('stress-pss4', answers);
    expect(resp).toEqual([
      { item_id: 's1', value: 3 },
      { item_id: 's2', value: 2 },
      { item_id: 's3', value: 1 },
      { item_id: 's4', value: 2 },
    ]);
  });

  it('buildResponses omite ítems sin responder o no numéricos (preview parcial inválido no se envía)', () => {
    const answers = { s1: 3, s2: undefined, s3: 1, s99: 7 };
    const resp = buildResponses('stress-pss4', answers);
    expect(resp).toEqual([{ item_id: 's1', value: 3 }, { item_id: 's3', value: 1 }]);
  });

  it('isWellbeingComplete exige todas las preguntas respondidas', () => {
    expect(isWellbeingComplete('stress-pss4', { s1: 0, s2: 1, s3: 2, s4: 3 })).toBe(true);
    expect(isWellbeingComplete('stress-pss4', { s1: 0, s2: 1, s3: 2 })).toBe(false);
    expect(isWellbeingComplete('stress-pss4', {})).toBe(false);
    expect(isWellbeingComplete('scale-desconocida', {})).toBe(false);
  });

  it('todas las escalas tienen preguntas operativas (ninguno de los 6 queda vacío)', () => {
    for (const [scaleId, qs] of Object.entries(WELLBEING_QUESTIONS)) {
      expect(qs.length).toBeGreaterThan(0);
      const complete = isWellbeingComplete(scaleId, Object.fromEntries(qs.map((q) => [q.id, 0])));
      expect(complete).toBe(true);
    }
  });
});