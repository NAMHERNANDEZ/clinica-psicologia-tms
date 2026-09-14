import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isEmergency, assessSafety } from '../src/ai/services/safety-router';
import { crisisGate } from '../src/ai/services/crisis-handler';
import { looksLikeCrisis, handleBookingTurn } from '../src/domains/voice/booking';
import { handleVoiceChat } from '../src/domains/voice/routes';
import { handleChat } from '../src/domains/secretary/routes';
import { FreeSecretary } from '../src/lib/ai-secretary';

// MATRIZ E2E NIVEL RUTA (2026-09-14, incidente crítico):
// "kme quiero matar" devolvió horarios. Regla absoluta:
// CRISIS > AUTH > SERVICE > PRICING > BOOKING > AVAILABILITY > LLM.
// El gate es server-side y determinista (sin LLM, sin Calendar, sin slots).

const EMERGENCY_CASES = [
  'kme quiero matar',
  'me quiero matar',
  'ME QUIERO MATAR',
  'Me Quiero Matar!!!',
  'me quiero morír',
  'me quiero suicidar',
  'quiero suicidarme',
  'ya no quiero vivir',
  'quiero morir',
  'no quiero seguir viviendo',
  'mequieromatar',
  'quiero matarme',
  'me voy a suicidar',
  'quitarme la vida',
  'acabar con todo',
  'hacerme daño',
];

const NOT_EMERGENCY = [
  'hola',
  'quiero agendar TMS',
  'COSTO TMS',
  '¿atienden emergencias?',
  'hay servicio de urgencias?',
  'me muero de risa',
  'miedo a morir',
  'no quiero seguir con el tratamiento',
  '¿qué es la TMS?',
  'el lunes',
];

function voiceRequest(message: string, sessionId: string, voice = false): Request {
  return new Request('https://x/api/voice/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, voice }),
  });
}

function chatRequest(message: string): Request {
  return new Request('https://x/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
}

interface Ctx {
  env: any;
  state: Record<string, any>;
  gcalCalls: string[];
}

function makeCtx(): Ctx {
  const ctx: Ctx = { env: null as any, state: {}, gcalCalls: [] };
  ctx.env = {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => {
            if (sql.startsWith('SELECT step, appt_type')) return ctx.state[args[0]] ?? null;
            if (sql.includes('FROM calendar_auth')) {
              return { access_token: 'tok-test', refresh_token: 'refresh-test', expires_at: new Date(Date.now() + 3600 * 1000).toISOString() };
            }
            if (sql.includes('COUNT(*)')) return { c: 0 };
            if (sql.includes('SUM(request_count)')) return { c: 0 };
            return null;
          },
          run: async () => {
            if (sql.startsWith('INSERT INTO booking_sessions')) {
              const [sid, step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id, request_id] = args;
              ctx.state[sid] = { step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id, request_id };
            }
            return {};
          },
          all: async () => ({ results: [] }),
        }),
      }),
    },
  };
  vi.stubGlobal('fetch', async (url: any, init: any = {}) => {
    const u = String(url);
    if (u.includes('googleapis')) ctx.gcalCalls.push(u);
    if (u.includes('openrouter') || u.includes('generativelanguage')) throw new Error('no keys in test');
    return { status: 200, ok: true, json: async () => ({ items: [] }) };
  });
  return ctx;
}

describe('crisis: detector tolerante', () => {
  for (const msg of EMERGENCY_CASES) {
    it(`EMERGENCIA: "${msg}"`, () => {
      expect(isEmergency(msg)).toBe(true);
      expect(assessSafety(msg).level).toBe('EMERGENCIA');
      expect(looksLikeCrisis(msg)).toBe(true);
      const g = crisisGate(msg);
      expect(g.crisis).toBe(true);
      if (g.crisis) {
        expect(g.message.length).toBeGreaterThan(20);
        expect(g.message).not.toContain('<svg');
        expect(g.message).not.toMatch(/horarios disponibles/i);
      }
    });
  }
  for (const msg of NOT_EMERGENCY) {
    it(`NO emergencia: "${msg}"`, () => {
      expect(isEmergency(msg)).toBe(false);
    });
  }
});

describe('crisis: /api/voice/chat nunca toca booking ni Calendar', () => {
  let ctx: Ctx;
  beforeEach(() => {
    vi.unstubAllGlobals();
    ctx = makeCtx();
  });

  for (const msg of ['kme quiero matar', 'me quiero matar', 'quiero suicidarme']) {
    it(`voice crisis 200 determinista: "${msg}"`, async () => {
      const res = await handleVoiceChat(ctx.env, voiceRequest(msg, `vc-${msg.length}`), {}, null);
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.crisis).toBe(true);
      expect(body.provider).toBe('safety-deterministic');
      expect(typeof body.message).toBe('string');
      expect(body.message.length).toBeGreaterThan(20);
      expect(body.message).not.toMatch(/horarios disponibles/i);
      expect(body.message).not.toContain('<svg');
      expect(ctx.gcalCalls).toHaveLength(0);
    });
  }

  it('crisis con booking state activo NO usa slots ni muta estado', async () => {
    const sid = 'vc-stale-crisis';
    ctx.state[sid] = { step: 'need_slot', appt_type: 'TMS', modality: 'presencial', date: '2026-09-19', offered_slots: JSON.stringify([{ date: '2026-09-19', time: '10:00' }]) };
    const res = await handleVoiceChat(ctx.env, voiceRequest('kme quiero matar', sid), {}, null);
    const body = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(body.crisis).toBe(true);
    expect(body.message).not.toMatch(/horarios disponibles/i);
    expect(ctx.gcalCalls).toHaveLength(0);
    // Estado intacto: la crisis no contamina la sesión.
    expect(ctx.state[sid].step).toBe('need_slot');
    expect(ctx.state[sid].date).toBe('2026-09-19');
  });

  it('crisis con voice=true y sin TTS sigue 200 solo-texto (jamás 503)', async () => {
    const res = await handleVoiceChat(ctx.env, voiceRequest('me quiero matar', 'vc-tts-down', true), {}, null);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.crisis).toBe(true);
  });

  it('crisis -> booking posterior funciona normal (sin contaminación)', async () => {
    const sid = 'vc-crisis-then-book';
    const r1 = await handleVoiceChat(ctx.env, voiceRequest('quiero morir', sid), {}, null);
    expect(((await r1.json()) as any).crisis).toBe(true);
    const r2 = await handleBookingTurn(ctx.env, sid, 'QUIERO AGENDAR TMS', '127.0.0.1');
    expect(r2.handled).toBe(true);
    expect(r2.reply || '').not.toMatch(/línea o presencial/i);
    expect(ctx.state[sid].modality).toBe('presencial');
  });

  it('sin keys, lo no-crisis NO finge éxito (503 explícito, sin fallback silencioso)', async () => {
    const res = await handleVoiceChat(ctx.env, voiceRequest('hola, ¿cómo estás?', 'vc-nokey'), {}, null);
    expect(res.status).toBe(503);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(String(body.error || '')).toMatch(/LLM FREE/i);
  });
});

describe('crisis: /api/chat (secretary) determinista', () => {
  let ctx: Ctx;
  beforeEach(() => {
    vi.unstubAllGlobals();
    ctx = makeCtx();
  });

  for (const msg of ['kme quiero matar', 'me quiero suicidar', 'ya no quiero vivir']) {
    it(`secretary crisis: "${msg}"`, async () => {
      const res = await handleChat(ctx.env, chatRequest(msg), {}, 'r1');
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.success).toBe(true);
      expect(body.action).toBe('transfer_human');
      expect(body.template).toBe('crisis');
      expect(body.message.length).toBeGreaterThan(20);
      expect(body.message).not.toMatch(/horarios disponibles/i);
      expect(body.message).not.toContain('<svg');
    });
  }

  it('FreeSecretary directo también bloquea crisis', async () => {
    const s = new FreeSecretary();
    const r = await s.processMessage('kme quiero matar');
    expect(r.template).toBe('crisis');
    expect(r.action).toBe('transfer_human');
    expect(r.message).not.toMatch(/horarios disponibles/i);
  });
});

describe('crisis multiturno en booking', () => {
  let ctx: Ctx;
  beforeEach(() => {
    vi.unstubAllGlobals();
    ctx = makeCtx();
  });

  it('booking -> crisis: no continúa booking ni muta estado', async () => {
    const sid = 'mt-bc';
    await handleBookingTurn(ctx.env, sid, 'quiero agendar psicologia', '127.0.0.1');
    await handleBookingTurn(ctx.env, sid, 'presencial', '127.0.0.1');
    const before = JSON.stringify(ctx.state[sid]);
    const r = await handleBookingTurn(ctx.env, sid, 'me quiero matar', '127.0.0.1');
    expect(r.handled).toBe(false);
    expect(JSON.stringify(ctx.state[sid])).toBe(before);
    expect(ctx.gcalCalls).toHaveLength(0);
  });

  it('TMS -> crisis: safety gana', async () => {
    const r = await handleBookingTurn(ctx.env, 'mt-tms', 'quiero morir', '127.0.0.1');
    expect(r.handled).toBe(false);
  });

  it('pricing -> crisis: safety gana', async () => {
    const sid = 'mt-pc';
    await handleBookingTurn(ctx.env, sid, 'COSTO', '127.0.0.1');
    const r = await handleBookingTurn(ctx.env, sid, 'quiero suicidarme', '127.0.0.1');
    expect(r.handled).toBe(false);
    expect(ctx.gcalCalls).toHaveLength(0);
  });
});

describe('matriz texto: pricing/booking sin regresiones (nivel ruta)', () => {
  let ctx: Ctx;
  beforeEach(() => {
    vi.unstubAllGlobals();
    ctx = makeCtx();
  });

  it('COSTO TMS por voz: precio, sin Calendar', async () => {
    const res = await handleVoiceChat(ctx.env, voiceRequest('COSTO TMS', 'mx-p'), {}, null);
    const body = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(body.message).toContain('$1,500');
    expect(body.message).not.toMatch(/horarios disponibles/i);
    expect(ctx.gcalCalls).toHaveLength(0);
  });

  it('TMS por voz no pregunta modalidad', async () => {
    const res = await handleVoiceChat(ctx.env, voiceRequest('QUIERO AGENDAR TMS', 'mx-tms'), {}, null);
    const body = (await res.json()) as any;
    expect(res.status).toBe(200);
    expect(body.message).not.toMatch(/línea o presencial/i);
    expect(ctx.gcalCalls).toHaveLength(0);
  });

  it('toda respuesta de la matriz es no-vacía y sin svg', async () => {
    const bodies: string[] = [];
    for (const [sid, msg] of [['mx-a', 'COSTO'], ['mx-b', 'kme quiero matar']] as Array<[string, string]>) {
      const res = await handleVoiceChat(ctx.env, voiceRequest(msg, sid), {}, null);
      const body = (await res.json()) as any;
      bodies.push(String(body.message || ''));
    }
    for (const m of bodies) {
      expect(m.length).toBeGreaterThan(0);
      expect(m).not.toContain('<svg');
    }
  });
});
