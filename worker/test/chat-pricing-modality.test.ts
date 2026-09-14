import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleBookingTurn,
  looksLikePricing,
  extractPricingService,
  CLINIC_SCHEDULE,
} from '../src/domains/voice/booking';
import { FreeSecretary } from '../src/lib/ai-secretary';

// Regresión forense 2026-09-14:
//  1. "COSTO" caía en availability cuando había booking state residual
//     (stale booking context dominaba a pricing explícito).
//  2. "CUANTO LA CONSULTA TMS" entraba a booking por la palabra "consulta"
//     y preguntaba modalidad online/presencial para TMS (TMS = presencial).
// Regla instalada: PRICING > AVAILABILITY + TMS siempre presencial.

function nextWorkday(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  for (let i = 0; i < 12; i++) {
    const s = fmt.format(d);
    const dow = new Date(s + 'T12:00:00Z').getUTCDay();
    if ((CLINIC_SCHEDULE.days as number[]).includes(dow)) return s;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  throw new Error('sin día laboral futuro');
}

function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface Ctx {
  env: any;
  state: Record<string, any>;
  fetchCalls: string[];
}

function makeCtx(): Ctx {
  const ctx: Ctx = { env: null as any, state: {}, fetchCalls: [] };
  ctx.env = {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => {
            if (sql.startsWith('SELECT step, appt_type')) return ctx.state[args[0]] ?? null;
            if (sql.includes('FROM calendar_auth')) {
              return {
                access_token: 'tok-test',
                refresh_token: 'refresh-test',
                expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              };
            }
            if (sql.includes('COUNT(*)')) return { c: 0 };
            if (sql.includes('SUM(request_count)')) return { c: 0 };
            return null;
          },
          run: async () => {
            if (sql.startsWith('INSERT INTO booking_sessions')) {
              const [sid, step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id] = args;
              ctx.state[sid] = { step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id };
            }
            return {};
          },
          all: async () => ({ results: [] }),
        }),
      }),
    },
  };
  return ctx;
}

function stubCalendar(ctx: Ctx) {
  vi.stubGlobal('fetch', async (url: any, init: any = {}) => {
    const u = String(url);
    const method = (init?.method || 'GET').toUpperCase();
    ctx.fetchCalls.push(`${method} ${u}`);
    return { status: 200, ok: true, json: async () => ({ items: [] }) };
  });
}

async function driveToSlots(ctx: Ctx, sid: string, date: string) {
  await handleBookingTurn(ctx.env, sid, 'quiero una cita', '127.0.0.1');
  await handleBookingTurn(ctx.env, sid, 'psicologia', '127.0.0.1');
  await handleBookingTurn(ctx.env, sid, 'presencial', '127.0.0.1');
  const r = await handleBookingTurn(ctx.env, sid, ddmmyyyy(date), '127.0.0.1');
  expect(r.handled).toBe(true);
  expect(r.reply || '').toContain('10:00');
}

describe('pricing intent: nunca availability', () => {
  let ctx: Ctx;
  beforeEach(() => {
    ctx = makeCtx();
    vi.unstubAllGlobals();
    stubCalendar(ctx);
  });

  const pricingCases = [
    'COSTO',
    'PRECIO',
    'CUANTO',
    'CUÁNTO',
    'CUANTO CUESTA',
    'costo',
    'precio',
    'cuánto cuesta',
  ];
  for (const msg of pricingCases) {
    it(`"${msg}" sesión nueva → precio, NO horarios`, async () => {
      const r = await handleBookingTurn(ctx.env, `p-${msg}`, msg, '127.0.0.1');
      expect(r.handled).toBe(true);
      expect(r.reply || '').toContain('$1,500');
      expect(r.reply || '').toContain('$500');
      expect(r.reply || '').not.toMatch(/horarios disponibles/i);
      expect(r.reply || '').not.toMatch(/línea o presencial/i);
      expect(r.reply || '').not.toContain('<svg');
      expect(ctx.fetchCalls.filter((c) => c.includes('googleapis'))).toHaveLength(0);
    });
  }

  it('COSTO TMS → precio TMS, sin modalidad ni slots', async () => {
    for (const msg of ['COSTO TMS', 'PRECIO TMS', 'CUANTO CUESTA TMS', 'cuanto la consulta TMS', 'CUANTO LA CONSULTA TMS', 'precio de la consulta TMS']) {
      const r = await handleBookingTurn(ctx.env, `tms-${msg}`, msg, '127.0.0.1');
      expect(r.handled).toBe(true);
      expect(r.reply || '').toContain('$1,500');
      expect(r.reply || '').not.toMatch(/línea o presencial/i);
      expect(r.reply || '').not.toMatch(/horarios disponibles/i);
      expect(ctx.fetchCalls.filter((c) => c.includes('googleapis'))).toHaveLength(0);
    }
  });

  it('COSTO TERAPIA → precio terapia, sin slots', async () => {
    for (const msg of ['COSTO TERAPIA', 'PRECIO TERAPIA', 'CUÁNTO CUESTA LA TERAPIA', 'precio psicologia']) {
      const r = await handleBookingTurn(ctx.env, `ter-${msg}`, msg, '127.0.0.1');
      expect(r.handled).toBe(true);
      expect(r.reply || '').toContain('$500');
      expect(r.reply || '').not.toMatch(/horarios disponibles/i);
    }
  });

  it('stale booking state NO domina a COSTO (need_slot → precio)', async () => {
    const date = nextWorkday();
    await driveToSlots(ctx, 's-stale', date);
    const before = ctx.fetchCalls.length;
    const r = await handleBookingTurn(ctx.env, 's-stale', 'COSTO', '127.0.0.1');
    expect(r.handled).toBe(true);
    // contexto psicología → precio terapia (lo clave: NO horarios)
    expect(r.reply || '').toContain('$500');
    expect(r.reply || '').not.toMatch(/horarios disponibles/i);
    // pricing no llama a Calendar ni muta el booking state
    expect(ctx.fetchCalls.length).toBe(before);
    expect(ctx.state['s-stale'].step).toBe('need_slot');
  });

  it('context switch: agendar → COSTO → agendar retoma booking', async () => {
    const date = nextWorkday();
    await driveToSlots(ctx, 's-switch', date);
    const p = await handleBookingTurn(ctx.env, 's-switch', 'COSTO', '127.0.0.1');
    expect(p.reply || '').toContain('$500');
    expect(p.reply || '').not.toMatch(/horarios disponibles/i);
    const back = await handleBookingTurn(ctx.env, 's-switch', 'quiero agendar', '127.0.0.1');
    expect(back.handled).toBe(true);
    expect(back.reply || '').toMatch(/horarios disponibles/i);
  });

  it('"cuánto" suelto con contexto TMS → precio TMS', async () => {
    await handleBookingTurn(ctx.env, 's-ctx', 'quiero agendar TMS', '127.0.0.1');
    for (const msg of ['CUANTO', 'cuánto', 'precio', 'cuanto cuesta']) {
      const r = await handleBookingTurn(ctx.env, 's-ctx', msg, '127.0.0.1');
      expect(r.handled).toBe(true);
      expect(r.reply || '').toContain('$1,500');
      expect(r.reply || '').not.toMatch(/línea o presencial/i);
    }
  });

  it('looksLikePricing / extractPricingService', () => {
    expect(looksLikePricing('COSTO')).toBe(true);
    expect(looksLikePricing('cuánto cuesta')).toBe(true);
    expect(looksLikePricing('quiero una cita')).toBe(false);
    expect(looksLikePricing('hola')).toBe(false);
    expect(extractPricingService('COSTO TMS')).toBe('tms');
    expect(extractPricingService('cuanto la consulta tms')).toBe('tms');
    expect(extractPricingService('COSTO TERAPIA')).toBe('terapia');
    expect(extractPricingService('COSTO')).toBeNull();
  });
});

describe('modalidad: TMS siempre presencial, terapia sí pregunta', () => {
  let ctx: Ctx;
  beforeEach(() => {
    ctx = makeCtx();
    vi.unstubAllGlobals();
    stubCalendar(ctx);
  });

  it('QUIERO AGENDAR TMS → presencial automático, sin preguntar modalidad', async () => {
    const r = await handleBookingTurn(ctx.env, 'm-tms', 'QUIERO AGENDAR TMS', '127.0.0.1');
    expect(r.handled).toBe(true);
    expect(r.reply || '').not.toMatch(/línea o presencial/i);
    expect(ctx.state['m-tms'].appt_type).toBe('TMS');
    expect(ctx.state['m-tms'].modality).toBe('presencial');
  });

  it('TMS nunca pregunta modalidad aunque el usuario no la indique', async () => {
    await handleBookingTurn(ctx.env, 'm-tms2', 'quiero una cita', '127.0.0.1');
    const r = await handleBookingTurn(ctx.env, 'm-tms2', 'TMS', '127.0.0.1');
    expect(r.handled).toBe(true);
    expect(r.reply || '').not.toMatch(/línea o presencial/i);
    expect(ctx.state['m-tms2'].modality).toBe('presencial');
  });

  it('TMS llega a slots reales de Calendar con presencial', async () => {
    const date = nextWorkday();
    await handleBookingTurn(ctx.env, 'm-tms3', 'QUIERO AGENDAR TMS', '127.0.0.1');
    const r = await handleBookingTurn(ctx.env, 'm-tms3', ddmmyyyy(date), '127.0.0.1');
    expect(r.handled).toBe(true);
    expect(r.reply || '').toContain('10:00');
    expect(ctx.state['m-tms3'].modality).toBe('presencial');
  });

  it('TERAPIA SÍ pregunta modalidad online/presencial', async () => {
    const r = await handleBookingTurn(ctx.env, 'm-ter', 'QUIERO AGENDAR PSICOLOGIA', '127.0.0.1');
    expect(r.handled).toBe(true);
    expect(r.reply || '').toMatch(/línea o presencial/i);
  });

  it('terapia en línea y presencial se aceptan', async () => {
    const a = await handleBookingTurn(ctx.env, 'm-on', 'quiero agendar psicologia', '127.0.0.1');
    expect(a.reply || '').toMatch(/línea o presencial/i);
    await handleBookingTurn(ctx.env, 'm-on', 'en línea', '127.0.0.1');
    expect(ctx.state['m-on'].modality).toBe('en línea');
    const b = await handleBookingTurn(ctx.env, 'm-pre', 'quiero agendar psicologia', '127.0.0.1');
    expect(b.reply || '').toMatch(/línea o presencial/i);
    await handleBookingTurn(ctx.env, 'm-pre', 'presencial', '127.0.0.1');
    expect(ctx.state['m-pre'].modality).toBe('presencial');
  });
});

describe('secretary fallback /api/chat: pricing TMS combinado', () => {
  const secretary = new FreeSecretary();

  it('CUANTO LA CONSULTA TMS → pricing_tms, sin modalidad', async () => {
    const r = await secretary.processMessage('CUANTO LA CONSULTA TMS');
    expect(r.template).toBe('pricing_tms');
    expect(r.message).toContain('$1,500');
    expect(r.message).not.toMatch(/línea o presencial/i);
  });

  it('CUANTO suelto → ambos precios', async () => {
    const r = await secretary.processMessage('CUANTO');
    expect(r.message).toContain('$1,500');
    expect(r.message).toContain('$500');
  });
});
