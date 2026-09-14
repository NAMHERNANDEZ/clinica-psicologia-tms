import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sttRouter, toSttClientPayload } from '../src/routes/voice-provider-router';
import { geminiSTTRouter } from '../src/ai/providers/gemini';

// Causa raíz 2026-09-14: el server devolvía {success,data:{transcript}}
// pero VoiceChat exige {success,text} top-level -> toda transcripción
// exitosa se descartaba y la voz quedaba "incompleta".

describe('toSttClientPayload (contrato VoiceChat)', () => {
  it('éxito: success+text+transcript planos', () => {
    const p = toSttClientPayload({ result: 'hola, quiero una cita', provider: 'gemini:x', fallbackUsed: false, latencyMs: 1 });
    expect(p.status).toBe(200);
    expect((p.body as any).success).toBe(true);
    expect((p.body as any).text).toBe('hola, quiero una cita');
    expect((p.body as any).transcript).toBe('hola, quiero una cita');
  });

  it('error proveedor: success:false + error plano (500)', () => {
    const p = toSttClientPayload({ result: null, provider: 'none', fallbackUsed: true, latencyMs: 1, error: 'STT FREE no disponible' });
    expect(p.status).toBe(500);
    expect((p.body as any).success).toBe(false);
    expect(String((p.body as any).error)).toContain('STT FREE');
  });

  it('transcripción vacía: 500, jamás éxito falso', () => {
    const p = toSttClientPayload({ result: '   ', provider: 'gemini:x', fallbackUsed: false, latencyMs: 1 });
    expect(p.status).toBe(500);
    expect((p.body as any).success).toBe(false);
  });
});

describe('sttRouter hermético (sin keys reales)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa gemini-3.6-flash y devuelve el transcript', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: any) => {
      calls.push(String(url));
      return {
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'hola buenos días' }] } }] }),
      };
    });
    const r = await sttRouter({ GEMINI_API_KEY: 'local-dev-key' } as any, new ArrayBuffer(16), 'es', 'audio/wav');
    expect(r.error).toBeUndefined();
    expect(r.result).toBe('hola buenos días');
    expect(r.provider).toContain('gemini-3.6-flash');
    expect(calls.some((u) => u.includes('gemini-3.6-flash'))).toBe(true);
    expect(calls.some((u) => u.includes('2.0-flash') || u.includes('2.5-flash-preview'))).toBe(false);
  });

  it('sin keys: error explícito, sin éxito falso', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('no network in test'); });
    const r = await sttRouter({} as any, new ArrayBuffer(16), 'es', 'audio/wav');
    expect(r.result).toBeNull();
    expect(String(r.error || '')).toContain('STT FREE no disponible');
    const p = toSttClientPayload(r);
    expect(p.status).toBe(500);
  });

  it('geminiSTTRouter no usa modelos retirados', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', async (url: any) => {
      calls.push(String(url));
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) };
    });
    await geminiSTTRouter({ GEMINI_API_KEY: 'local-dev-key' } as any, new ArrayBuffer(8), 'es', 'audio/wav');
    expect(calls.some((u) => u.includes('gemini-3.6-flash'))).toBe(true);
  });
});
