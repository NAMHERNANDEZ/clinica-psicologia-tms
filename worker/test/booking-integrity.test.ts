import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleBookingTurn,
  createBookingEvent,
  createBookingRequest,
  verifyBookingRequest,
  cancelBookingRequest,
  cancelRequestByEvent,
  syncAppointmentFromBooking,
  updateBookingRequestSlot,
  sweepBookingRequests,
  normalizePhoneMX,
  extractPhone,
  getAvailableSlots,
  CLINIC_SCHEDULE,
} from '../src/domains/voice/booking';
import { handleCreateAppointment } from '../src/domains/voice/routes';

// Integridad anti-abuso (2026-09-14): solicitud -> verificacion ->
// confirmacion -> cita. Sin solicitud verificada+vigente NO hay evento.
// 1 pendiente + 1 activa por identidad; holds con TTL 15 min; flagging.

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

interface Ctx {
  env: any;
  state: Record<string, any>;
  posts: any[];
  dayItems: any[];
  requests: Map<number, any>;
  reqSeq: number;
  patients: Map<number, any>;
  patientSeq: number;
  appointments: Map<number, any>;
  apptSeq: number;
}

function applySet(store: Map<number, any>, sql: string, args: any[]): number {
  const m = sql.match(/SET (.+) WHERE/i);
  const row = store.get(args[args.length - 1]);
  if (!m || !row) return 0;
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
  const ctx: Ctx = { env: null as any, state: {}, posts: [], dayItems: [], requests: new Map(), reqSeq: 0, patients: new Map(), patientSeq: 0, appointments: new Map(), apptSeq: 0 };
  const claims = new Map<string, any>();
  ctx.env = {
    DB: {
      prepare: (sql: string) => ({
        // all()/run() directos sin bind (sweeper y purga).
        all: async () => {
          if (sql.includes("status IN ('requested', 'verified') AND expires_at")) {
            const nowIso = new Date().toISOString();
            return { results: [...ctx.requests.values()].filter((r) => (r.status === 'requested' || r.status === 'verified') && r.expires_at < nowIso).map((r) => ({ id: r.id })) };
          }
          return { results: [] };
        },
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
            if (sql.startsWith('SELECT step, appt_type')) return ctx.state[args[0]] ?? null;
            if (sql.startsWith('SELECT request_id FROM booking_slot_claims WHERE clinic_id = 1 AND date = ?')) {
              for (const [k, v] of claims) {
                const [, d, t] = k.split('|');
                if (d === args[0] && t === args[1] && v.request === args[2] && !v.event) return { request_id: v.request };
              }
              return null;
            }
            if (sql.startsWith('SELECT * FROM booking_requests WHERE id = ?')) return ctx.requests.get(args[0]) ?? null;
            if (sql.startsWith('SELECT status, expires_at, date, time FROM booking_requests WHERE id = ?')) return ctx.requests.get(args[0]) ?? null;
            if (sql.includes('FROM booking_requests WHERE calendar_event_id = ?')) {
              for (const r of ctx.requests.values()) if (r.calendar_event_id === args[0]) return { id: r.id };
              return null;
            }
            if (sql.includes('FROM appointments WHERE clinic_id = 1 AND notes LIKE ?')) {
              const marker = String(args[0]).replace(/%/g, '');
              for (const a of ctx.appointments.values()) if (String(a.notes || '').includes(marker) && !a.deleted_at) return { id: a.id };
              return null;
            }
            if (sql.includes('FROM patients WHERE clinic_id = ? AND phone = ?')) {
              for (const p of ctx.patients.values()) if (p.phone === args[1]) return { id: p.id };
              return null;
            }
            if (sql.includes('FROM therapists WHERE clinic_id = ?')) {
              return { id: 1 };
            }
            if (sql.includes('FROM calendar_auth')) {
              return { access_token: 'tok-test', refresh_token: 'refresh-test', expires_at: new Date(Date.now() + 3600 * 1000).toISOString() };
            }
            if (sql.includes("status = 'cancelled'") && sql.includes('COUNT(*)')) {
              let c = 0;
              for (const r of ctx.requests.values()) {
                if (r.status === 'cancelled' && (r.phone_hash === args[0] || r.email_hash === args[1])) c++;
              }
              return { c };
            }
            if (sql.includes('FROM booking_requests WHERE session_id = ?')) {
              let c = 0;
              for (const r of ctx.requests.values()) if (r.session_id === args[0]) c++;
              return { c };
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
            if (sql.startsWith('UPDATE booking_requests')) { applySet(ctx.requests, sql, args); return { meta: { changes: 1 } }; }
            if (sql.startsWith('INSERT INTO patients')) {
              const id = ++ctx.patientSeq;
              ctx.patients.set(id, { id, clinic_id: args[0], name: args[1], phone: args[2], email: args[3], birthdate: args[4] });
              return { meta: { last_row_id: id } };
            }
            if (sql.startsWith('INSERT INTO appointments')) {
              const id = ++ctx.apptSeq;
              ctx.appointments.set(id, { id, clinic_id: args[0], patient_id: args[1], therapist_id: args[2], date: args[3], time: args[4], duration: args[5], notes: args[6], lead_id: args[7], type: args[8], status: 'scheduled', deleted_at: null });
              return { meta: { last_row_id: id } };
            }
            if (sql.startsWith("UPDATE appointments SET status = 'cancelled'")) {
              const marker = String(args[0]).replace(/%/g, '');
              let changed = 0;
              for (const a of ctx.appointments.values()) {
                if (String(a.notes || '').includes(marker) && a.status === 'scheduled' && !a.deleted_at) { a.status = 'cancelled'; changed++; }
              }
              return { meta: { changes: changed } };
            }
            if (sql.startsWith('INSERT INTO booking_slot_claims')) {
              const key = `1|${args[0]}|${args[1]}`;
              if (claims.has(key)) throw new Error('UNIQUE constraint failed');
              claims.set(key, { session: args[2], request: args[3] ?? null, event: null });
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
            if (sql.startsWith('DELETE FROM booking_slot_claims WHERE clinic_id = 1 AND date = ?')) {
              claims.delete(`1|${args[0]}|${args[1]}`);
            }
            if (sql.startsWith('UPDATE booking_slot_claims SET event_id = ?')) {
              for (const [k, v] of claims) {
                const [, d, t] = k.split('|');
                if (d === args[1] && t === args[2] && v.session === args[3]) v.event = args[0];
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
            if (sql.includes('DISTINCT patient_name')) {
              const seen = new Set<string>();
              for (const r of ctx.requests.values()) if (r.phone_hash === args[0]) seen.add(r.patient_name);
              return { results: [...seen].map((patient_name) => ({ patient_name })) };
            }
            if (sql.includes("FROM booking_requests WHERE clinic_id = 1 AND (phone_hash = ? OR email_hash = ?)")) {
              return { results: [...ctx.requests.values()].filter((r) => (r.phone_hash === args[0] || r.email_hash === args[1]) && ['requested', 'verified', 'confirmed'].includes(r.status)) };
            }
            if (sql.includes("status IN ('requested', 'verified') AND expires_at")) {
              const nowIso = new Date().toISOString();
              return { results: [...ctx.requests.values()].filter((r) => (r.status === 'requested' || r.status === 'verified') && r.expires_at < nowIso).map((r) => ({ id: r.id })) };
            }
            if (sql.includes('FROM booking_requests')) return { results: [...ctx.requests.values()] };
            return { results: [] };
          },
        }),
      }),
    },
  };
  const fakeFetch = async (url: any, init: any = {}) => {
    const u = String(url);
    const method = (init?.method || 'GET').toUpperCase();
    const json = async () => {
      if (method === 'POST' && u.endsWith('/calendars/primary/events')) {
        const body = JSON.parse(init.body as string);
        ctx.posts.push({ url: u, body });
        return { id: 'evt-int-001', htmlLink: 'https://calendar.google.com/event?eid=int' };
      }
      if (method === 'GET' && /\/events\/[^?]+$/.test(u)) {
        const last = ctx.posts[ctx.posts.length - 1]?.body;
        return { id: 'evt-int-001', status: 'confirmed', summary: 'Cita', start: { dateTime: last?.start?.dateTime }, end: { dateTime: last?.end?.dateTime } };
      }
      return { items: ctx.dayItems };
    };
    return { status: method === 'POST' ? 201 : 200, ok: true, json };
  };
  vi.stubGlobal('fetch', fakeFetch);
  return ctx;
}

async function verifiedReq(ctx: Ctx, o: { name: string; email: string; phone: string; date: string; time: string; sid?: string }) {
  const c = await createBookingRequest(ctx.env, {
    sessionId: o.sid || 's-i', ip: '127.0.0.1', apptType: 'TMS', modality: 'presencial',
    date: o.date, time: o.time, name: o.name, email: o.email, phone: o.phone,
  });
  expect(c.ok).toBe(true);
  if (!c.ok) { throw new Error('create failed: ' + JSON.stringify(c)); }
  const v = await verifyBookingRequest(ctx.env, c.request.id);
  expect(v.ok).toBe(true);
  return c.request.id;
}

describe('identidad de contacto', () => {
  it('normalizePhoneMX acepta formatos MX y rechaza inválidos', () => {
    expect(normalizePhoneMX('2311442941')).toBe('2311442941');
    expect(normalizePhoneMX('+52 231 144 2941')).toBe('2311442941');
    expect(normalizePhoneMX('52-231-144-2941')).toBe('2311442941');
    expect(normalizePhoneMX('(231) 144-2941')).toBe('2311442941');
    expect(normalizePhoneMX('12345')).toBeNull();
    expect(normalizePhoneMX('23114429410')).toBeNull();
    expect(normalizePhoneMX('')).toBeNull();
  });

  it('extractPhone encuentra teléfono y no confunde fechas/horas', () => {
    expect(extractPhone('María — maria@x.com — 2311442941')).toBe('2311442941');
    expect(extractPhone('mi cel +52 231 144 2941')).toBe('2311442941');
    expect(extractPhone('el 16 de septiembre 10:00')).toBeNull();
    expect(extractPhone('Ana Prueba')).toBeNull();
    expect(extractPhone('19/09/2026')).toBeNull();
  });
});

describe('ciclo de vida solicitud -> verificacion -> confirmacion -> cita', () => {
  let ctx: Ctx;
  let date: string;
  beforeEach(() => {
    vi.unstubAllGlobals();
    ctx = makeCtx();
    date = nextWorkday();
  });

  it('flujo completo: hold excluye slot, confirm crea 1 evento', async () => {
    const c = await createBookingRequest(ctx.env, {
      sessionId: 's-life', ip: '127.0.0.1', apptType: 'TMS', modality: 'presencial',
      date, time: '10:00', name: 'Vida Plena', email: 'vida@example.com', phone: '2311442901',
    });
    expect(c.ok).toBe(true);
    expect(c.request.status).toBe('requested');
    // Hold vivo: el slot ya no se ofrece.
    const av = await getAvailableSlots(ctx.env, date);
    expect(av.ok).toBe(true);
    expect((av.slots || []).some((s) => s.time === '10:00')).toBe(false);
    const v = await verifyBookingRequest(ctx.env, c.request.id);
    expect(v.ok).toBe(true);
    const created = await createBookingEvent(ctx.env, {
      date, time: '10:00', apptType: 'TMS', modality: 'presencial',
      name: 'Vida Plena', email: 'vida@example.com', phone: '2311442901', sessionId: 's-life', requestId: c.request.id,
    });
    expect(created.ok).toBe(true);
    expect(ctx.posts).toHaveLength(1);
    expect(ctx.requests.get(c.request.id).status).toBe('confirmed');
    expect(ctx.requests.get(c.request.id).calendar_event_id).toBe('evt-int-001');
  });

  it('gate: sin request o sin verificar NO hay evento ni POST', async () => {
    const noReq = await createBookingEvent(ctx.env, {
      date, time: '11:00', apptType: 'TMS', modality: 'presencial',
      name: 'Ana', email: 'a@x.com', sessionId: 's-g', requestId: 424242,
    });
    expect(noReq.ok).toBe(false);
    const c = await createBookingRequest(ctx.env, {
      sessionId: 's-g2', ip: '127.0.0.1', apptType: 'TMS', modality: 'presencial',
      date, time: '11:00', name: 'Beto', email: 'b@x.com', phone: '2311442902',
    });
    expect(c.ok).toBe(true);
    if (!c.ok) throw new Error('create failed');
    const unv = await createBookingEvent(ctx.env, {
      date, time: '11:00', apptType: 'TMS', modality: 'presencial',
      name: 'Beto', email: 'b@x.com', sessionId: 's-g2', requestId: c.request.id,
    });
    expect(unv.ok).toBe(false);
    expect(unv.code).toBe('not_verified');
    expect(ctx.posts).toHaveLength(0);
  });

  it('1 pendiente + 1 activa por identidad', async () => {
    const id1 = await verifiedReq(ctx, { name: 'Uno', email: 'uno@x.com', phone: '2311442911', date, time: '09:00', sid: 's-a1' });
    // Segunda pendiente misma identidad -> bloqueada.
    const dup = await createBookingRequest(ctx.env, {
      sessionId: 's-a2', ip: '127.0.0.2', apptType: 'TMS', modality: 'presencial',
      date, time: '11:00', name: 'Uno', email: 'uno@x.com', phone: '2311442911',
    });
    expect(dup.ok).toBe(false);
    // Confirmo la primera -> ahora hay 1 activa: otra solicitud -> bloqueada.
    const created = await createBookingEvent(ctx.env, {
      date, time: '09:00', apptType: 'TMS', modality: 'presencial',
      name: 'Uno', email: 'uno@x.com', phone: '2311442911', sessionId: 's-a1', requestId: id1,
    });
    expect(created.ok).toBe(true);
    const third = await createBookingRequest(ctx.env, {
      sessionId: 's-a3', ip: '127.0.0.3', apptType: 'TMS', modality: 'presencial',
      date, time: '12:00', name: 'Uno', email: 'uno@x.com', phone: '2311442911',
    });
    expect(third.ok).toBe(false);
  });

  it('hold expirado libera el slot (lazy expiry sin sweeper)', async () => {
    const c = await createBookingRequest(ctx.env, {
      sessionId: 's-exp', ip: '127.0.0.1', apptType: 'TMS', modality: 'presencial',
      date, time: '13:00', name: 'Expira', email: 'exp@x.com', phone: '2311442922',
    });
    expect(c.ok).toBe(true);
    if (!c.ok) throw new Error('create failed');
    let av = await getAvailableSlots(ctx.env, date);
    expect((av.slots || []).some((s) => s.time === '13:00')).toBe(false);
    // Envejece la solicitud: el hold muere con ella.
    ctx.requests.get(c.request.id).expires_at = new Date(Date.now() - 60000).toISOString();
    av = await getAvailableSlots(ctx.env, date);
    expect((av.slots || []).some((s) => s.time === '13:00')).toBe(true);
    const v = await verifyBookingRequest(ctx.env, c.request.id);
    expect(v.ok).toBe(false);
  });

  it('sweeper expira pendientes y purga holds', async () => {
    const c = await createBookingRequest(ctx.env, {
      sessionId: 's-sw', ip: '127.0.0.1', apptType: 'TMS', modality: 'presencial',
      date, time: '15:00', name: 'Sweep', email: 'sw@x.com', phone: '2311442933',
    });
    expect(c.ok).toBe(true);
    if (!c.ok) throw new Error('create failed');
    ctx.requests.get(c.request.id).expires_at = new Date(Date.now() - 60000).toISOString();
    const swept = await sweepBookingRequests(ctx.env);
    expect(swept.expired).toBe(1);
    expect(ctx.requests.get(c.request.id).status).toBe('expired');
    const av = await getAvailableSlots(ctx.env, date);
    expect((av.slots || []).some((s) => s.time === '15:00')).toBe(true);
  });

  it('velocity de nombres -> flagged y sin auto-confirmación', async () => {
    const mk = (name: string, sid: string, slot: string) => createBookingRequest(ctx.env, {
      sessionId: sid, ip: '127.0.0.1', apptType: 'TMS', modality: 'presencial',
      date, time: slot, name, email: `${sid}@x.com`, phone: '2311442944',
    });
    const r1 = await mk('Nombre Uno', 's-f1', '09:00');
    expect(r1.ok).toBe(true);
    await cancelBookingRequest(ctx.env, (r1 as { ok: true; request: { id: number } }).request.id);
    const r2 = await mk('Nombre Dos', 's-f2', '10:00');
    expect(r2.ok).toBe(true);
    await cancelBookingRequest(ctx.env, (r2 as { ok: true; request: { id: number } }).request.id);
    const r3 = await mk('Nombre Tres', 's-f3', '11:00');
    expect(r3.ok).toBe(false);
    expect((r3 as { code?: string }).code).toBe('flagged');
  });

  it('ráfaga por sesión: 5 solicitudes ok, la 6ta bloqueada', async () => {
    const slots = ['09:00', '10:00', '11:00', '12:00', '13:00'];
    for (let i = 0; i < slots.length; i++) {
      const r = await createBookingRequest(ctx.env, {
        sessionId: 's-burst', ip: '127.0.0.1', apptType: 'TMS', modality: 'presencial',
        date, time: slots[i], name: `Burst Persona ${i}`, email: `burst${i}@x.com`, phone: `23114429${String(50 + i).padStart(2, '0')}`,
      });
      expect(r.ok).toBe(true);
    }
    const sixth = await createBookingRequest(ctx.env, {
      sessionId: 's-burst', ip: '127.0.0.1', apptType: 'TMS', modality: 'presencial',
      date, time: '15:00', name: 'Burst Seis', email: 'burst6@x.com', phone: '2311442956',
    });
    expect(sixth.ok).toBe(false);
    expect((sixth as { code?: string }).code).toBe('identity_limit');
  });

  it('domingo se rechaza en solicitud (días Lun–Sáb)', async () => {
    const sunday = (() => {
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' });
      const d = new Date(Date.now() + 24 * 3600 * 1000);
      for (let i = 0; i < 10; i++) {
        const s = fmt.format(d);
        if (new Date(s + 'T12:00:00Z').getUTCDay() === 0) return s;
        d.setUTCDate(d.getUTCDate() + 1);
      }
      throw new Error('sin domingo futuro');
    })();
    const r = await createBookingRequest(ctx.env, {
      sessionId: 's-dom', ip: '127.0.0.1', apptType: 'TMS', modality: 'presencial',
      date: sunday, time: '10:00', name: 'Domingo Test', email: 'domingo@x.com', phone: '2311442998',
    });
    expect(r.ok).toBe(false);
  });

  it('mover hold a slot libre ok; a slot ocupado falla y conserva anterior', async () => {
    const id = await verifiedReq(ctx, { name: 'Mueve', email: 'mueve@x.com', phone: '2311442955', date, time: '09:00', sid: 's-mv' });
    const other = await verifiedReq(ctx, { name: 'Segunda Persona', email: 'otro@x.com', phone: '2311442966', date, time: '11:00', sid: 's-mv2' });
    void other;
    const bad = await updateBookingRequestSlot(ctx.env, id, date, '11:00');
    expect(bad.ok).toBe(false);
    expect(ctx.requests.get(id).time).toBe('09:00');
    const good = await updateBookingRequestSlot(ctx.env, id, date, '12:00');
    expect(good.ok).toBe(true);
    expect(ctx.requests.get(id).time).toBe('12:00');
    const av = await getAvailableSlots(ctx.env, date);
    expect((av.slots || []).some((s) => s.time === '09:00')).toBe(true);
    expect((av.slots || []).some((s) => s.time === '12:00')).toBe(false);
  });
});

describe('API directa: pending -> confirm', () => {
  let ctx: Ctx;
  let date: string;
  beforeEach(() => {
    vi.unstubAllGlobals();
    ctx = makeCtx();
    date = nextWorkday();
  });

  function post(body: unknown) {
    return new Request('https://x/api/voice/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('POST completo crea SOLICITUD (no evento); confirm con contacto crea evento', async () => {
    const r1 = await handleCreateAppointment(ctx.env, post({
      patientName: 'Directa', email: 'directa@x.com', phone: '2311442977',
      consultationType: 'TMS', preferredDate: date, preferredTime: '10:00',
      timezone: 'America/Mexico_City', modality: 'presencial',
    }), {});
    const j1 = await r1.json() as any;
    expect(j1.success).toBe(true);
    expect(j1.pending).toBe(true);
    expect(j1.request_id).toBeGreaterThan(0);
    expect(ctx.posts).toHaveLength(0);
    // Confirm sin contacto coincidente -> 403.
    const rBad = await handleCreateAppointment(ctx.env, post({ request_id: j1.request_id, confirm: true, email: 'otro@x.com' }), {});
    expect(rBad.status).toBe(403);
    expect(ctx.posts).toHaveLength(0);
    // Confirm correcto -> evento.
    const r2 = await handleCreateAppointment(ctx.env, post({ request_id: j1.request_id, confirm: true, email: 'directa@x.com' }), {});
    const j2 = await r2.json() as any;
    expect(j2.success).toBe(true);
    expect(j2.eventId).toBe('evt-int-001');
    expect(ctx.posts).toHaveLength(1);
  });

  it('segunda pendiente misma identidad -> 429 sin evento', async () => {
    const base = {
      patientName: 'Dup', email: 'dup@x.com', phone: '2311442988',
      consultationType: 'TMS', preferredDate: date, timezone: 'America/Mexico_City', modality: 'presencial',
    };
    const r1 = await handleCreateAppointment(ctx.env, post({ ...base, preferredTime: '09:00' }), {});
    expect((await r1.json() as any).success).toBe(true);
    const r2 = await handleCreateAppointment(ctx.env, post({ ...base, preferredTime: '11:00' }), {});
    const j2 = await r2.json() as any;
    expect(j2.success).toBe(false);
    expect(ctx.posts).toHaveLength(0);
  });

  it('teléfono inválido -> 400', async () => {
    const r = await handleCreateAppointment(ctx.env, post({
      patientName: 'Malo', email: 'malo@x.com', phone: '123',
      consultationType: 'TMS', preferredDate: date, preferredTime: '10:00',
      timezone: 'America/Mexico_City', modality: 'presencial',
    }), {});
    expect(r.status).toBe(400);
  });
});

describe('chat exige teléfono y crea solicitud', () => {
  let ctx: Ctx;
  let date: string;
  beforeEach(() => {
    vi.unstubAllGlobals();
    ctx = makeCtx();
    date = nextWorkday();
  });

  function ddmmyyyy(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  it('nombre+correo sin teléfono -> pide teléfono; con teléfono -> solicitud', async () => {
    const sid = 's-chat-tel';
    await handleBookingTurn(ctx.env, sid, 'quiero agendar tms', '127.0.0.1');
    await handleBookingTurn(ctx.env, sid, ddmmyyyy(date), '127.0.0.1');
    await handleBookingTurn(ctx.env, sid, '10:00', '127.0.0.1');
    const r1 = await handleBookingTurn(ctx.env, sid, 'Chat Tel — chattel@x.com', '127.0.0.1');
    expect(r1.reply || '').toMatch(/teléfono/i);
    expect(ctx.state[sid].step).toBe('need_contact');
    const r2 = await handleBookingTurn(ctx.env, sid, '2311442999', '127.0.0.1');
    expect(r2.reply || '').toMatch(/confirma/i);
    expect(ctx.state[sid].step).toBe('need_confirm');
    expect(ctx.state[sid].request_id).toBeGreaterThan(0);
    const done = await handleBookingTurn(ctx.env, sid, 'sí, confirmo', '127.0.0.1');
    expect(done.eventId).toBe('evt-int-001');
  });
});

// Reserva del chat -> agenda administrativa (/api/appointments).
// Regresión: antes la confirmación solo tocaba booking_requests + Calendar y la
// cita NUNCA aparecía en el panel de la clínica.
describe('proyección a agenda administrativa (appointments)', () => {
  let ctx: Ctx;
  let date: string;
  beforeEach(() => {
    vi.unstubAllGlobals();
    ctx = makeCtx();
    date = nextWorkday();
  });

  it('confirmación crea LA cita en appointments (1 sola) con paciente, terapeuta y marker', async () => {
    const id = await verifiedReq(ctx, { name: 'Agenda Clara', email: 'agenda@x.com', phone: '2311442990', date, time: '12:00', sid: 's-ag' });
    const r = await createBookingEvent(ctx.env, {
      date, time: '12:00', apptType: 'TMS', modality: 'presencial',
      name: 'Agenda Clara', email: 'agenda@x.com', phone: '2311442990', sessionId: 's-ag', requestId: id,
    });
    expect(r.ok).toBe(true);
    expect(r.agendaSynced).toBe(true);
    expect(ctx.appointments.size).toBe(1);
    const appt = [...ctx.appointments.values()][0];
    expect(appt.date).toBe(date);
    expect(appt.time).toBe('12:00');
    expect(appt.status).toBe('scheduled');
    expect(appt.type).toBe('TMS');
    expect(appt.duration).toBe(CLINIC_SCHEDULE.durationMin);
    expect(appt.therapist_id).toBe(1);
    expect(appt.notes).toContain(`[booking_request:${id}]`);
    expect(appt.notes).toContain('eventId:evt-int-001');
    // Paciente creado con teléfono real (patients.phone es NOT NULL).
    const patient = [...ctx.patients.values()].find((p) => p.id === appt.patient_id);
    expect(patient.phone).toBe('2311442990');
    expect(patient.name).toBe('Agenda Clara');
  });

  it('reutiliza paciente existente por teléfono (no duplica la ficha)', async () => {
    const existingPatientId = ++ctx.patientSeq;
    ctx.patients.set(existingPatientId, { id: existingPatientId, clinic_id: 1, name: 'Previo', phone: '2311442991', email: null, birthdate: null });
    const id = await verifiedReq(ctx, { name: 'Previo', email: 'previo@x.com', phone: '2311442991', date, time: '13:00', sid: 's-re' });
    const r = await createBookingEvent(ctx.env, {
      date, time: '13:00', apptType: 'TMS', modality: 'presencial',
      name: 'Previo', email: 'previo@x.com', phone: '2311442991', sessionId: 's-re', requestId: id,
    });
    expect(r.ok).toBe(true);
    expect(r.agendaSynced).toBe(true);
    expect(ctx.patients.size).toBe(1);
    expect([...ctx.appointments.values()][0].patient_id).toBe(existingPatientId);
  });

  it('sync idempotente: marker [booking_request:N] existente NO duplica la cita', async () => {
    const req: any = { id: 777, date, time: '15:00' };
    ctx.appointments.set(1, {
      id: 1, clinic_id: 1, patient_id: 1, therapist_id: 1, date, time: '15:00', duration: 50,
      notes: 'Chat TMS · [booking_request:777] · eventId:evt-prev', lead_id: null, type: 'TMS', status: 'scheduled', deleted_at: null,
    });
    await syncAppointmentFromBooking(ctx.env, req, { name: 'X', phone: '2311442992', email: 'x@x.com', apptType: 'TMS', modality: 'presencial', eventId: 'evt-nuevo' });
    expect(ctx.appointments.size).toBe(1);
    expect([...ctx.appointments.values()][0].notes).toContain('evt-prev');
  });

  it('cancelRequestByEvent cancela también la cita proyectada (sin huérfanas)', async () => {
    const id = await verifiedReq(ctx, { name: 'Cancel Uno', email: 'cancel@x.com', phone: '2311442993', date, time: '16:00', sid: 's-cc' });
    const r = await createBookingEvent(ctx.env, {
      date, time: '16:00', apptType: 'TMS', modality: 'presencial',
      name: 'Cancel Uno', email: 'cancel@x.com', phone: '2311442993', sessionId: 's-cc', requestId: id,
    });
    expect(r.ok).toBe(true);
    expect([...ctx.appointments.values()][0].status).toBe('scheduled');
    await cancelRequestByEvent(ctx.env, 'evt-int-001');
    expect(ctx.requests.get(id).status).toBe('cancelled');
    expect([...ctx.appointments.values()][0].status).toBe('cancelled');
  });

  it('booking sin teléfono -> error EXPLÍCITO (patients.phone NOT NULL), no fallback silencioso', async () => {
    const req: any = { id: 778, date, time: '17:00' };
    await expect(
      syncAppointmentFromBooking(ctx.env, req, { name: 'Sin Tel', phone: '', email: 's@x.com', apptType: 'TMS', modality: 'presencial', eventId: 'evt-z' })
    ).rejects.toThrow(/patients\.phone/i);
    expect(ctx.appointments.size).toBe(0);
  });
});
