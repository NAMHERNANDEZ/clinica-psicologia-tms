import { describe, it, expect } from 'vitest';
import { extractLeadFromMessage } from '../src/domains/leads/extractor';
import { validateLeadCreate, validateEstado } from '../src/domains/leads/validators';

describe('Lead extraction', () => {
  it('should extract phone and name from a message', () => {
    const lead = extractLeadFromMessage('Me llamo Juan Perez, mi telefono es 5512345678');
    expect(lead).not.toBeNull();
    expect(lead!.nombre).toBe('Juan Perez');
    expect(lead!.telefono).toBe('5512345678');
  });

  it('should extract service of interest (TMS)', () => {
    const lead = extractLeadFromMessage('Quiero saber sobre TMS y sus sesiones');
    expect(lead).not.toBeNull();
    expect(lead!.servicio_interesado).toBe('TMS');
  });

  it('should extract service of interest (Psicologia)', () => {
    const lead = extractLeadFromMessage('Estoy buscando psicoterapia por ansiedad');
    expect(lead).not.toBeNull();
    expect(lead!.servicio_interesado).toBe('Psicología');
    expect(lead!.motivo).toBe('ansiedad');
  });

  it('should return null for empty or plain messages', () => {
    expect(extractLeadFromMessage('')).toBeNull();
    expect(extractLeadFromMessage('Hola, como estas?')).toBeNull();
    expect(extractLeadFromMessage(undefined as any)).toBeNull();
  });
});

describe('Lead validators', () => {
  it('should reject empty lead create', () => {
    const res = validateLeadCreate({});
    expect(res.valid).toBe(false);
    expect(res.error).toContain('required');
  });

  it('should accept lead with at least one contact field', () => {
    const res = validateLeadCreate({ telefono: '5512345678', origen: 'chat' });
    expect(res.valid).toBe(true);
    expect(res.data!.origen).toBe('chat');
  });

  it('should default origen to chat', () => {
    const res = validateLeadCreate({ nombre: 'Ana' });
    expect(res.valid).toBe(true);
    expect(res.data!.origen).toBe('chat');
  });

  it('should validate estado', () => {
    expect(validateEstado('NUEVO').valid).toBe(true);
    expect(validateEstado('CONTACTADO').valid).toBe(true);
    expect(validateEstado('INVALIDO').valid).toBe(false);
    expect(validateEstado(123).valid).toBe(false);
  });
});
