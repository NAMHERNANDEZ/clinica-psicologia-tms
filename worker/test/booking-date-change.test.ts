import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleBookingTurn,
  looksLikeDateChange,
  extractDate,
  prettyDate,
  CLINIC_SCHEDULE,
} from '../src/domains/voice/booking';

// Regresión forense 2026-09-14 (BOOKING NO ACTUALIZA FECHA):
// sábado → slots sábado → "Y EL LUNES" → volvía a mostrar slots del sábado.
// Causa raíz: need_slot jamás extraía fecha del mensaje y reenviaba
// offered_slots cacheados. Regla instalada: fecha nueva invalida
// selected_slot + availability y fuerza NUEVA consulta a Calendar.

function mxToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function addDaysStr(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(iso: string): number {
  return new Date(iso + 'T12:00:00Z').getUTCDay();
}

// Próxima ocurrencia del día de semana (delta 1..7; si es hoy, +7).
function nextWeekday(dow: number): string {
  const today = mxToday();
  let delta = (dow - weekdayOf(today) + 7) % 7;
  if (delta === 0) delta = 7;
  return addDaysStr(today, delta);
}

function ddmmyyyy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface Ctx {
  env: any;
  state: Record<string, any>;
  queryDates: string[];
  requests: Map<number, any>;
  reqSeq: number;
}

function makeCtx(): Ctx {
  const ctx: Ctx = { env: null as any, state: {}, queryDates: [], requests: new Map(), reqSeq: 0 };
  ctx.env = {
    DB: {
      prepare: (sql: string) => ({
        bind: (...args: any[]) => ({
          first: async () => {
            if (sql.startsWith('SELECT step, appt_type')) return ctx.state[args[0]] ?? null;
            if (sql.startsWith('SELECT status, expires_at, date, time FROM booking_requests WHERE id = ?')) return ctx.requests.get(args[0]) ?? null;
            if (sql.startsWith('SELECT * FROM booking_requests WHERE id = ?')) return ctx.requests.get(args[0]) ?? null;
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
              const [sid, step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id, request_id] = args;
              ctx.state[sid] = { step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id, request_id };
            }
            if (sql.startsWith('INSERT INTO booking_requests')) {
              const [session_id, ip, appt_type, modality, date, time, patient_name, email, phone, email_hash, phone_hash, status, verification_status, expires_at] = args;
              const id = ++ctx.reqSeq;
              ctx.requests.set(id, { id, clinic_id: 1, session_id, ip, appt_type, modality, date, time, patient_name, email, phone, email_hash, phone_hash, status, verification_status, expires_at, verified_at: null, confirmed_at: null, cancelled_at: null, calendar_event_id: null, cancel_reason: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
              return { meta: { last_row_id: id } };
            }
            if (sql.startsWith('UPDATE booking_requests')) {
              const m = sql.match(/SET (.+) WHERE/i);
              const row = ctx.requests.get(args[args.length - 1]);
              if (m && row) {
                let bi = 0;
                for (const part of m[1].split(',')) {
                  const t = part.trim();
                  let cm = t.match(/^(\w+)\s*=\s*\?$/);
                  if (cm) { row[cm[1]] = args[bi++]; continue; }
                  cm = t.match(/^(\w+)\s*=\s*'([^']*)'$/);
                  if (cm) { row[cm[1]] = cm[2]; continue; }
                  cm = t.match(/^(\w+)\s*=\s*datetime\('now'\)$/);
                  if (cm) { row[cm[1]] = new Date().toISOString(); continue; }
                }
              }
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
    if (method === 'GET' && u.includes('/calendars/primary/events?')) {
      const m = u.match(/timeMin=(\d{4}-\d{2}-\d{2})/);
      if (m) ctx.queryDates.push(decodeURIComponent(m[1]));
    }
    return { status: 200, ok: true, json: async () => ({ items: [] }) };
  });
}

function offeredDates(ctx: Ctx, sid: string): string[] {
  const raw = ctx.state[sid]?.offered_slots;
  if (!raw) return [];
  return (JSON.parse(raw) as Array<{ date: string }>).map((s) => s.date);
}

async function driveTmsToSaturday(ctx: Ctx, sid: string, sat: string) {
  await handleBookingTurn(ctx.env, sid, 'QUIERO AGENDAR TMS', '127.0.0.1');
  const r = await handleBookingTurn(ctx.env, sid, ddmmyyyy(sat), '127.0.0.1');
  expect(r.handled).toBe(true);
  expect(r.reply || '').toContain('10:00');
  expect(ctx.state[sid].date).toBe(sat);
  expect(ctx.state[sid].modality).toBe('presencial');
}

describe('booking date change: fecha nueva invalida slots viejos', () => {
  let ctx: Ctx;
  let sat: string;
  let mon: string;
  beforeEach(() => {
    ctx = makeCtx();
    vi.unstubAllGlobals();
    stubCalendar(ctx);
    sat = nextWeekday(6);
    // Próxima ocurrencia real desde HOY (misma semántica del parser:
    // día de semana próximo según America/Mexico_City, hoy→+7).
    mon = nextWeekday(1);
  });

  it('sábado → "Y EL LUNES" → slots del lunes, nunca del sábado', async () => {
    await driveTmsToSaturday(ctx, 'd-1', sat);
    const r = await handleBookingTurn(ctx.env, 'd-1', 'Y EL LUNES', '127.0.0.1');
    expect(r.handled).toBe(true);
    expect(ctx.state['d-1'].date).toBe(mon);
    expect(ctx.state['d-1'].time ?? null).toBeNull();
    expect(offeredDates(ctx, 'd-1').every((d) => d === mon)).toBe(true);
    expect(ctx.queryDates).toContain(mon);
    // la respuesta indica la NUEVA fecha y no reenvía la vieja
    expect(r.reply || '').toContain(prettyDate(mon));
    expect(r.reply || '').toContain('10:00');
    expect(r.reply || '').not.toContain(prettyDate(sat));
    expect(ctx.state['d-1'].modality).toBe('presencial');
  });

  it('cambio repetido lunes → miércoles → viernes, siempre la última fecha', async () => {
    await driveTmsToSaturday(ctx, 'd-rep', sat);
    const wed = nextWeekday(3);
    const fri = nextWeekday(5);
    let r = await handleBookingTurn(ctx.env, 'd-rep', 'mejor el lunes', '127.0.0.1');
    expect(ctx.state['d-rep'].date).toBe(mon);
    r = await handleBookingTurn(ctx.env, 'd-rep', 'el miércoles', '127.0.0.1');
    expect(ctx.state['d-rep'].date).toBe(wed);
    expect(offeredDates(ctx, 'd-rep').every((d) => d === wed)).toBe(true);
    r = await handleBookingTurn(ctx.env, 'd-rep', 'el viernes', '127.0.0.1');
    expect(ctx.state['d-rep'].date).toBe(fri);
    expect(offeredDates(ctx, 'd-rep').every((d) => d === fri)).toBe(true);
    expect(r.reply || '').toContain('10:00');
  });

  it('"el próximo lunes" y "este lunes" resuelven al lunes correcto', async () => {
    await driveTmsToSaturday(ctx, 'd-prox', sat);
    let r = await handleBookingTurn(ctx.env, 'd-prox', 'el próximo lunes', '127.0.0.1');
    expect(ctx.state['d-prox'].date).toBe(mon);
    expect(r.reply || '').toContain('10:00');
    await driveTmsToSaturday(ctx, 'd-este', sat);
    r = await handleBookingTurn(ctx.env, 'd-este', 'este lunes', '127.0.0.1');
    expect(ctx.state['d-este'].date).toBe(mon);
  });

  it('fecha explícita dd/mm y "16 de septiembre"-style cambian la fecha', async () => {
    await driveTmsToSaturday(ctx, 'd-exp', sat);
    const target = addDaysStr(sat, 4); // miércoles
    const r = await handleBookingTurn(ctx.env, 'd-exp', ddmmyyyy(target), '127.0.0.1');
    expect(ctx.state['d-exp'].date).toBe(target);
    expect(offeredDates(ctx, 'd-exp').every((d) => d === target)).toBe(true);
    expect(ctx.queryDates).toContain(target);
    expect(r.reply || '').toContain('10:00');
  });

  it('slot elegido + "mejor el lunes" descarta la hora y pide hora nueva', async () => {
    await driveTmsToSaturday(ctx, 'd-late', sat);
    const pick = await handleBookingTurn(ctx.env, 'd-late', '10:00', '127.0.0.1');
    expect(pick.reply || '').toContain('nombre');
    expect(ctx.state['d-late'].time).toBe('10:00');
    const r = await handleBookingTurn(ctx.env, 'd-late', 'mejor el lunes', '127.0.0.1');
    expect(r.handled).toBe(true);
    expect(ctx.state['d-late'].date).toBe(mon);
    expect(ctx.state['d-late'].time ?? null).toBeNull();
    expect(ctx.state['d-late'].step).toBe('need_slot');
    expect(offeredDates(ctx, 'd-late').every((d) => d === mon)).toBe(true);
    expect(r.reply || '').toContain('10:00');
  });

  it('"mañana" y "pasado mañana" funcionan como cambio de fecha', async () => {
    await driveTmsToSaturday(ctx, 'd-man', sat);
    const tomorrow = addDaysStr(mxToday(), 1);
    const r = await handleBookingTurn(ctx.env, 'd-man', 'mejor mañana', '127.0.0.1');
    // si mañana no hay atención (domingo), el sistema lo dice sin slots viejos
    if (weekdayOf(tomorrow) === 0) {
      expect(r.reply || '').toMatch(/no hay atención/i);
    } else {
      expect(ctx.state['d-man'].date).toBe(tomorrow);
      expect(offeredDates(ctx, 'd-man').every((d) => d === tomorrow)).toBe(true);
    }
  });

  it('terapia conserva modalidad tras cambio de fecha', async () => {
    await handleBookingTurn(ctx.env, 'd-ter', 'quiero agendar psicologia', '127.0.0.1');
    await handleBookingTurn(ctx.env, 'd-ter', 'en línea', '127.0.0.1');
    await handleBookingTurn(ctx.env, 'd-ter', ddmmyyyy(sat), '127.0.0.1');
    expect(ctx.state['d-ter'].modality).toBe('en línea');
    const r = await handleBookingTurn(ctx.env, 'd-ter', 'y el lunes', '127.0.0.1');
    expect(ctx.state['d-ter'].date).toBe(mon);
    expect(ctx.state['d-ter'].modality).toBe('en línea');
    expect(r.reply || '').toContain('10:00');
  });

  it('hora de la misma fecha sigue eligiendo slot (sin regresión)', async () => {
    await driveTmsToSaturday(ctx, 'd-same', sat);
    const r = await handleBookingTurn(ctx.env, 'd-same', '11:00', '127.0.0.1');
    expect(ctx.state['d-same'].time).toBe('11:00');
    expect(ctx.state['d-same'].date).toBe(sat);
    expect(r.reply || '').toContain('nombre');
  });

  it('"Domingo Pérez" con email sigue siendo contacto, no fecha', async () => {
    await driveTmsToSaturday(ctx, 'd-nom', sat);
    await handleBookingTurn(ctx.env, 'd-nom', '10:00', '127.0.0.1');
    const r = await handleBookingTurn(ctx.env, 'd-nom', 'Domingo Pérez — domingo@test.com — 2311442901', '127.0.0.1');
    expect(ctx.state['d-nom'].patient_name).toBe('Domingo Pérez');
    expect(ctx.state['d-nom'].date).toBe(sat);
    expect(r.reply || '').toMatch(/confirma/i);
  });

  it('"Domingo Pérez" sin email se trata como nombre, no como domingo', async () => {
    await driveTmsToSaturday(ctx, 'd-nom2', sat);
    await handleBookingTurn(ctx.env, 'd-nom2', '10:00', '127.0.0.1');
    const r = await handleBookingTurn(ctx.env, 'd-nom2', 'Domingo Pérez', '127.0.0.1');
    expect(ctx.state['d-nom2'].patient_name).toBe('Domingo Pérez');
    expect(ctx.state['d-nom2'].date).toBe(sat);
    expect(r.reply || '').toMatch(/correo/i);
  });

  it('looksLikeDateChange: fechas sí, nombres no', () => {
    expect(looksLikeDateChange('y el lunes')).toBe(true);
    expect(looksLikeDateChange('mejor el lunes')).toBe(true);
    expect(looksLikeDateChange('el lunes')).toBe(true);
    expect(looksLikeDateChange('mañana')).toBe(true);
    expect(looksLikeDateChange('22/09')).toBe(true);
    expect(looksLikeDateChange('Domingo Pérez')).toBe(false);
    expect(looksLikeDateChange('Ana López')).toBe(false);
    expect(looksLikeDateChange('10:00')).toBe(false);
    expect(extractDate('y el lunes') !== null).toBe(true);
  });
});
