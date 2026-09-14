import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleBookingTurn,
  createBookingEvent,
  createBookingRequest,
  verifyBookingRequest,
  isPlausiblePatientName,
  stripTags,
  CLINIC_SCHEDULE,
  CLINIC_TZ,
} from '../src/domains/voice/booking';

// Regresión funcional causa raíz "Paciente: 14:00".
// Ejercita la lógica REAL (handleBookingTurn + createBookingEvent); solo se
// sustituye el borde I/O (D1 en memoria + HTTP Google stub). Si el nombre
// vuelve a contaminarse con un horario, estos tests FALLAN.

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
  posts: Array<{ url: string; body: any }>;
  dayItems: any[];
  fetchCalls: string[];
  requests: Map<number, any>;
  reqSeq: number;
  lastId: number;
}

function applySetClause(store: Map<number, any>, sql: string, args: any[]): number {
  const m = sql.match(/SET (.+) WHERE/i);
  if (!m) return 0;
  const id = args[args.length - 1];
  const row = store.get(id);
  if (!row) return 0;
  if (sql.includes("AND status = 'verified'") && row.status !== 'verified') return 0;
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
  return 1;
}

function makeCtx(): Ctx {
  const ctx: Ctx = { env: null as any, state: {}, posts: [], dayItems: [], fetchCalls: [], requests: new Map(), reqSeq: 0, lastId: 0 };
  const claims = new Map<string, any>();
  ctx.env = {
    DB: {
      prepare: (sql: string) => ({
        run: async () => {
          if (sql.startsWith('DELETE FROM booking_slot_claims WHERE event_id IS NULL')) {
            const nowIso = new Date().toISOString();
            for (const [k, v] of claims) {
              if (v.event) continue;
              const [, d, t] = k.split('|');
              if (!v.request) { claims.delete(k); continue; }
              const req = ctx.requests.get(v.request);
              const live = req && (req.status === 'requested' || req.status === 'verified') && req.expires_at > nowIso && req.date === d && req.time === t;
              if (!live) claims.delete(k);
            }
          }
          return {};
        },
        bind: (...args: any[]) => ({
          first: async () => {
            if (sql.startsWith('SELECT step, appt_type')) {
              const st = ctx.state[args[0]] ?? null;
              return st;
            }
            if (sql.startsWith('SELECT request_id FROM booking_slot_claims WHERE clinic_id = 1 AND date = ?')) {
              for (const [k, v] of claims) {
                const [, d, t] = k.split('|');
                if (d === args[0] && t === args[1] && v.request === args[2] && !v.event) return { request_id: v.request };
              }
              return null;
            }
            if (sql.includes('FROM booking_requests WHERE id = ?')) return ctx.requests.get(args[0]) ?? null;
            if (sql.includes('FROM booking_requests WHERE calendar_event_id = ?')) {
              for (const r of ctx.requests.values()) if (r.calendar_event_id === args[0]) return { id: r.id };
              return null;
            }
            if (sql.includes('FROM calendar_auth')) {
              return {
                access_token: 'tok-test',
                refresh_token: 'refresh-test',
                expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              };
            }
            if (sql.includes('COUNT(*)')) return { c: 0 };
            if (sql.includes('SUM(request_count)')) return { c: 0 };
            if (sql.includes('FROM calendar_oauth_states')) return null;
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
              ctx.lastId = id;
              ctx.requests.set(id, { id, clinic_id: 1, session_id, ip, appt_type, modality, date, time, patient_name, email, phone, email_hash, phone_hash, status, verification_status, expires_at, verified_at: null, confirmed_at: null, cancelled_at: null, calendar_event_id: null, cancel_reason: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
              return { meta: { last_row_id: id } };
            }
            if (sql.startsWith('UPDATE booking_requests')) {
              const n = applySetClause(ctx.requests, sql, args);
              return { meta: { changes: n } };
            }
            if (sql.startsWith('INSERT INTO booking_slot_claims')) {
              const key = `1|${args[0]}|${args[1]}`;
              if (claims.has(key)) throw new Error('UNIQUE constraint failed: booking_slot_claims');
              claims.set(key, { session: args[2], request: args[3] ?? null });
            }
            if (sql.startsWith('DELETE FROM booking_slot_claims WHERE clinic_id = 1 AND date = ?')) {
              claims.delete(`1|${args[0]}|${args[1]}`);
            }
            if (sql.startsWith('DELETE FROM booking_slot_claims WHERE request_id = ? AND event_id IS NULL')) {
              for (const [k, v] of claims) if (v.request === args[0] && !v.event) claims.delete(k);
            }
            if (sql.startsWith('DELETE FROM booking_slot_claims WHERE request_id = ? AND (date != ?')) {
              for (const [k, v] of claims) {
                const [, d, t] = k.split('|');
                if (v.request === args[0] && (d !== args[1] || t !== args[2]) && !v.event) claims.delete(k);
              }
            }
            if (sql.startsWith('UPDATE booking_slot_claims SET event_id = ?')) {
              for (const [k, v] of claims) {
                const [, d, t] = k.split('|');
                if (d === args[1] && t === args[2] && v.session === args[3]) { v.event = args[0]; }
              }
            }
            if (sql.startsWith('DELETE FROM booking_slot_claims WHERE event_id = ?')) {
              for (const [k, v] of claims) if (v.event === args[0]) claims.delete(k);
            }
            return {};
          },
          all: async () => {
            if (sql.includes('FROM booking_slot_claims WHERE clinic_id = 1 AND date = ?')) {
              const out: any[] = [];
              for (const [k, v] of claims) {
                const [, d, t] = k.split('|');
                if (d === args[0]) out.push({ time: t, session_id: v.session ?? null, event_id: v.event ?? null, request_id: v.request ?? null, created_at: new Date().toISOString() });
              }
              return { results: out };
            }
            if (sql.includes('FROM booking_requests WHERE id IN')) {
              return { results: (args as any[]).map((id) => ctx.requests.get(id)).filter(Boolean) };
            }
            if (sql.includes('FROM booking_requests')) return { results: [] };
            return { results: [] };
          },
        }),
      }),
    },
  };
  const fakeFetch = async (url: any, init: any = {}) => {
    const u = String(url);
    const method = (init?.method || 'GET').toUpperCase();
    ctx.fetchCalls.push(`${method} ${u}`);
    const json = async () => {
      if (method === 'POST' && u.endsWith('/calendars/primary/events')) {
        const body = JSON.parse(init.body as string);
        ctx.posts.push({ url: u, body });
        return { id: 'evt-test-001', htmlLink: 'https://calendar.google.com/event?eid=test' };
      }
      if (method === 'GET' && /\/events\/[^?]+$/.test(u)) {
        const last = ctx.posts[ctx.posts.length - 1]?.body;
        return {
          id: 'evt-test-001', status: 'confirmed', summary: 'Cita — Neurociencia Clínica',
          start: { dateTime: last?.start?.dateTime }, end: { dateTime: last?.end?.dateTime },
        };
      }
      return { items: ctx.dayItems };
    };
    const status = method === 'POST' ? 201 : 200;
    return { status, ok: status < 300, json };
  };
  vi.stubGlobal('fetch', fakeFetch);
  return ctx;
}

async function driveToSlots(ctx: Ctx, sid: string, date: string) {
  await handleBookingTurn(ctx.env, sid, 'quiero una cita', '127.0.0.1');
  await handleBookingTurn(ctx.env, sid, 'psicologia', '127.0.0.1');
  await handleBookingTurn(ctx.env, sid, 'presencial', '127.0.0.1');
  const r = await handleBookingTurn(ctx.env, sid, ddmmyyyy(date), '127.0.0.1');
  expect(r.handled).toBe(true);
  expect(r.reply || '').toContain('10:00');
}

// Solicitud verificada lista para confirmar (nuevo gate: sin request no hay evento).
async function newVerifiedRequest(ctx: Ctx, o: { name: string; email: string; phone: string; date: string; time: string; sid?: string }): Promise<number> {
  const created = await createBookingRequest(ctx.env, {
    sessionId: o.sid || 's-req', ip: '127.0.0.1', apptType: 'Psicología', modality: 'presencial',
    date: o.date, time: o.time, name: o.name, email: o.email, phone: o.phone,
  });
  expect(created.ok).toBe(true);
  if (!created.ok) throw new Error(`request failed: ${(created as { error?: string }).error}`);
  const v = await verifyBookingRequest(ctx.env, created.request.id);
  expect(v.ok).toBe(true);
  return created.request.id;
}

describe('booking blindaje Paciente/horario', () => {
  let ctx: Ctx;
  beforeEach(() => {
    ctx = makeCtx();
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', async (url: any, init: any = {}) => {
      const u = String(url);
      const method = (init?.method || 'GET').toUpperCase();
      ctx.fetchCalls.push(`${method} ${u}`);
      const json = async () => {
        if (method === 'POST' && u.endsWith('/calendars/primary/events')) {
          const body = JSON.parse(init.body as string);
          ctx.posts.push({ url: u, body });
          return { id: 'evt-test-001', htmlLink: 'https://calendar.google.com/event?eid=test' };
        }
        if (method === 'GET' && /\/events\/[^?]+$/.test(u)) {
          const last = ctx.posts[ctx.posts.length - 1]?.body;
          return {
            id: 'evt-test-001', status: 'confirmed', summary: 'Cita — Neurociencia Clínica',
            start: { dateTime: last?.start?.dateTime }, end: { dateTime: last?.end?.dateTime },
          };
        }
        return { items: ctx.dayItems };
      };
      const status = method === 'POST' ? 201 : 200;
      return { status, ok: status < 300, json };
    });
  });

  it('elegir slot NO fija el nombre del paciente (causa raíz)', async () => {
    const date = nextWorkday();
    await driveToSlots(ctx, 's-raiz', date);
    const r = await handleBookingTurn(ctx.env, 's-raiz', '10:00', '127.0.0.1');
    expect(r.handled).toBe(true);
    expect(r.reply || '').toContain('nombre');
    expect(r.reply || '').not.toContain('Gracias, 10:00');
    expect(ctx.state['s-raiz'].patient_name ?? null).toBeNull();
    expect(ctx.state['s-raiz'].time).toBe('10:00');
  });

  it('una hora como nombre se rechaza en need_contact', async () => {
    const date = nextWorkday();
    await driveToSlots(ctx, 's-hora', date);
    await handleBookingTurn(ctx.env, 's-hora', '10:00', '127.0.0.1');
    const r = await handleBookingTurn(ctx.env, 's-hora', '11:00', '127.0.0.1');
    expect(r.handled).toBe(true);
    expect(ctx.state['s-hora'].patient_name ?? null).toBeNull();
    expect(r.reply || '').toMatch(/nombre|horario/i);
  });

  it('flujo completo guarda Paciente real + start/end/timezone/duración', async () => {
    const date = nextWorkday();
    await driveToSlots(ctx, 's-full', date);
    await handleBookingTurn(ctx.env, 's-full', '10:00', '127.0.0.1');
    const rc = await handleBookingTurn(ctx.env, 's-full', 'Ana Prueba — ana@example.com', '127.0.0.1');
    expect(rc.reply || '').toMatch(/teléfono/i);
    const rc2 = await handleBookingTurn(ctx.env, 's-full', '2311442900', '127.0.0.1');
    expect(rc2.reply || '').toContain('Ana Prueba');
    expect(ctx.state['s-full'].request_id).toBeGreaterThan(0);
    const done = await handleBookingTurn(ctx.env, 's-full', 'sí, confirmo', '127.0.0.1');
    expect(done.eventId).toBe('evt-test-001');
    expect(ctx.posts.length).toBe(1);
    const body = ctx.posts[0].body;
    expect(body.description).toContain('Paciente: Ana Prueba');
    expect(body.description).not.toMatch(/Paciente: \d{1,2}:\d{2}/);
    expect(body.start).toEqual({ dateTime: `${date}T10:00:00`, timeZone: 'America/Mexico_City' });
    expect(body.end).toEqual({ dateTime: `${date}T10:50:00`, timeZone: 'America/Mexico_City' });
    expect(body.attendees).toEqual([{ email: 'ana@example.com' }]);
    expect(CLINIC_TZ).toBe('America/Mexico_City');
    expect(CLINIC_SCHEDULE.durationMin).toBe(50);
  });

  it('sin solicitud verificada NO hay evento (gate anti-abuso)', async () => {
    const date = nextWorkday();
    const before = ctx.posts.length;
    const r = await createBookingEvent(ctx.env, {
      date, time: '10:00', apptType: 'Psicología', modality: 'presencial',
      name: 'Ana Prueba', email: 'x@example.com', requestId: 999999,
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('invalid_request');
    expect(ctx.posts.length).toBe(before);
    expect(ctx.fetchCalls.filter((c) => c.startsWith('POST'))).toHaveLength(0);
  });

  it('createBookingEvent rechaza nombre-hora SIN llamar a Google', async () => {
    const date = nextWorkday();
    const reqId = await newVerifiedRequest(ctx, { name: 'Ana Valida', email: 'valida@example.com', phone: '2311442901', date, time: '10:00', sid: 's-ic' });
    const before = ctx.posts.length;
    const r = await createBookingEvent(ctx.env, {
      date, time: '10:00', apptType: 'Psicología', modality: 'presencial',
      name: '14:00', email: 'x@example.com', requestId: reqId,
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('invalid_contact');
    expect(ctx.posts.length).toBe(before);
    expect(ctx.fetchCalls.filter((c) => c.startsWith('POST'))).toHaveLength(0);
  });

  it('isPlausiblePatientName bloquea hora/fecha/email/modalidad', () => {
    expect(isPlausiblePatientName('14:00')).toBe(false);
    expect(isPlausiblePatientName('a las 15:00')).toBe(false);
    expect(isPlausiblePatientName('2026-09-14')).toBe(false);
    expect(isPlausiblePatientName('ana@example.com')).toBe(false);
    expect(isPlausiblePatientName('presencial')).toBe(false);
    expect(isPlausiblePatientName('Psicología')).toBe(false);
    expect(isPlausiblePatientName('X')).toBe(false);
    expect(isPlausiblePatientName('Ana Prueba')).toBe(true);
    expect(isPlausiblePatientName('María López')).toBe(true);
  });

  it('stripTags elimina HTML antes de events.insert', async () => {
    const date = nextWorkday();
    const reqId = await newVerifiedRequest(ctx, { name: 'Ana Prueba', email: 'ana@example.com', phone: '2311442902', date, time: '11:00', sid: 's-strip' });
    await createBookingEvent(ctx.env, {
      date, time: '11:00', apptType: 'Psicología', modality: '<script>alert(1)</script>',
      name: 'Ana Prueba', email: 'ana@example.com', requestId: reqId,
    });
    expect(ctx.posts.length).toBe(1);
    const body = ctx.posts[0].body;
    expect(body.description).not.toContain('<');
    expect(body.description).not.toContain('alert');
    expect(body.description).not.toContain('script');
    expect(body.description).toContain('Paciente: Ana Prueba');
  });

  it('carrera real: dos solicitudes simultáneas, solo una gana el slot', async () => {
    const date = nextWorkday();
    const mk = (name: string, sid: string, email: string, phone: string) => createBookingRequest(ctx.env, {
      sessionId: sid, ip: '127.0.0.1', apptType: 'Psicología', modality: 'presencial',
      date, time: '12:00', name, email, phone,
    });
    const [a, b] = await Promise.all([
      mk('Race Uno', 's-r1', 'race1@example.com', '2311442911'),
      mk('Race Dos', 's-r2', 'race2@example.com', '2311442922'),
    ]);
    const oks = [a, b].filter((r) => r.ok);
    const taken = [a, b].filter((r) => !r.ok && (r as { code?: string }).code === 'slot_taken');
    expect(oks).toHaveLength(1);
    expect(taken).toHaveLength(1);
    // El ganador confirma; el perdedor no puede crear evento.
    const winner = oks[0] as { ok: true; request: { id: number } };
    const v = await verifyBookingRequest(ctx.env, winner.request.id);
    expect(v.ok).toBe(true);
    const created = await createBookingEvent(ctx.env, {
      date, time: '12:00', apptType: 'Psicología', modality: 'presencial',
      name: 'Race Uno', email: 'race@example.com', sessionId: 's-r1', requestId: winner.request.id,
    });
    expect(created.ok).toBe(true);
    expect(ctx.posts).toHaveLength(1);
  });

  it('doble reserva del mismo slot se rechaza sin segundo insert', async () => {
    const date = nextWorkday();
    ctx.dayItems = [{
      id: 'evt-otro', status: 'confirmed',
      start: { dateTime: `${date}T10:00:00-06:00` },
      end: { dateTime: `${date}T10:50:00-06:00` },
    }];
    const r = await createBookingRequest(ctx.env, {
      sessionId: 's-doble', ip: '127.0.0.1', apptType: 'Psicología', modality: 'presencial',
      date, time: '10:00', name: 'Otro Paciente', email: 'otro@example.com', phone: '2311442933',
    });
    expect(r.ok).toBe(false);
    expect((r as { code?: string }).code).toBe('slot_taken');
    expect(ctx.posts).toHaveLength(0);
  });
});
