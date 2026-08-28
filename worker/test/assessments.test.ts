import { describe, it, expect } from 'vitest';
import {
  validateAssessmentInput,
  validateScaleAssessmentInput,
  validatePatientId,
  calculateScore,
  interpretScore,
  SCALE_DEFINITIONS,
  SCALE_CUTOFFS,
  isValidScaleId,
  VALID_SCALE_IDS,
} from '../src/domains/assessments/validators';

describe('assessments/validators', () => {
  describe('validatePatientId', () => {
    it('accepts valid number', () => {
      const result = validatePatientId(123);
      expect(result.valid).toBe(true);
      expect(result.data).toBe(123);
    });

    it('accepts valid string number', () => {
      const result = validatePatientId('456');
      expect(result.valid).toBe(true);
      expect(result.data).toBe(456);
    });

    it('rejects null', () => {
      const result = validatePatientId(null as any);
      expect(result.valid).toBe(false);
    });

    it('rejects undefined', () => {
      const result = validatePatientId(undefined as any);
      expect(result.valid).toBe(false);
    });

    it('rejects non-numeric string', () => {
      const result = validatePatientId('abc');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateAssessmentInput', () => {
    it('accepts valid minimal input', () => {
      const result = validateAssessmentInput({
        patient_id: 1,
        assessment_type: 'phq9',
        score: 10,
        max_score: 27,
        administered_at: '2024-01-15T10:00:00Z',
      });
      expect(result.valid).toBe(true);
    });

    it('accepts input with interpretation', () => {
      const result = validateAssessmentInput({
        patient_id: 1,
        assessment_type: 'gad7',
        score: 8,
        max_score: 21,
        interpretation: 'Moderada',
        administered_at: '2024-01-15T10:00:00Z',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects missing patient_id', () => {
      const result = validateAssessmentInput({
        assessment_type: 'phq9',
        score: 10,
        max_score: 27,
        administered_at: '2024-01-15T10:00:00Z',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('patient_id');
    });

    it('rejects negative score', () => {
      const result = validateAssessmentInput({
        patient_id: 1,
        assessment_type: 'phq9',
        score: -5,
        max_score: 27,
        administered_at: '2024-01-15T10:00:00Z',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('score');
    });

    it('rejects score > max_score', () => {
      const result = validateAssessmentInput({
        patient_id: 1,
        assessment_type: 'phq9',
        score: 30,
        max_score: 27,
        administered_at: '2024-01-15T10:00:00Z',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('max_score');
    });

    it('rejects invalid date format', () => {
      const result = validateAssessmentInput({
        patient_id: 1,
        assessment_type: 'phq9',
        score: 10,
        max_score: 27,
        administered_at: 'not-a-date',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('administered_at');
    });
  });

  describe('validateScaleAssessmentInput', () => {
    it('accepts valid scale input', () => {
      const result = validateScaleAssessmentInput({
        patient_id: 1,
        scale_id: 'phq9',
        responses: [
          { item_id: 'phq9_1', value: 1 },
          { item_id: 'phq9_2', value: 2 },
        ],
        administered_at: '2024-01-15T10:00:00Z',
      });
      expect(result.valid).toBe(true);
    });

    it('rejects empty responses', () => {
      const result = validateScaleAssessmentInput({
        patient_id: 1,
        scale_id: 'phq9',
        responses: [],
        administered_at: '2024-01-15T10:00:00Z',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('responses');
    });

    it('rejects invalid response value', () => {
      const result = validateScaleAssessmentInput({
        patient_id: 1,
        scale_id: 'phq9',
        responses: [
          { item_id: 'phq9_1', value: 'not-a-number' as any },
        ],
        administered_at: '2024-01-15T10:00:00Z',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('calculateScore', () => {
    it('calculates PHQ-9 score correctly', () => {
      const responses = [
        { scale_id: 'phq9', item_id: 'phq9_1', value: 1 },
        { scale_id: 'phq9', item_id: 'phq9_2', value: 2 },
        { scale_id: 'phq9', item_id: 'phq9_3', value: 1 },
        { scale_id: 'phq9', item_id: 'phq9_4', value: 0 },
        { scale_id: 'phq9', item_id: 'phq9_5', value: 2 },
      ];
      const result = calculateScore('phq9', responses);
      expect(result.score).toBe(6);
      expect(result.maxScore).toBe(27);
      expect(result.itemCount).toBe(9);
    });

    it('calculates GAD-7 score correctly', () => {
      const responses = [
        { scale_id: 'gad7', item_id: 'gad7_1', value: 2 },
        { scale_id: 'gad7', item_id: 'gad7_2', value: 2 },
        { scale_id: 'gad7', item_id: 'gad7_3', value: 1 },
      ];
      const result = calculateScore('gad7', responses);
      expect(result.score).toBe(5);
      expect(result.maxScore).toBe(21);
    });

    it('returns zeros for unknown scale', () => {
      const result = calculateScore('unknown_scale', []);
      expect(result.score).toBe(0);
      expect(result.maxScore).toBe(100);
    });
  });

  describe('interpretScore', () => {
    it('interprets PHQ-9 minimal (0-4)', () => {
      const result = interpretScore('phq9', 3);
      expect(result).not.toBeNull();
      expect(result!.label).toBe('Mínima');
      expect(result!.severity).toBe('minimal');
    });

    it('interprets PHQ-9 moderate (10-14)', () => {
      const result = interpretScore('phq9', 12);
      expect(result).not.toBeNull();
      expect(result!.label).toBe('Moderada');
      expect(result!.severity).toBe('moderate');
    });

    it('interprets PHQ-9 severe (20-27)', () => {
      const result = interpretScore('phq9', 24);
      expect(result).not.toBeNull();
      expect(result!.label).toBe('Severa');
      expect(result!.severity).toBe('severe');
    });

    it('interprets GAD-7 severe (15-21)', () => {
      const result = interpretScore('gad7', 18);
      expect(result).not.toBeNull();
      expect(result!.label).toBe('Severa');
    });

    it('returns null for unknown scale', () => {
      const result = interpretScore('unknown', 10);
      expect(result).toBeNull();
    });

    it('includes recommendation', () => {
      const result = interpretScore('phq9', 15);
      expect(result).not.toBeNull();
      expect(result!.recommendation).toBeDefined();
      expect(typeof result!.recommendation).toBe('string');
    });
  });

  describe('SCALE_DEFINITIONS', () => {
    it('has all required scales', () => {
      expect(SCALE_DEFINITIONS.phq9).toBeDefined();
      expect(SCALE_DEFINITIONS.gad7).toBeDefined();
      expect(SCALE_DEFINITIONS.bdii).toBeDefined();
      expect(SCALE_DEFINITIONS.pcl5).toBeDefined();
      expect(SCALE_DEFINITIONS.audit).toBeDefined();
      expect(SCALE_DEFINITIONS.dass21).toBeDefined();
    });

    it('PHQ-9 has correct max score', () => {
      expect(SCALE_DEFINITIONS.phq9.max_score).toBe(27);
      expect(SCALE_DEFINITIONS.phq9.item_count).toBe(9);
    });

    it('GAD-7 has correct max score', () => {
      expect(SCALE_DEFINITIONS.gad7.max_score).toBe(21);
      expect(SCALE_DEFINITIONS.gad7.item_count).toBe(7);
    });

    it('BDI-II has correct max score', () => {
      expect(SCALE_DEFINITIONS.bdii.max_score).toBe(63);
      expect(SCALE_DEFINITIONS.bdii.item_count).toBe(21);
    });
  });

  describe('SCALE_CUTOFFS', () => {
    it('has cutoffs for all scales', () => {
      expect(SCALE_CUTOFFS.phq9.length).toBeGreaterThan(0);
      expect(SCALE_CUTOFFS.gad7.length).toBeGreaterThan(0);
      expect(SCALE_CUTOFFS.bdii.length).toBeGreaterThan(0);
      expect(SCALE_CUTOFFS.pcl5.length).toBeGreaterThan(0);
      expect(SCALE_CUTOFFS.audit.length).toBeGreaterThan(0);
      expect(SCALE_CUTOFFS.dass21.length).toBeGreaterThan(0);
    });

    it('cutoffs have required fields', () => {
      const cutoff = SCALE_CUTOFFS.phq9[0];
      expect(cutoff.scale_id).toBe('phq9');
      expect(cutoff.min_score).toBeDefined();
      expect(cutoff.max_score).toBeDefined();
      expect(cutoff.severity).toBeDefined();
      expect(cutoff.label).toBeDefined();
      expect(cutoff.color).toBeDefined();
    });
  });

  describe('isValidScaleId', () => {
    it('returns true for valid scale IDs', () => {
      expect(isValidScaleId('phq9')).toBe(true);
      expect(isValidScaleId('gad7')).toBe(true);
      expect(isValidScaleId('bdii')).toBe(true);
    });

    it('returns false for invalid scale IDs', () => {
      expect(isValidScaleId('invalid')).toBe(false);
      expect(isValidScaleId('')).toBe(false);
    });
  });

  describe('VALID_SCALE_IDS', () => {
    it('contains expected scale IDs', () => {
      expect(VALID_SCALE_IDS).toContain('phq9');
      expect(VALID_SCALE_IDS).toContain('gad7');
      expect(VALID_SCALE_IDS).toContain('bdii');
      expect(VALID_SCALE_IDS).toContain('pcl5');
      expect(VALID_SCALE_IDS).toContain('audit');
      expect(VALID_SCALE_IDS).toContain('dass21');
    });
  });
});
