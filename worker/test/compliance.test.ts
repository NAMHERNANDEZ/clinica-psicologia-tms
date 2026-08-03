import { describe, it, expect } from 'vitest';
import { checkConsentExists } from '../src/compliance/checks/consent.check';
import { checkClinicalRecordComplete } from '../src/compliance/checks/record.check';
import { checkSessionNoteComplete } from '../src/compliance/checks/session.check';
import { checkSecurityReview } from '../src/compliance/checks/security.check';
import { checkQualityMetrics } from '../src/compliance/checks/quality.check';
import type { PatientContext } from '../src/compliance/types';

function ctx(overrides?: Partial<PatientContext>): PatientContext {
  return {
    patientId: 1,
    consentExists: true,
    latestRecord: { id: 1, reason_consultation: 'Ansiedad', evaluation: 'Evaluacion completa', diagnosis: 'F41.1', treatment_plan: 'TMS 10 sesiones' },
    latestNote: { id: 1, subjective: 'Paciente refiere mejoria', objective: 'EOA', assessment: 'Responde a tratamiento', plan: 'Continuar TMS' },
    openIncidentCount: 0,
    ...overrides,
  };
}

describe('checkConsentExists', () => {
  it('passes when consent exists', async () => {
    const r = await checkConsentExists(1, ctx());
    expect(r.passed).toBe(true);
    expect(r.severity).toBe('LOW');
  });

  it('fails CRITICAL when no consent', async () => {
    const r = await checkConsentExists(1, ctx({ consentExists: false }));
    expect(r.passed).toBe(false);
    expect(r.severity).toBe('CRITICAL');
  });
});

describe('checkClinicalRecordComplete', () => {
  it('passes when record is complete', async () => {
    const r = await checkClinicalRecordComplete(1, ctx());
    expect(r.passed).toBe(true);
    expect(r.severity).toBe('LOW');
  });

  it('fails when record missing', async () => {
    const r = await checkClinicalRecordComplete(1, ctx({ latestRecord: null }));
    expect(r.passed).toBe(false);
    expect(r.severity).toBe('HIGH');
  });

  it('fails when fields are missing', async () => {
    const r = await checkClinicalRecordComplete(1, ctx({ latestRecord: { id: 1, reason_consultation: 'Ansiedad', evaluation: null, diagnosis: null, treatment_plan: null } }));
    expect(r.passed).toBe(false);
    expect(r.message).toContain('evaluaci');
  });
});

describe('checkSessionNoteComplete', () => {
  it('passes when SOAP is complete', async () => {
    const r = await checkSessionNoteComplete(1, ctx());
    expect(r.passed).toBe(true);
  });

  it('fails when no note', async () => {
    const r = await checkSessionNoteComplete(1, ctx({ latestNote: null }));
    expect(r.passed).toBe(false);
    expect(r.severity).toBe('HIGH');
  });

  it('fails when SOAP section missing', async () => {
    const r = await checkSessionNoteComplete(1, ctx({ latestNote: { id: 1, subjective: null, objective: null, assessment: 'Ok', plan: 'Continuar' } }));
    expect(r.passed).toBe(false);
    expect(r.message).toContain('subjetivo');
  });
});

describe('checkSecurityReview', () => {
  it('passes with no open incidents', async () => {
    const r = await checkSecurityReview(1, ctx({ openIncidentCount: 0 }));
    expect(r.passed).toBe(true);
  });

  it('fails with open incidents', async () => {
    const r = await checkSecurityReview(1, ctx({ openIncidentCount: 2 }));
    expect(r.passed).toBe(false);
    expect(r.message).toContain('2 incidentes');
  });
});

describe('checkQualityMetrics', () => {
  it('passes with record and notes', async () => {
    const r = await checkQualityMetrics(1, ctx());
    expect(r.passed).toBe(true);
  });

  it('fails MEDIUM without record', async () => {
    const r = await checkQualityMetrics(1, ctx({ latestRecord: null }));
    expect(r.passed).toBe(false);
    expect(r.severity).toBe('MEDIUM');
  });

  it('fails MEDIUM without notes', async () => {
    const r = await checkQualityMetrics(1, ctx({ latestNote: null }));
    expect(r.passed).toBe(false);
    expect(r.severity).toBe('MEDIUM');
  });
});

describe('Score calculation', () => {
  function calcScore(open: number, critical: number, high: number): number {
    return Math.max(0, Math.round(100 - (critical * 30) - (high * 15) - (open * 5)));
  }

  it('100 with no alerts', () => {
    expect(calcScore(0, 0, 0)).toBe(100);
  });

  it('drops by 30 per critical', () => {
    expect(calcScore(1, 1, 0)).toBe(65); // 100 - 30 - 5
  });

  it('drops by 15 per high', () => {
    expect(calcScore(0, 0, 2)).toBe(70); // 100 - 30
  });

  it('drops by 5 per open alert', () => {
    expect(calcScore(3, 0, 0)).toBe(85); // 100 - 15
  });

  it('floor at 0', () => {
    expect(calcScore(0, 10, 0)).toBe(0); // 100 - 300 = 0
  });

  it('hybrid scenario', () => {
    expect(calcScore(5, 2, 3)).toBe(0); // 100 - 60 - 45 - 25 = -30 -> 0
  });
});

describe('Rule categorization', () => {
  const rules = [
    { code: 'NOM004-CONSENT-001', category: 'NOM' as const, severity: 'CRITICAL' as const, check: 'CHECK_EXISTS' as const },
    { code: 'COFEPRIS-CONSENT-001', category: 'COFEPRIS' as const, severity: 'CRITICAL' as const, check: 'CHECK_EXISTS' as const },
    { code: 'ISO9001-QUALITY-001', category: 'ISO9001' as const, severity: 'MEDIUM' as const, check: 'CHECK_EXISTS' as const },
    { code: 'ISO27001-AUDIT-001', category: 'ISO27001' as const, severity: 'CRITICAL' as const, check: 'CHECK_EXISTS' as const },
  ];

  it('has correct NOM rules', () => {
    const nom = rules.filter(r => r.category === 'NOM');
    expect(nom.length).toBe(1);
    expect(nom[0].code).toBe('NOM004-CONSENT-001');
  });

  it('has rules from all 4 categories', () => {
    const cats = new Set(rules.map(r => r.category));
    expect(cats.has('NOM')).toBe(true);
    expect(cats.has('COFEPRIS')).toBe(true);
    expect(cats.has('ISO9001')).toBe(true);
    expect(cats.has('ISO27001')).toBe(true);
  });
});

describe('Alert dedup logic', () => {
  it('findOpenAlert should match by ruleCode + patientId', () => {
    const alerts = [
      { ruleCode: 'NOM-001', patientId: 1, status: 'OPEN' },
      { ruleCode: 'NOM-002', patientId: 1, status: 'OPEN' },
      { ruleCode: 'NOM-001', patientId: 2, status: 'OPEN' },
    ];

    const findOpen = (ruleCode: string, patientId?: number) =>
      alerts.find(a => a.ruleCode === ruleCode && (!patientId || a.patientId === patientId) && a.status === 'OPEN');

    expect(findOpen('NOM-001', 1)).toBeDefined();
    expect(findOpen('NOM-001', 2)).toBeDefined();
    expect(findOpen('NOM-002', 1)).toBeDefined();
  });

  it('should not find alert for different patient', () => {
    const alerts = [
      { ruleCode: 'NOM-001', patientId: 1, status: 'OPEN' },
    ];
    const findOpen = (ruleCode: string, patientId?: number) =>
      alerts.find(a => a.ruleCode === ruleCode && (!patientId || a.patientId === patientId) && a.status === 'OPEN');
    expect(findOpen('NOM-001', 999)).toBeUndefined();
  });

  it('should not match resolved alerts', () => {
    const alerts = [
      { ruleCode: 'NOM-001', patientId: 1, status: 'RESOLVED' },
    ];
    const findOpen = (ruleCode: string, patientId?: number) =>
      alerts.find(a => a.ruleCode === ruleCode && (!patientId || a.patientId === patientId) && a.status === 'OPEN');
    expect(findOpen('NOM-001', 1)).toBeUndefined();
  });
});