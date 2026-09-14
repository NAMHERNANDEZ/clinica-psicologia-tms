import { describe, it, expect } from 'vitest';
import { handleChat } from '../src/domains/secretary/routes';

// Regresión: /api/chat debe devolver `message` en el NIVEL SUPERIOR del JSON.
// Histórico: el helper json() de index.ts envolvía el payload en
// { success, data: { message } } y el frontend (src/pages/Chat.tsx) leía
// response.message -> undefined -> burbuja vacía del asistente (solo el
// ícono SVG visible). Una respuesta válida no puede desaparecer.
describe('contrato de wire /api/chat', () => {
  it('devuelve message en top level (no anidado en data)', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'HOLA' }),
    });
    const res = await handleChat({} as any, req, {}, 'test-req');
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.message).toBe('string');
    expect(json.message.length).toBeGreaterThan(0);
    expect(json.data).toBeUndefined();
  });

  it('devuelve respuesta real para intención de agendar (clarify)', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'quiero agendar' }),
    });
    const res = await handleChat({} as any, req, {}, 'test-req');
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(typeof json.message).toBe('string');
    expect(json.message.length).toBeGreaterThan(0);
    expect(json.action).toBe('clarify');
  });

  it('rechaza body inválido con 400 y error explícito (sin fallback silencioso)', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await handleChat({} as any, req, {}, 'test-req');
    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBeDefined();
  });

  it('rechaza message vacío con 400', async () => {
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    });
    const res = await handleChat({} as any, req, {}, 'test-req');
    expect(res.status).toBe(400);
    const json: any = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('message is required');
  });
});
