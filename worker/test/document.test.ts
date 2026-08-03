import { describe, it, expect } from 'vitest';

type DocumentType = 'CONSENTIMIENTO_INFORMADO' | 'AVISO_PRIVACIDAD' | 'EXPEDIENTE'
  | 'NOTA_CLINICA' | 'EVALUACION' | 'PLAN_TRATAMIENTO' | 'FORMATO_ADMISION'
  | 'RECETA' | 'REFERENCIA' | 'CONTRATO';

type DocumentStatus = 'DRAFT' | 'GENERATED' | 'SIGNED' | 'SUPERSEDED' | 'ARCHIVED';

const DOCUMENT_TYPES: DocumentType[] = [
  'CONSENTIMIENTO_INFORMADO', 'AVISO_PRIVACIDAD', 'EXPEDIENTE',
  'NOTA_CLINICA', 'EVALUACION', 'PLAN_TRATAMIENTO', 'FORMATO_ADMISION',
  'RECETA', 'REFERENCIA', 'CONTRATO',
];

const DOCUMENT_STATUSES: DocumentStatus[] = ['DRAFT', 'GENERATED', 'SIGNED', 'SUPERSEDED', 'ARCHIVED'];

function isValidTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  const transitions: Record<DocumentStatus, DocumentStatus[]> = {
    DRAFT: ['GENERATED', 'ARCHIVED'],
    GENERATED: ['SIGNED', 'ARCHIVED'],
    SIGNED: ['SUPERSEDED', 'ARCHIVED'],
    SUPERSEDED: [],
    ARCHIVED: [],
  };
  return transitions[from].includes(to);
}

describe('Document types', () => {
  it('has 10 document types', () => {
    expect(DOCUMENT_TYPES).toHaveLength(10);
  });

  it('includes consentimiento informado', () => {
    expect(DOCUMENT_TYPES).toContain('CONSENTIMIENTO_INFORMADO');
  });

  it('includes contrato', () => {
    expect(DOCUMENT_TYPES).toContain('CONTRATO');
  });
});

describe('Document status', () => {
  it('has 5 statuses', () => {
    expect(DOCUMENT_STATUSES).toHaveLength(5);
  });
});

describe('Status transitions', () => {
  it('DRAFT -> GENERATED is valid', () => {
    expect(isValidTransition('DRAFT', 'GENERATED')).toBe(true);
  });

  it('DRAFT -> SIGNED is invalid', () => {
    expect(isValidTransition('DRAFT', 'SIGNED')).toBe(false);
  });

  it('GENERATED -> SIGNED is valid', () => {
    expect(isValidTransition('GENERATED', 'SIGNED')).toBe(true);
  });

  it('SIGNED -> SUPERSEDED is valid', () => {
    expect(isValidTransition('SIGNED', 'SUPERSEDED')).toBe(true);
  });

  it('SIGNED -> DRAFT is invalid (no reverse)', () => {
    expect(isValidTransition('SIGNED', 'DRAFT')).toBe(false);
  });

  it('ARCHIVED -> any is invalid', () => {
    expect(isValidTransition('ARCHIVED', 'DRAFT')).toBe(false);
    expect(isValidTransition('ARCHIVED', 'SIGNED')).toBe(false);
  });

  it('SUPERSEDED -> any is invalid', () => {
    expect(isValidTransition('SUPERSEDED', 'SIGNED')).toBe(false);
    expect(isValidTransition('SUPERSEDED', 'ARCHIVED')).toBe(false);
  });
});
