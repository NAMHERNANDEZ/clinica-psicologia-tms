import { describe, it, expect } from 'vitest';
import { validateFollowup, validateCompleteFollowup, VALID_TYPES, VALID_STATUSES, VALID_PRIORITIES } from '../src/domains/followups/validators';

describe('Followup types', () => {
  it('has 5 followup types', () => {
    expect(VALID_TYPES).toHaveLength(5);
    expect(VALID_TYPES).toContain('CONTROL');
    expect(VALID_TYPES).toContain('TELEMEDICINA');
  });

  it('has 5 statuses', () => {
    expect(VALID_STATUSES).toHaveLength(5);
    expect(VALID_STATUSES).toContain('PENDIENTE');
    expect(VALID_STATUSES).toContain('NO_ASISTIO');
  });

  it('has 4 priorities', () => {
    expect(VALID_PRIORITIES).toHaveLength(4);
    expect(VALID_PRIORITIES).toContain('URGENTE');
    expect(VALID_PRIORITIES).toContain('BAJA');
  });
});

describe('validateFollowup', () => {
  const validData = {
    patient_id: 1,
    type: 'CONTROL',
    scheduled_at: '2026-08-10T10:00:00Z',
  };

  it('accepts valid followup', () => {
    const res = validateFollowup(validData);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.data.patient_id).toBe(1);
      expect(res.data.type).toBe('CONTROL');
      expect(res.data.priority).toBe('NORMAL');
    }
  });

  it('rejects missing patient_id', () => {
    const res = validateFollowup({ type: 'CONTROL', scheduled_at: '2026-08-10T10:00:00Z' });
    expect(res.valid).toBe(false);
  });

  it('rejects invalid type', () => {
    const res = validateFollowup({ ...validData, type: 'INVALID' });
    expect(res.valid).toBe(false);
  });

  it('rejects missing scheduled_at', () => {
    const res = validateFollowup({ patient_id: 1, type: 'CONTROL' });
    expect(res.valid).toBe(false);
  });

  it('rejects invalid priority', () => {
    const res = validateFollowup({ ...validData, priority: 'SUPER' });
    expect(res.valid).toBe(false);
  });

  it('accepts all valid types', () => {
    VALID_TYPES.forEach((type) => {
      const res = validateFollowup({ ...validData, type });
      expect(res.valid).toBe(true);
    });
  });
});

describe('validateCompleteFollowup', () => {
  it('accepts valid complete data', () => {
    const res = validateCompleteFollowup({ outcome: 'Mejoria significativa', outcome_notes: 'Paciente refiere mejoria' });
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.data.outcome).toBe('Mejoria significativa');
    }
  });

  it('rejects missing outcome', () => {
    const res = validateCompleteFollowup({});
    expect(res.valid).toBe(false);
  });
});
