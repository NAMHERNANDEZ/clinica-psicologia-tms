// ============================================
// TESTS — worker/test/wellbeing-assessments.test.ts
// MH-EXPANSION 1.0: wellbeing assessments (user-scoped, self-reported)
// Aislamiento CLINICAL vs WELLBEING + user-scoping + regresión clínica.
// ============================================

import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  interpretScore,
  getScaleDomain,
  getClinicalScaleIds,
  getWellbeingScaleIds,
  VALID_SCALE_IDS,
  isValidScaleId,
  SCALE_DEFINITIONS,
  SCALE_CUTOFFS,
  WELLBEING_SCALE_DEFINITIONS,
  WELLBEING_CUTOFFS,
} from '../src/domains/assessments/validators';
import * as repo from '../src/domains/assessments/repository';

// ============================================
// HELPERS
// ============================================

function makeDb(overrides?: Record<string, unknown>) {
  const calls: Array<{ sql: string; args: unknown[] }> = [];
  const stored = new Map<string, unknown[]>();
  const seq = { value: 100 };

  const db: any = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        run: async () => {
          calls.push({ sql, args });
          if (/(INSERT INTO wellbeing_assessments)/.test(sql)) {
            const id = ++seq.value;
            stored.set(`wa:${id}`, { id, user_id: args[0], scale_id: args[1], score: args[4], max_score: args[5], interpretation: args[6], band: args[7], provenance: args[8], disclaimer: args[9], administered_at: args[10] });
            return { meta: { last_row_id: id, changes: 1 } };
          }
          if (/(INSERT INTO wellbeing_responses)/.test(sql)) {
            const rid = ++seq.value;
            stored.set(`wr:${rid}`, { id: rid, assessment_id: args[0], item_id: args[2], answer_value: args[3], isResponse: true });
            return { meta: { last_row_id: rid, changes: 1 } };
          }
          return { meta: { changes: 1 } };
        },
        all: async () => {
          calls.push({ sql, args });
          const s = String(sql);
          // distingue getById (tiene WHERE id = ? AND user_id = ?)
          if (/WHERE id = \? AND user_id = \?/.test(s)) {
            const id = args[0];
            const userId = args[1];
            const row = Array.from(stored.values()).find((r: any) => r.id === id && r.user_id === userId);
            return { results: row ? [{ ...row, version: '1.0', domain: 'wellbeing', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }] : [] };
          }
          // lista por usuario (WHERE user_id = ?)
          if (/FROM wellbeing_assessments/.test(s) && /WHERE user_id = \?/.test(s)) {
            const userId = args[0];
            const rows = Array.from(stored.values())
              .filter((r: any) => r.user_id === userId && !r.isResponse)
              .map((r: any) => ({ ...r, version: '1.0', domain: 'wellbeing', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' }));
            return { results: rows };
          }
          if (/FROM wellbeing_responses/.test(s) && /WHERE assessment_id = \?/.test(s)) {
            const assessmentId = args[0];
            const rows = Array.from(stored.values()).filter((r: any) => r.assessment_id === assessmentId);
            return { results: rows };
          }
          return { results: [] };
        },
        first: async () => null,
      }),
    }),
  };

  if (overrides) {
    Object.assign(db, overrides);
  }

  return { db, calls, stored };
}

// ============================================
// SCORING (motor compartido, no duplicado)
// ============================================

describe('wellbeing scoring (motor compartido)', () => {
  it('calcula score para stress-pss4 (4 ítems 0-4)', () => {
    const res = calculateScore('stress-pss4', [
      { scale_id: 'stress-pss4', item_id: 's1', value: 3 },
      { scale_id: 'stress-pss4', item_id: 's2', value: 2 },
      { scale_id: 'stress-pss4', item_id: 's3', value: 1 },
      { scale_id: 'stress-pss4', item_id: 's4', value: 2 },
    ]);
    expect(res.score).toBe(8);
    expect(res.maxScore).toBe(16);
    expect(res.itemCount).toBe(4);
  });

  it('interpreta bandas de bienestar (no severidad clínica)', () => {
    const low = interpretScore('stress-pss4', 3);
    expect(low?.severity).toBe('low');
    const high = interpretScore('stress-pss4', 12);
    expect(high?.severity).toBe('high');
    expect(high?.label).toBe('Alto');
  });

  it('calcula sleep-sq5 con max 15', () => {
    const res = calculateScore('sleep-sq5', [
      { scale_id: 'sleep-sq5', item_id: 'q1', value: 2 },
      { scale_id: 'sleep-sq5', item_id: 'q2', value: 3 },
      { scale_id: 'sleep-sq5', item_id: 'q3', value: 1 },
      { scale_id: 'sleep-sq5', item_id: 'q4', value: 2 },
      { scale_id: 'sleep-sq5', item_id: 'q5', value: 2 },
    ]);
    expect(res.score).toBe(10);
    expect(res.maxScore).toBe(15);
  });

  it('who5 alto significa bienestar alto (score alto = mejor)', () => {
    expect(interpretScore('wellbeing-who5', 23)?.severity).toBe('high');
    expect(interpretScore('wellbeing-who5', 6)?.severity).toBe('low');
  });

  it('activation-gad2 alto => banda alta', () => {
    expect(interpretScore('activation-gad2', 0)?.severity).toBe('low');
    expect(interpretScore('activation-gad2', 5)?.severity).toBe('high');
  });
});

// ============================================
// CROSS-DOMAIN ISOLATION
// ============================================

describe('aislamiento CLINICAL vs WELLBEING', () => {
  it('getScaleDomain distingue clinical de wellbeing', () => {
    expect(getScaleDomain('phq9')).toBe('clinical');
    expect(getScaleDomain('gad7')).toBe('clinical');
    expect(getScaleDomain('stress-pss4')).toBe('wellbeing');
    expect(getScaleDomain('sleep-sq5')).toBe('wellbeing');
    expect(getScaleDomain('no-existe')).toBe('unknown');
  });

  it('las 6 escalas clínicas originales siguen presentes e intactas', () => {
    expect(getClinicalScaleIds().sort()).toEqual(['audit', 'bdii', 'dass21', 'gad7', 'pcl5', 'phq9']);
    expect(Object.keys(SCALE_CUTOFFS)).toContain('phq9');
    expect(SCALE_DEFINITIONS['pcl5'].max_score).toBe(80);
  });

  it('includes las 6 escalas wellbeing nuevas', () => {
    expect(getWellbeingScaleIds().sort()).toEqual([
      'activation-gad2', 'energy-vas3', 'focus-cfq3', 'sleep-sq5', 'stress-pss4', 'wellbeing-who5',
    ]);
  });

  it('VALID_SCALE_IDS combina ambas sin perder ninguna', () => {
    expect(isValidScaleId('phq9')).toBe(true);
    expect(isValidScaleId('stress-pss4')).toBe(true);
    expect(isValidScaleId('bogus')).toBe(false);
    expect(VALID_SCALE_IDS).toContain('gad7');
    expect(VALID_SCALE_IDS).toContain('wellbeing-who5');
  });

  it('las bandas wellbeing no aparecen en cutoffs clínicos', () => {
    expect(SCALE_CUTOFFS['stress-pss4']).toBeUndefined();
    expect(WELLBEING_CUTOFFS['phq9']).toBeUndefined();
  });
});

// ============================================
// REPOSITORY — creación y persistencia user-scoped
// ============================================

describe('wellbeing repository (user-scoped)', () => {
  it('crea assessment wellbeing y persiste respuestas', async () => {
    const { db, calls } = makeDb();
    const env = { DB: db } as any;

    const result = await repo.createWellbeingAssessmentWithScoring(env, {
      user_id: 42,
      scale_id: 'stress-pss4',
      version: '1.0',
      responses: [
        { scale_id: 'stress-pss4', item_id: 's1', value: 3 },
        { scale_id: 'stress-pss4', item_id: 's2', value: 2 },
        { scale_id: 'stress-pss4', item_id: 's3', value: 1 },
        { scale_id: 'stress-pss4', item_id: 's4', value: 2 },
      ],
      administered_at: '2026-09-12T10:00:00Z',
    });

    expect(result.score).toBe(8);
    expect(result.band).toBe('moderate');
    expect(result.id).toBe(101);
    expect(result.cutoff?.label).toBe('Moderado');

    // Verificar que el INSERT principal lleva user_id y escala
    const insertWa = calls.find(c => String(c.sql).includes('INSERT INTO wellbeing_assessments'));
    expect(insertWa).toBeDefined();
    expect(insertWa!.args[0]).toBe(42); // user_id
    expect(insertWa!.args[1]).toBe('stress-pss4'); // scale_id

    // Verificar persistencias de respuestas individuales
    const insertWr = calls.filter(c => String(c.sql).includes('INSERT INTO wellbeing_responses'));
    expect(insertWr.length).toBe(4);
  });

  it('rechaza una escala clínica en un assessment wellbeing', async () => {
    const { db } = makeDb();
    const env = { DB: db } as any;
    await expect(
      repo.createWellbeingAssessmentWithScoring(env, {
        user_id: 1,
        scale_id: 'phq9',
        version: '1.0',
        responses: [{ scale_id: 'phq9', item_id: 'p1', value: 1 }],
        administered_at: '2026-09-12T10:00:00Z',
      })
    ).rejects.toThrow(/not a wellbeing scale/);
  });

  it('solo devuelve assessments del usuario solicitado (scoping en query)', async () => {
    const { db, calls } = makeDb();
    const env = { DB: db } as any;

    const a = await repo.createWellbeingAssessmentWithScoring(env, {
      user_id: 1, scale_id: 'stress-pss4', version: '1.0',
      responses: [{ scale_id: 'stress-pss4', item_id: 's1', value: 4 }],
      administered_at: '2026-09-12T10:00:00Z',
    });
    await repo.createWellbeingAssessmentWithScoring(env, {
      user_id: 2, scale_id: 'sleep-sq5', version: '1.0',
      responses: [{ scale_id: 'sleep-sq5', item_id: 'q1', value: 1 }],
      administered_at: '2026-09-12T10:00:00Z',
    });

    // Usuario 1 solo ve su assessment
    const listUser1 = await repo.getWellbeingAssessmentsByUser(env, 1);
    expect(listUser1.length).toBe(1);
    expect(listUser1[0].user_id).toBe(1);

    // Usuario 2 solo ve el suyo
    const listUser2 = await repo.getWellbeingAssessmentsByUser(env, 2);
    expect(listUser2.length).toBe(1);
    expect(listUser2[0].scale_id).toBe('sleep-sq5');

    // El SQL que se ejecutó filtra por user_id = ?
    const selectSql = callsToSql({ calls });
    expect(selectSql.some(s => s.includes('WHERE user_id = ?'))).toBe(true);
  });

  it('getWellbeingAssessmentById es user-scoped: A no lee B', async () => {
    const { db, stored } = makeDb();
    const env = { DB: db } as any;

    const a = await repo.createWellbeingAssessmentWithScoring(env, {
      user_id: 1, scale_id: 'wellbeing-who5', version: '1.0',
      responses: [{ scale_id: 'wellbeing-who5', item_id: 'w1', value: 3 }],
      administered_at: '2026-09-12T10:00:00Z',
    });

    // Usuario 1 la lee
    const own = await repo.getWellbeingAssessmentById(env, a.id, 1);
    expect(own).not.toBeNull();
    expect(own!.user_id).toBe(1);

    // Usuario 2 intenta leer y NO la obtiene (null)
    const other = await repo.getWellbeingAssessmentById(env, a.id, 2);
    expect(other).toBeNull();
  });

  it('getWellbeingResponses verifica ownership antes de devolver', async () => {
    const { db, stored } = makeDb();
    const env = { DB: db } as any;

    const a = await repo.createWellbeingAssessmentWithScoring(env, {
      user_id: 1, scale_id: 'stress-pss4', version: '1.0',
      responses: [{ scale_id: 'stress-pss4', item_id: 's1', value: 2 }],
      administered_at: '2026-09-12T10:00:00Z',
    });

    // Propietario obtiene respuestas
    const own = await repo.getWellbeingResponses(env, a.id, 1);
    expect(own).toHaveLength(1);

    // No-propietario obtiene [] (ownership verificado antes del SELECT)
    const other = await repo.getWellbeingResponses(env, a.id, 2);
    expect(other).toHaveLength(0);
  });

  it('usa provenance default user_self_report', async () => {
    const { db, calls } = makeDb();
    const env = { DB: db } as any;
    await repo.createWellbeingAssessmentWithScoring(env, {
      user_id: 1, scale_id: 'energy-vas3', version: '1.0',
      responses: [{ scale_id: 'energy-vas3', item_id: 'e1', value: 5 }],
      administered_at: '2026-09-12T10:00:00Z',
    });
    const insertWa = calls.find(c => String(c.sql).includes('INSERT INTO wellbeing_assessments'));
    expect(insertWa!.args).toContain('user_self_report');
  });
});

function callsToSql(mock: { calls: Array<{ sql: string; args: unknown[] }> }): string[] {
  return mock.calls.map(c => c.sql);
}

// ============================================
// REGRESIÓN CLÍNICA (el dominio clínico sigue intacto)
// ============================================

describe('regresión clínica', () => {
  it('phq9 scoring y cutoff clínico intactos', () => {
    const res = calculateScore('phq9', Array.from({ length: 9 }, (_, i) => ({
      scale_id: 'phq9', item_id: `p${i + 1}`, value: 2,
    })));
    expect(res.score).toBe(18);
    expect(res.maxScore).toBe(27);
    const cutoff = interpretScore('phq9', 18);
    expect(cutoff?.severity).toBe('moderately_severe');
    expect(cutoff?.label).toBe('Moderadamente severa');
  });

  it('gad7 scoring intacto', () => {
    const res = calculateScore('gad7', Array.from({ length: 7 }, () => ({
      scale_id: 'gad7', item_id: 'g', value: 1,
    })));
    expect(res.score).toBe(7);
    expect(res.maxScore).toBe(21);
  });

  it('las funciones clínicas de repository siguen disponibles', () => {
    expect(repo.getAvailableScales()).toHaveLength(6);
    expect(repo.getCutoffsForScale('phq9').length).toBeGreaterThan(0);
  });
});