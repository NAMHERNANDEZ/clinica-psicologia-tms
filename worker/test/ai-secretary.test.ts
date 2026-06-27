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

  describe('Appointment requests', () => {
    it('should clarify appointment request', async () => {
      const response = await secretary.processMessage('Quiero agendar una cita');
      expect(response.action).toBe('clarify');
      expect(response.message).toContain('Nombre completo');
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

    it('should provide location', async () => {
      const response = await secretary.processMessage('¿Dónde están ubicados?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('Xiutetelco');
      expect(response.confidence).toBeGreaterThan(0.9);
    });

    it('should provide services', async () => {
      const response = await secretary.processMessage('¿Qué servicios ofrecen?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('Psicoterapia');
      expect(response.message).toContain('EMT/TMS');
      expect(response.confidence).toBeGreaterThan(0.8);
    });

    it('should provide TMS info', async () => {
      const response = await secretary.processMessage('¿Qué es la EMT?');
      expect(response.action).toBe('respond');
      expect(response.message).toContain('Estimulación Magnética');
      expect(response.confidence).toBeGreaterThan(0.8);
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
