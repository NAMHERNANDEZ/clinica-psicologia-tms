import { describe, it, expect } from 'vitest';
import { FreeSecretary } from '../src/lib/ai-secretary';

describe('AI Secretary', () => {
  const secretary = new FreeSecretary();

  describe('Greetings', () => {
    it('should respond to greeting', async () => {
      const response = await secretary.processMessage('Hola');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('Neurociencia Clínica');
      expect(response.confidence).toBeGreaterThan(0.9);
    });

    it('should respond to English greeting', async () => {
      const response = await secretary.processMessage('Hello');
      expect(response.action).toBe('respond');
      expect(response.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('Identity', () => {
    it('should identify itself', async () => {
      const response = await secretary.processMessage('¿Quién eres?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('asistente virtual');
      expect(response.template).toBe('identity');
    });
  });

  describe('Appointment requests', () => {
    it('should clarify appointment request with 6 fields', async () => {
      const response = await secretary.processMessage('Quiero una cita');
      expect(response.action).toBe('clarify');
      expect(response.message).toContain('Nombre');
      expect(response.message).toContain('Edad');
      expect(response.message).toContain('Ciudad');
      expect(response.message).toContain('Motivo');
      expect(response.message).toContain('contacto');
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it('should handle English appointment request', async () => {
      const response = await secretary.processMessage('I want to book an appointment');
      expect(response.action).toBe('clarify');
      expect(response.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Information queries', () => {
    it('should provide hours', async () => {
      const response = await secretary.processMessage('¿Cuáles son sus horarios?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('Lunes');
      expect(response.confidence).toBeGreaterThan(0.9);
    });

    it('should provide full location', async () => {
      const response = await secretary.processMessage('¿Dónde están ubicados?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('5 de Febrero');
      expect(response.message).toContain('Benito Juárez');
      expect(response.message).toContain('Xiutetelco');
      expect(response.confidence).toBeGreaterThan(0.9);
    });

    it('should confirm in-person attention', async () => {
      const response = await secretary.processMessage('¿Atienden presencial?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('presencial');
      expect(response.message).toContain('Xiutetelco');
    });

    it('should provide services', async () => {
      const response = await secretary.processMessage('¿Qué servicios ofrecen?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('Terapia Magnética Transcraneal');
      expect(response.message).toContain('psicológica');
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it('should provide TMS info', async () => {
      const response = await secretary.processMessage('¿Qué es la TMS?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('neuromodulación');
      expect(response.message).toContain('valoración profesional');
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it('should provide pricing', async () => {
      const response = await secretary.processMessage('¿Cuánto cuesta?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('$500');
      expect(response.message).toContain('$1,500');
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it('should provide TMS pricing', async () => {
      const response = await secretary.processMessage('¿Cuánto cuesta la TMS?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('$1,500');
      expect(response.template).toBe('pricing_tms');
    });

    it('should provide psychology pricing', async () => {
      const response = await secretary.processMessage('¿Cuánto cuesta una sesión psicológica?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('$500');
      expect(response.template).toBe('pricing_psicologia');
    });

    it('should compare TMS vs medication', async () => {
      const response = await secretary.processMessage('¿La TMS es mejor que los medicamentos?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('37.5%');
      expect(response.message).toContain('14.6%');
      expect(response.template).toBe('tms_vs_medication');
    });

    it('should list TMS benefits', async () => {
      const response = await secretary.processMessage('¿Qué ventajas tiene la TMS?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('no invasivo');
      expect(response.template).toBe('tms_benefits');
    });

    it('should list TMS side effects', async () => {
      const response = await secretary.processMessage('¿Tiene efectos secundarios?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('dolor de cabeza');
      expect(response.template).toBe('tms_side_effects');
    });

    it('should explain session count depends on evaluation', async () => {
      const response = await secretary.processMessage('¿Cuántas sesiones necesito?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('valoración');
      expect(response.template).toBe('tms_sessions');
    });

    it('should list psychology conditions', async () => {
      const response = await secretary.processMessage('¿Qué problemas atienden?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('Ansiedad');
      expect(response.message).toContain('Depresión');
      expect(response.template).toBe('psychology_conditions');
    });
  });

  describe('Default responses', () => {
    it('should handle unknown messages', async () => {
      const response = await secretary.processMessage('asdfghjkl');
      expect(response.action).toBe('respond');
      expect(response.confidence).toBeLessThan(0.7);
    });
  });
});
