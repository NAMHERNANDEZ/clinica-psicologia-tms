import type { Env } from '../../types';
import { getAccessTokenFromDB } from '../../lib/calendar-oauth';
// Fuente canónica ÚNICA de precios (definida en lib/ai-secretary.ts).
import { TMS_PRICE_MESSAGE, THERAPY_PRICE_MESSAGE, PRICING_BOTH_MESSAGE } from '../../lib/ai-secretary';
// Detector de crisis tolerante (una sola fuente de verdad, sin duplicar).
import { assessSafety } from '../../ai/services/safety-router';

// Agendamiento REAL Chat TMS — Google Calendar como fuente de verdad.
// Sin horarios inventados: los slots derivan de la ventana de atención
// menos los eventos REALES del calendario. Sin datos clínicos en eventos.

// Configuración de agenda de la clínica (validar con la clínica).
// Zona horaria: America/Mexico_City.
export const CLINIC_TZ = 'America/Mexico_City';
export const CLINIC_SCHEDULE = {
  days: [1, 2, 3, 4, 5, 6] as number[], // Lun–Sáb (0=Dom)
  startHour: 9,
  endHour: 19,
  durationMin: 50,
  bufferMin: 10,
  maxPerDay: 8,
  leadMin: 60, // antelación mínima para reservar hoy
};

export const BOOKING_TYPES = [
  'Valoración inicial',
  'Consulta de seguimiento',
  'TMS',
  'Psicología',
  'Pareja/familiar',
  'Otro',
];

// Integridad anti-abuso (2026-09-14): solicitud -> verificacion -> confirmacion -> cita.
// Sin solicitud verificada+confirmada NO hay evento Calendar (gate en backend).
export const PENDING_HOLD_MIN = 15; // TTL del hold de horario (minutos)
export const MAX_PENDING_PER_IDENTITY = 1; // 1 solicitud pendiente por identidad
export const MAX_ACTIVE_PER_IDENTITY = 1; // 1 cita activa por identidad
export const MAX_REQUESTS_PER_SESSION_DAY = 5; // solicitudes por sesión/día
export const FLAG_NAME_VELOCITY = 3; // N nombres distintos mismo teléfono/7d -> revisión
export const FLAG_CANCEL_VELOCITY = 3; // N cancelaciones misma identidad/7d -> revisión

export interface Slot { date: string; time: string; }
export interface BookingResult {
  ok: boolean;
  slots?: Slot[];
  eventId?: string;
  eventLink?: string;
  error?: string;
  code?: string;
}

const GCAL = 'https://www.googleapis.com/calendar/v3';

async function gcal(env: Env, path: string, init?: RequestInit): Promise<{ status: number; data: any }> {
  const token = await getAccessTokenFromDB(env, 1);
  if (!token) return { status: 401, data: { error: 'CALENDAR_NOT_AUTHORIZED' } };
  const res = await fetch(`${GCAL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function clinicToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return parts; // YYYY-MM-DD
}

function clinicNowMinutes(): number {
  const s = new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function toTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

function weekdayOf(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00Z').getUTCDay();
}

export async function listDayEvents(env: Env, dateStr: string): Promise<{ events: Array<{ start: string; end: string; id: string }>; error?: string; code?: string }> {
  const timeMin = encodeURIComponent(`${dateStr}T00:00:00-06:00`);
  const timeMax = encodeURIComponent(`${dateStr}T23:59:59-06:00`);
  const { status, data } = await gcal(env, `/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${timeMin}&timeMax=${timeMax}&timeZone=${encodeURIComponent(CLINIC_TZ)}`);
  if (status === 401) return { events: [], error: 'Calendario no conectado. Se requiere autorización.', code: 'CALENDAR_NOT_AUTHORIZED' };
  if (status !== 200) return { events: [], error: 'No pude consultar la agenda en este momento.', code: 'CALENDAR_UNAVAILABLE' };
  const events = ((data as any)?.items || [])
    .filter((e: any) => e?.status !== 'cancelled' && (e?.start?.dateTime || e?.start?.date))
    .map((e: any) => ({ start: e.start.dateTime || e.start.date, end: e.end?.dateTime || e.end?.date || e.start.dateTime, id: e.id }));
  return { events };
}

export async function getAvailableSlots(env: Env, dateStr: string): Promise<BookingResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return { ok: false, error: 'Fecha inválida.', code: 'invalid_request' };
  if (dateStr < clinicToday()) return { ok: false, error: 'Esa fecha ya pasó. Elige un día futuro.', code: 'invalid_request' };
  if (!CLINIC_SCHEDULE.days.includes(weekdayOf(dateStr))) {
    return { ok: false, error: 'Ese día no hay atención (Lun–Sáb). Elige otro día.', code: 'no_availability' };
  }
  const { events, error, code } = await listDayEvents(env, dateStr);
  if (error) return { ok: false, error, code };
  if (events.length >= CLINIC_SCHEDULE.maxPerDay) {
    return { ok: false, error: 'Ese día ya está completo. Elige otro día.', code: 'no_availability' };
  }
  // Holds vivos (solicitudes pendientes no expiradas) también ocupan horario.
  const held = await liveHeldTimes(env, dateStr, Date.now());
  const step = CLINIC_SCHEDULE.durationMin + CLINIC_SCHEDULE.bufferMin;
  const isToday = dateStr === clinicToday();
  const nowMin = clinicNowMinutes() + CLINIC_SCHEDULE.leadMin;
  const slots: Slot[] = [];
  for (let start = CLINIC_SCHEDULE.startHour * 60; start + CLINIC_SCHEDULE.durationMin <= CLINIC_SCHEDULE.endHour * 60; start += step) {
    const end = start + CLINIC_SCHEDULE.durationMin + CLINIC_SCHEDULE.bufferMin;
    if (isToday && start <= nowMin) continue;
    const t = toTime(start);
    if (held.has(t)) continue;
    if (slotOverlapsEvents(events, dateStr, t, end - start)) continue;
    slots.push({ date: dateStr, time: t });
  }
  if (!slots.length) return { ok: false, error: 'No hay horarios libres ese día. Puedo buscar otro día.', code: 'no_availability' };
  return { ok: true, slots };
}

export function slotOverlapsEvents(events: Array<{ start: string; end: string }>, dateStr: string, timeStr: string, spanMin = CLINIC_SCHEDULE.durationMin + CLINIC_SCHEDULE.bufferMin): boolean {
  const slotS = new Date(`${dateStr}T${timeStr}:00-06:00`).getTime();
  const slotE = slotS + spanMin * 60000;
  return events.some((e) => {
    const s = new Date(e.start).getTime();
    const en = new Date(e.end).getTime();
    return s < slotE && en > slotS;
  });
}

export async function isSlotFree(env: Env, dateStr: string, timeStr: string): Promise<boolean> {
  const r = await getAvailableSlots(env, dateStr);
  if (!r.ok || !r.slots) return false;
  return r.slots.some((s) => s.time === timeStr);
}

function eventTitle(type: string): string {
  return `Cita — Neurociencia Clínica`;
}

// Saneamiento anti HTML/script injection: los campos libres nunca llegan con
// etiquetas a Google Calendar (su UI y nuestro frontend escapan, pero el
// almacén no debe guardar HTML activo).
export function stripTags(s: string): string {
  return (s || '')
    .replace(/<script[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function createBookingEvent(env: Env, input: {
  date: string; time: string; apptType: string; modality: string; name: string; email?: string; phone?: string; sessionId?: string; requestId: number;
}): Promise<BookingResult> {
  // GATE ANTI-ABUSO: ninguna llamada directa puede saltarse la máquina de
  // estados. Sin solicitud verificada+vigente NO hay evento Calendar.
  if (!input.requestId) {
    return { ok: false, error: 'Se requiere una solicitud de reserva verificada.', code: 'not_verified' };
  }
  const req = await getBookingRequest(env, input.requestId);
  if (!req) {
    return { ok: false, error: 'Solicitud no encontrada.', code: 'invalid_request' };
  }
  if (input.sessionId && req.session_id && !input.sessionId.startsWith('direct-') && req.session_id !== input.sessionId) {
    return { ok: false, error: 'Esta solicitud pertenece a otra conversación.', code: 'invalid_request' };
  }
  const nowIso = new Date().toISOString();
  if (req.status === 'flagged') {
    return { ok: false, error: 'Esta solicitud está en revisión manual.', code: 'flagged' };
  }
  if (req.status === 'expired' || req.expires_at <= nowIso) {
    await expireBookingRequest(env, req.id);
    return { ok: false, error: 'Tu solicitud venció (15 minutos). Pide el horario nuevamente.', code: 'expired' };
  }
  if (req.status !== 'verified') {
    return { ok: false, error: 'La solicitud debe verificarse antes de confirmar la cita.', code: 'not_verified' };
  }
  // Saneamiento primero; validación después sobre valores ya limpios.
  const date = (input.date || '').trim();
  const time = (input.time || '').trim();
  if (req.date !== date || req.time !== time) {
    return { ok: false, error: 'El horario cambió. Revisa la disponibilidad nuevamente.', code: 'slot_changed' };
  }
  const apptType = stripTags(input.apptType || '').slice(0, 60) || 'Otro';
  const modality = stripTags(input.modality || '').slice(0, 30);
  const name = stripTags(input.name || '').slice(0, 80);
  const email = (input.email || '').trim();
  const phone = stripTags(input.phone || '').slice(0, 30);
  // Puerta de blindaje ANTES de cualquier llamada a Google: fecha/hora válidas,
  // nombre real (nunca hora/fecha/email/modalidad), timezone y duración fijos.
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= clinicToday();
  const timeOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  if (!dateOk || !timeOk) {
    return { ok: false, error: 'Fecha u horario inválidos. Elige otro.', code: 'invalid_request' };
  }
  if (!isPlausiblePatientName(name)) {
    return { ok: false, error: 'Necesito el nombre real del paciente para crear la cita.', code: 'invalid_contact' };
  }
  const emailOk = !email || !!extractEmail(email);
  // Recheck obligatorio inmediatamente antes de crear (anti doble reserva).
  // El propio hold no bloquea: se excluye por requestId.
  if (await slotBlockedByOthers(env, date, time, req.id)) {
    const alt = await getAvailableSlots(env, date);
    return { ok: false, error: 'Ese horario acaba de ocuparse. Elige otro.', code: 'slot_taken', slots: alt.slots };
  }
  // Revalidación de identidad: otra confirmación pudo completarse en medio.
  // (El propio pendiente se excluye del conteo.)
  if (req.phone_hash && req.email_hash) {
    const caps = await checkIdentityCaps(env, req.phone_hash, req.email_hash, req.id);
    if (!caps.ok) return { ok: false, error: caps.error, code: caps.code };
  }
  // Claim atómico: ante POSTs simultáneos solo uno gana el slot.
  // Si el hold propio ya lo ocupa, se reutiliza (re-insertar chocaría).
  const claimOwner = (input.sessionId || `direct-${date}-${time}`).slice(0, 80);
  const hasOwnHold = await ownLiveHold(env, req.id, date, time);
  const claimed = hasOwnHold ? true : await claimSlot(env, date, time, claimOwner, req.id);
  if (!claimed) {
    const alt = await getAvailableSlots(env, date);
    return { ok: false, error: 'Ese horario acaba de ocuparse. Elige otro.', code: 'slot_taken', slots: alt.slots };
  }
  // Flip atómico verified -> confirmed (doble confirmación simultánea: 1 gana).
  if (!await flipToConfirmed(env, req.id)) {
    return { ok: false, error: 'Esta solicitud ya fue procesada.', code: 'slot_taken' };
  }
  const start = `${date}T${time}:00`;
  const endMin = toMin(time) + CLINIC_SCHEDULE.durationMin;
  const end = `${date}T${toTime(endMin)}:00`;
  const lines = [
    `Tipo: ${apptType}`,
    `Modalidad: ${modality}`,
    `Paciente: ${name}`,
  ];
  if (phone) lines.push(`Teléfono: ${phone}`);
  lines.push('Cita solicitada mediante Chat TMS.');
  const body: any = {
    summary: eventTitle(apptType),
    description: lines.join('\n'),
    start: { dateTime: start, timeZone: CLINIC_TZ },
    end: { dateTime: end, timeZone: CLINIC_TZ },
    reminders: { useDefault: true },
  };
  if (emailOk && email) body.attendees = [{ email }];
  const { status, data } = await gcal(env, '/calendars/primary/events', { method: 'POST', body: JSON.stringify(body) });
  if (status === 401) {
    await revertToVerified(env, req.id);
    await releaseSlot(env, date, time, claimOwner);
    return { ok: false, error: 'Calendario no conectado.', code: 'CALENDAR_NOT_AUTHORIZED' };
  }
  if (status !== 200 && status !== 201) {
    await revertToVerified(env, req.id);
    await releaseSlot(env, date, time, claimOwner);
    return { ok: false, error: 'No pude crear la cita en este momento.', code: 'CALENDAR_UNAVAILABLE' };
  }
  if (!data?.id) {
    await revertToVerified(env, req.id);
    await releaseSlot(env, date, time, claimOwner);
    return { ok: false, error: 'Respuesta inesperada del calendario.', code: 'invalid_request' };
  }
  await bindClaimToEvent(env, date, time, claimOwner, data.id as string);
  try {
    await env.DB.prepare("UPDATE booking_requests SET confirmed_at = datetime('now'), calendar_event_id = ?, updated_at = datetime('now') WHERE id = ?").bind(data.id as string, req.id).run();
  } catch (err) {
    console.error('[booking] mark confirmed error:', err);
  }
  return { ok: true, eventId: data.id as string, eventLink: data.htmlLink as string };
}

export async function verifyBookingEvent(env: Env, eventId: string): Promise<{ ok: boolean; date?: string; time?: string; summary?: string; status?: string; error?: string }> {
  const { status, data } = await gcal(env, `/calendars/primary/events/${encodeURIComponent(eventId)}`);
  if (status === 401) return { ok: false, error: 'CALENDAR_NOT_AUTHORIZED' };
  if (status === 404) return { ok: false, error: 'EVENT_NOT_FOUND' };
  if (status !== 200 || !data) return { ok: false, error: 'CALENDAR_UNAVAILABLE' };
  if (data.status === 'cancelled') return { ok: false, error: 'EVENT_CANCELLED' };
  const start: string = data.start?.dateTime || '';
  const m = start.match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return { ok: true, date: m?.[1], time: m?.[2], summary: data.summary, status: data.status };
}

export async function cancelBookingEvent(env: Env, eventId: string): Promise<{ ok: boolean; error?: string; code?: string }> {
  const { status } = await gcal(env, `/calendars/primary/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
  if (status === 401) return { ok: false, error: 'Calendario no conectado.', code: 'CALENDAR_NOT_AUTHORIZED' };
  if (status === 404) return { ok: false, error: 'Esa cita ya no existe.', code: 'not_found' };
  if (status !== 204 && status !== 200) return { ok: false, error: 'No pude cancelar en este momento.', code: 'CALENDAR_UNAVAILABLE' };
  await releaseSlotByEvent(env, eventId);
  return { ok: true };
}

// ---------- Claim atómico anti-carrera (D1, UNIQUE por slot) ----------
// El recheck isSlotFree no basta ante POSTs simultáneos (ambos ven libre
// antes de que cualquiera inserte). El INSERT con PRIMARY KEY es atómico:
// máximo un ganador por (clinic_id, date, time).

export async function claimSlot(env: Env, date: string, time: string, sessionId: string, requestId?: number | null): Promise<boolean> {
  try {
    await env.DB.prepare(
      "INSERT INTO booking_slot_claims (clinic_id, date, time, session_id, request_id, created_at) VALUES (1, ?, ?, ?, ?, datetime('now'))"
    ).bind(date, time, sessionId, requestId ?? null).run();
    return true;
  } catch {
    // Conflicto: purga holds muertos y reintenta una vez.
    try {
      await purgeStaleClaims(env);
      await env.DB.prepare(
        "INSERT INTO booking_slot_claims (clinic_id, date, time, session_id, request_id, created_at) VALUES (1, ?, ?, ?, ?, datetime('now'))"
      ).bind(date, time, sessionId, requestId ?? null).run();
      return true;
    } catch {
      return false;
    }
  }
}

export async function releaseSlot(env: Env, date: string, time: string, sessionId: string): Promise<void> {
  try {
    await env.DB.prepare(
      'DELETE FROM booking_slot_claims WHERE clinic_id = 1 AND date = ? AND time = ? AND session_id = ?'
    ).bind(date, time, sessionId).run();
  } catch (err) {
    console.error('[booking] release slot error:', err);
  }
}

export async function releaseSlotByEvent(env: Env, eventId: string): Promise<void> {
  try {
    await env.DB.prepare('DELETE FROM booking_slot_claims WHERE event_id = ?').bind(eventId).run();
  } catch (err) {
    console.error('[booking] release slot by event error:', err);
  }
}

async function bindClaimToEvent(env: Env, date: string, time: string, sessionId: string, eventId: string): Promise<void> {
  try {
    await env.DB.prepare(
      'UPDATE booking_slot_claims SET event_id = ? WHERE clinic_id = 1 AND date = ? AND time = ? AND session_id = ?'
    ).bind(eventId, date, time, sessionId).run();
  } catch (err) {
    console.error('[booking] bind claim error:', err);
  }
}

export async function releaseHoldByRequest(env: Env, requestId: number): Promise<void> {
  try {
    await env.DB.prepare(
      'DELETE FROM booking_slot_claims WHERE request_id = ? AND event_id IS NULL'
    ).bind(requestId).run();
  } catch (err) {
    console.error('[booking] release hold error:', err);
  }
}

// Hold propio vivo: el claim de la solicitud ya ocupa el slot (creado al
// pedir). Confirmar NO debe re-insertarlo (chocaría con su propio PK).
export async function ownLiveHold(env: Env, requestId: number, dateStr: string, timeStr: string): Promise<boolean> {
  try {
    const row = await env.DB.prepare(
      'SELECT request_id FROM booking_slot_claims WHERE clinic_id = 1 AND date = ? AND time = ? AND request_id = ? AND event_id IS NULL'
    ).bind(dateStr, timeStr, requestId).first() as any;
    if (!row) return false;
    const req = await getBookingRequest(env, requestId);
    return !!req && isRequestLive(req, new Date().toISOString());
  } catch { return false; }
}

// Flip atómico verified -> confirmed: ante doble "sí" simultáneo solo uno
// gana (D1 lo confirma por changes). Defensa en profundidad junto al gate.
async function flipToConfirmed(env: Env, requestId: number): Promise<boolean> {
  try {
    const r = await env.DB.prepare(
      "UPDATE booking_requests SET status = 'confirmed', updated_at = datetime('now') WHERE id = ? AND status = 'verified'"
    ).bind(requestId).run() as any;
    return Number(r?.meta?.changes ?? r?.changes ?? 0) >= 1;
  } catch (err) {
    console.error('[booking] flip error:', err);
    return false;
  }
}

async function revertToVerified(env: Env, requestId: number): Promise<void> {
  try {
    await env.DB.prepare(
      "UPDATE booking_requests SET status = 'verified', updated_at = datetime('now') WHERE id = ? AND status = 'confirmed' AND calendar_event_id IS NULL"
    ).bind(requestId).run();
  } catch (err) {
    console.error('[booking] revert error:', err);
  }
}

// Purga holds muertos: legacy sin request (>15min), requests terminales o
// expiradas, y huérfanos. Los holds vivos y los eventos confirmados quedan.
export async function purgeStaleClaims(env: Env): Promise<void> {
  try {
    await env.DB.prepare(
      `DELETE FROM booking_slot_claims WHERE event_id IS NULL AND (
        (request_id IS NULL AND datetime(created_at, '+${PENDING_HOLD_MIN} minutes') < datetime('now'))
        OR (request_id IS NOT NULL AND request_id NOT IN (SELECT id FROM booking_requests))
        OR request_id IN (SELECT id FROM booking_requests WHERE status IN ('confirmed', 'cancelled', 'expired')
          OR expires_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )`
    ).run();
  } catch (err) {
    console.error('[booking] purge claims error:', err);
  }
}

export interface DayClaim { time: string; session_id: string | null; event_id: string | null; request_id: number | null; created_at: string; }

async function listDayClaims(env: Env, dateStr: string): Promise<DayClaim[]> {
  try {
    const r = await env.DB.prepare(
      'SELECT time, session_id, event_id, request_id, created_at FROM booking_slot_claims WHERE clinic_id = 1 AND date = ?'
    ).bind(dateStr).all() as any;
    return (r?.results || []) as DayClaim[];
  } catch { return []; }
}

// Holds vivos del día: evento confirmado, request pendiente verificada sin
// expirar, o claim legacy reciente (compatibilidad, 10 min).
export async function liveHeldTimes(env: Env, dateStr: string, nowMs = Date.now()): Promise<Set<string>> {
  const held = new Set<string>();
  const claims = await listDayClaims(env, dateStr);
  if (!claims.length) return held;
  const nowIso = new Date(nowMs).toISOString();
  const withReq = claims.filter((c) => !c.event_id && c.request_id);
  let reqById = new Map<number, any>();
  if (withReq.length) {
    try {
      const ids = [...new Set(withReq.map((c) => c.request_id as number))];
      const r = await env.DB.prepare(
        `SELECT id, status, expires_at, date, time FROM booking_requests WHERE id IN (${ids.map(() => '?').join(',')})`
      ).bind(...ids).all() as any;
      reqById = new Map(((r?.results || []) as any[]).map((x) => [x.id, x]));
    } catch { reqById = new Map(); }
  }
  for (const c of claims) {
    if (c.event_id) { held.add(c.time); continue; }
    if (c.request_id) {
      const req = reqById.get(c.request_id);
      // Huérfano o desalineado (el hold se movió de slot): no bloquea.
      if (!req || req.date !== dateStr || c.time !== req.time) continue;
      if (isRequestLive(req, nowIso)) held.add(c.time);
      continue;
    }
    try {
      const ageMin = (nowMs - new Date(c.created_at.replace(' ', 'T') + 'Z').getTime()) / 60000;
      if (ageMin < 10) held.add(c.time);
    } catch { /* fecha ilegible: no bloquea */ }
  }
  return held;
}

// Slot ocupado por OTROS (eventos reales + holds vivos ajenos). El propio
// hold (ownRequestId) no bloquea: permite recheck antes de confirmar.
export async function slotBlockedByOthers(env: Env, dateStr: string, timeStr: string, ownRequestId?: number | null): Promise<boolean> {
  const { events } = await listDayEvents(env, dateStr);
  if (slotOverlapsEvents(events, dateStr, timeStr)) return true;
  const claims = await listDayClaims(env, dateStr);
  const relevant = claims.filter((c) => c.time === timeStr && !c.event_id && c.request_id !== (ownRequestId ?? -1));
  if (!relevant.length) return false;
  const nowIso = new Date().toISOString();
  for (const c of relevant) {
    if (!c.request_id) {
      try {
        const ageMin = (Date.now() - new Date(c.created_at.replace(' ', 'T') + 'Z').getTime()) / 60000;
        if (ageMin < 10) return true;
      } catch { continue; }
      continue;
    }
    try {
      const req = await env.DB.prepare('SELECT status, expires_at, date, time FROM booking_requests WHERE id = ?').bind(c.request_id).first() as any;
      if (req && req.date === dateStr && req.time === timeStr && isRequestLive(req, nowIso)) return true;
    } catch { continue; }
  }
  return false;
}

// ---------- Solicitudes: máquina de estados ----------
// requested -> verified -> confirmed -> (cancelled) ; requested/verified ->
// expired ; cualquiera sospechosa -> flagged (requiere revisión manual).
// PENDING (requested/verified) != cita. Solo confirmed crea evento Calendar.

export interface BookingRequest {
  id: number; clinic_id: number; session_id: string | null; ip: string | null;
  appt_type: string | null; modality: string | null; date: string; time: string;
  patient_name: string | null; email: string | null; phone: string | null;
  email_hash: string | null; phone_hash: string | null;
  status: string; verification_status: string; expires_at: string;
  verified_at: string | null; confirmed_at: string | null; cancelled_at: string | null;
  calendar_event_id: string | null; cancel_reason: string | null;
  created_at: string; updated_at: string;
}

export interface RequestInput {
  sessionId?: string; ip?: string;
  apptType: string; modality: string; date: string; time: string;
  name: string; email: string; phone: string;
}

export async function getBookingRequest(env: Env, id: number): Promise<BookingRequest | null> {
  try {
    const row = await env.DB.prepare('SELECT * FROM booking_requests WHERE id = ?').bind(id).first() as any;
    return (row as BookingRequest) || null;
  } catch { return null; }
}

async function countIdentityActive(env: Env, phoneHash: string, emailHash: string, nowIso: string, todayStr: string, excludeRequestId?: number | null): Promise<{ pending: number; active: number }> {
  try {
    const r = await env.DB.prepare(
      "SELECT id, status, date, expires_at FROM booking_requests WHERE clinic_id = 1 AND (phone_hash = ? OR email_hash = ?) AND status IN ('requested', 'verified', 'confirmed')"
    ).bind(phoneHash, emailHash).all() as any;
    let pending = 0;
    let active = 0;
    for (const x of ((r?.results || []) as any[])) {
      if (excludeRequestId && x.id === excludeRequestId) continue;
      if ((x.status === 'requested' || x.status === 'verified') && x.expires_at > nowIso) pending++;
      if (x.status === 'confirmed' && x.date >= todayStr) active++;
    }
    return { pending, active };
  } catch { return { pending: 0, active: 0 }; }
}

async function detectAbuse(env: Env, phoneHash: string, emailHash: string, name: string): Promise<{ flagged: boolean; reason?: string }> {
  try {
    const names = await env.DB.prepare(
      "SELECT DISTINCT patient_name FROM booking_requests WHERE clinic_id = 1 AND phone_hash = ? AND created_at > datetime('now', '-7 days')"
    ).bind(phoneHash).all() as any;
    const distinct = new Set(((names?.results || []) as any[]).map((x) => norm(String(x?.patient_name || ''))).filter(Boolean));
    distinct.add(norm(name));
    if (distinct.size >= FLAG_NAME_VELOCITY) {
      return { flagged: true, reason: 'name_velocity' };
    }
    const cancels = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM booking_requests WHERE clinic_id = 1 AND (phone_hash = ? OR email_hash = ?) AND status = 'cancelled' AND cancelled_at > datetime('now', '-7 days')"
    ).bind(phoneHash, emailHash).first() as any;
    if (Number(cancels?.c || 0) >= FLAG_CANCEL_VELOCITY) {
      return { flagged: true, reason: 'cancel_velocity' };
    }
  } catch (err) {
    console.error('[booking] abuse check error:', err);
  }
  return { flagged: false };
}

export async function checkIdentityCaps(env: Env, phoneHash: string, emailHash: string, excludeRequestId?: number | null): Promise<{ ok: true } | { ok: false; code: 'identity_limit'; error: string }> {
  const { pending, active } = await countIdentityActive(env, phoneHash, emailHash, new Date().toISOString(), clinicToday(), excludeRequestId);
  if (pending >= MAX_PENDING_PER_IDENTITY) {
    return { ok: false, code: 'identity_limit', error: 'Ya tienes una solicitud pendiente. Complétala, cancélala o espera a que venza (15 minutos) antes de pedir otro horario.' };
  }
  if (active >= MAX_ACTIVE_PER_IDENTITY) {
    return { ok: false, code: 'identity_limit', error: 'Ya tienes una cita activa con este contacto. Si necesitas otro horario, cancela o reprograma la actual.' };
  }
  return { ok: true };
}

async function countSessionRequestsToday(env: Env, sessionId: string): Promise<number> {
  try {
    const r = await env.DB.prepare(
      "SELECT COUNT(*) AS c FROM booking_requests WHERE session_id = ? AND date(created_at) = date('now')"
    ).bind(sessionId).first() as any;
    return Number(r?.c || 0);
  } catch { return 0; }
}

export async function createBookingRequest(env: Env, input: RequestInput): Promise<{ ok: true; request: BookingRequest } | { ok: false; code: string; error: string; request?: BookingRequest }> {
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(input.date) && input.date >= clinicToday();
  const timeOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(input.time);
  if (!dateOk || !timeOk) return { ok: false, code: 'invalid_request', error: 'Fecha u horario inválidos.' };
  if (!CLINIC_SCHEDULE.days.includes(weekdayOf(input.date))) {
    return { ok: false, code: 'invalid_request', error: 'Ese día no hay atención (Lun–Sáb). Elige otro día.' };
  }
  if (!isPlausiblePatientName(input.name)) return { ok: false, code: 'invalid_contact', error: 'Necesito el nombre real del paciente.' };
  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(input.email)) return { ok: false, code: 'invalid_contact', error: 'El correo no tiene un formato válido.' };
  const phone = normalizePhoneMX(input.phone);
  if (!phone) return { ok: false, code: 'invalid_contact', error: 'El teléfono debe tener 10 dígitos (México).' };
  const phoneHash = await sha256hex(phone);
  const emailHash = await sha256hex(input.email.trim().toLowerCase());
  // Anti-abuso: ráfaga por sesión
  if (input.sessionId && !input.sessionId.startsWith('direct-')) {
    const n = await countSessionRequestsToday(env, input.sessionId);
    if (n >= MAX_REQUESTS_PER_SESSION_DAY) {
      return { ok: false, code: 'identity_limit', error: 'Demasiadas solicitudes desde esta conversación hoy. Contáctanos por WhatsApp al +52 231 144 2941.' };
    }
  }
  const caps = await checkIdentityCaps(env, phoneHash, emailHash);
  if (!caps.ok) return caps;
  const abuse = await detectAbuse(env, phoneHash, emailHash, input.name);
  const nowIso = new Date().toISOString();
  try {
    const ins = await env.DB.prepare(
      `INSERT INTO booking_requests (clinic_id, session_id, ip, appt_type, modality, date, time, patient_name, email, phone, email_hash, phone_hash, status, verification_status, expires_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      input.sessionId || null, input.ip || null, stripTags(input.apptType).slice(0, 60), stripTags(input.modality).slice(0, 30),
      input.date, input.time, stripTags(input.name).slice(0, 80), input.email.trim(), phone, emailHash, phoneHash,
      abuse.flagged ? 'flagged' : 'requested', abuse.flagged ? 'flagged' : 'pending', requestExpiresAt()
    ).run() as any;
    const id = Number(ins?.meta?.last_row_id || ins?.last_row_id || 0);
    if (!id) return { ok: false, code: 'invalid_request', error: 'No pude registrar tu solicitud.' };
    if (abuse.flagged) {
      const req = await getBookingRequest(env, id);
      return { ok: false, code: 'flagged', error: 'Detectamos actividad inusual con este contacto. Tu solicitud quedó en revisión manual; nuestro equipo te contactará por WhatsApp al número registrado.', request: req as BookingRequest };
    }
    // Hold del horario vinculado a la solicitud (TTL 15 min).
    if (await slotBlockedByOthers(env, input.date, input.time, id)) {
      await env.DB.prepare("UPDATE booking_requests SET status = 'expired', updated_at = datetime('now') WHERE id = ?").bind(id).run().catch(() => {});
      return { ok: false, code: 'slot_taken', error: 'Ese horario acaba de ocuparse. Elige otro.' };
    }
    const claimed = await claimSlot(env, input.date, input.time, (input.sessionId || `req-${id}`).slice(0, 80), id);
    if (!claimed) {
      await env.DB.prepare("UPDATE booking_requests SET status = 'expired', updated_at = datetime('now') WHERE id = ?").bind(id).run().catch(() => {});
      return { ok: false, code: 'slot_taken', error: 'Ese horario acaba de ocuparse. Elige otro.' };
    }
    const req = await getBookingRequest(env, id);
    return { ok: true, request: req as BookingRequest };
  } catch (err) {
    console.error('[booking] create request error:', err);
    return { ok: false, code: 'invalid_request', error: 'No pude registrar tu solicitud en este momento.' };
  }
}

// Verificación de contacto (sin canal de envío no hay prueba de propiedad:
// se valida formato + identidad + comportamiento y se registra como
// contact_validated. Fase 2: challenge con código cuando la clínica
// configure un proveedor de envío).
export async function verifyBookingRequest(env: Env, id: number): Promise<{ ok: true; request: BookingRequest } | { ok: false; code: string; error: string }> {
  const req = await getBookingRequest(env, id);
  if (!req) return { ok: false, code: 'invalid_request', error: 'Solicitud no encontrada.' };
  if (req.status === 'flagged') return { ok: false, code: 'flagged', error: 'Esta solicitud está en revisión manual.' };
  if (req.status !== 'requested') return { ok: false, code: 'invalid_request', error: 'Esta solicitud ya no está pendiente.' };
  const nowIso = new Date().toISOString();
  if (req.expires_at <= nowIso) {
    await expireBookingRequest(env, id);
    return { ok: false, code: 'expired', error: 'Tu solicitud venció (15 minutos). Pide el horario nuevamente.' };
  }
  if (!req.phone_hash || !req.email_hash) return { ok: false, code: 'invalid_contact', error: 'A la solicitud le faltan datos de contacto.' };
  const caps = await checkIdentityCaps(env, req.phone_hash, req.email_hash, id);
  if (!caps.ok) return caps;
  const abuse = await detectAbuse(env, req.phone_hash, req.email_hash, req.patient_name || '');
  try {
    if (abuse.flagged) {
      await env.DB.prepare("UPDATE booking_requests SET status = 'flagged', verification_status = 'flagged', updated_at = datetime('now') WHERE id = ?").bind(id).run();
      await releaseHoldByRequest(env, id);
      return { ok: false, code: 'flagged', error: 'Detectamos actividad inusual con este contacto. Tu solicitud quedó en revisión manual.' };
    }
    await env.DB.prepare("UPDATE booking_requests SET status = 'verified', verification_status = 'contact_validated', verified_at = ?, updated_at = datetime('now') WHERE id = ?").bind(nowIso, id).run();
    const updated = await getBookingRequest(env, id);
    return { ok: true, request: updated as BookingRequest };
  } catch (err) {
    console.error('[booking] verify request error:', err);
    return { ok: false, code: 'invalid_request', error: 'No pude verificar tu solicitud.' };
  }
}

// Mueve el hold a un nuevo slot (cambio de fecha/hora). Si el nuevo está
// ocupado, conserva el anterior y reporta slot_taken.
export async function updateBookingRequestSlot(env: Env, id: number, date: string, time: string): Promise<{ ok: true } | { ok: false; code: string; error?: string }> {
  const req = await getBookingRequest(env, id);
  if (!req || (req.status !== 'requested' && req.status !== 'verified')) return { ok: false, code: 'invalid_request' };
  if (req.date === date && req.time === time) return { ok: true };
  if (!CLINIC_SCHEDULE.days.includes(weekdayOf(date))) return { ok: false, code: 'invalid_request', error: 'Ese día no hay atención (Lun–Sáb).' };
  if (await slotBlockedByOthers(env, date, time, id)) return { ok: false, code: 'slot_taken' };
  const claimed = await claimSlot(env, date, time, (req.session_id || `req-${id}`).slice(0, 80), id);
  if (!claimed) return { ok: false, code: 'slot_taken' };
  try {
    await env.DB.prepare("UPDATE booking_requests SET date = ?, time = ?, expires_at = ?, updated_at = datetime('now') WHERE id = ?").bind(date, time, requestExpiresAt(), id).run();
    await env.DB.prepare('DELETE FROM booking_slot_claims WHERE request_id = ? AND (date != ? OR time != ?) AND event_id IS NULL').bind(id, date, time).run();
    return { ok: true };
  } catch (err) {
    console.error('[booking] move hold error:', err);
    return { ok: false, code: 'invalid_request' };
  }
}

export async function expireBookingRequest(env: Env, id: number): Promise<void> {
  try {
    await env.DB.prepare("UPDATE booking_requests SET status = 'expired', updated_at = datetime('now') WHERE id = ? AND status IN ('requested', 'verified')").bind(id).run();
    await releaseHoldByRequest(env, id);
  } catch (err) {
    console.error('[booking] expire request error:', err);
  }
}

export async function cancelBookingRequest(env: Env, id: number, reason = 'user_cancelled'): Promise<void> {
  try {
    await env.DB.prepare("UPDATE booking_requests SET status = 'cancelled', cancelled_at = datetime('now'), cancel_reason = ?, updated_at = datetime('now') WHERE id = ? AND status NOT IN ('confirmed', 'cancelled')").bind(reason, id).run();
    await releaseHoldByRequest(env, id);
  } catch (err) {
    console.error('[booking] cancel request error:', err);
  }
}

export async function cancelRequestByEvent(env: Env, eventId: string, reason = 'user_cancelled_chat'): Promise<void> {
  try {
    const row = await env.DB.prepare('SELECT id FROM booking_requests WHERE calendar_event_id = ?').bind(eventId).first() as any;
    if (!row?.id) return;
    await env.DB.prepare("UPDATE booking_requests SET status = 'cancelled', cancelled_at = datetime('now'), cancel_reason = ?, updated_at = datetime('now') WHERE id = ?").bind(reason, row.id).run();
  } catch (err) {
    console.error('[booking] cancel by event error:', err);
  }
}

// Barrido de expiración (cron + higiene): vence pendientes, libera holds,
// purga claims muertos. Retorna conteos para observabilidad.
export async function sweepBookingRequests(env: Env): Promise<{ expired: number; claimsPurged: number }> {
  let expired = 0;
  try {
    const over = await env.DB.prepare(
      "SELECT id FROM booking_requests WHERE status IN ('requested', 'verified') AND expires_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now')"
    ).all() as any;
    for (const r of ((over?.results || []) as any[])) {
      await expireBookingRequest(env, r.id);
      expired++;
    }
  } catch (err) {
    console.error('[booking] sweep error:', err);
  }
  try {
    const before = await env.DB.prepare('SELECT COUNT(*) AS c FROM booking_slot_claims WHERE event_id IS NULL').first() as any;
    await purgeStaleClaims(env);
    const after = await env.DB.prepare('SELECT COUNT(*) AS c FROM booking_slot_claims WHERE event_id IS NULL').first() as any;
    return { expired, claimsPurged: Math.max(0, Number(before?.c || 0) - Number(after?.c || 0)) };
  } catch {
    return { expired, claimsPurged: 0 };
  }
}

export interface BookingState {
  step: string;
  appt_type?: string;
  modality?: string;
  date?: string;
  time?: string;
  patient_name?: string;
  email?: string;
  phone?: string;
  offered_slots?: string;
  event_id?: string;
  request_id?: number;
}

export async function loadBookingState(env: Env, sessionId: string): Promise<BookingState> {
  try {
    const row = await env.DB.prepare('SELECT step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id, request_id FROM booking_sessions WHERE session_id = ?').bind(sessionId).first() as any;
    if (!row) return { step: 'idle' };
    return { step: row.step || 'idle', appt_type: row.appt_type || undefined, modality: row.modality || undefined, date: row.date || undefined, time: row.time || undefined, patient_name: row.patient_name || undefined, email: row.email || undefined, phone: row.phone || undefined, offered_slots: row.offered_slots || undefined, event_id: row.event_id || undefined, request_id: row.request_id ?? undefined };
  } catch { return { step: 'idle' }; }
}

export async function saveBookingState(env: Env, sessionId: string, s: BookingState): Promise<void> {
  try {
    await env.DB.prepare(
      'INSERT INTO booking_sessions (session_id, step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id, request_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now")) ON CONFLICT(session_id) DO UPDATE SET step=excluded.step, appt_type=excluded.appt_type, modality=excluded.modality, date=excluded.date, time=excluded.time, patient_name=excluded.patient_name, email=excluded.email, phone=excluded.phone, offered_slots=excluded.offered_slots, event_id=excluded.event_id, request_id=excluded.request_id, updated_at=datetime("now")'
    ).bind(sessionId, s.step, s.appt_type || null, s.modality || null, s.date || null, s.time || null, s.patient_name || null, s.email || null, s.phone || null, s.offered_slots || null, s.event_id || null, s.request_id ?? null).run();
  } catch (err) { console.error('[booking] save state error:', err); }
}

export async function auditBooking(env: Env, b: { sessionId: string; eventId: string; apptType?: string; modality?: string; date: string; time: string; name?: string; email?: string; status: string }): Promise<void> {
  try {
    await env.DB.prepare(
      'INSERT INTO bookings (session_id, event_id, appt_type, modality, date, time, duration_min, patient_name, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(b.sessionId, b.eventId, b.apptType || null, b.modality || null, b.date, b.time, CLINIC_SCHEDULE.durationMin, b.name || null, b.email || null, b.status).run();
  } catch (err) { console.error('[booking] audit error:', err); }
}

export async function bookingCreatesToday(env: Env, sessionId: string, ip: string): Promise<{ session: number; ip: number }> {
  try {
    const s = await env.DB.prepare("SELECT COUNT(*) AS c FROM bookings WHERE session_id = ? AND status = 'created' AND date(created_at) = date('now')").bind(sessionId).first() as any;
    const w = await env.DB.prepare("SELECT SUM(request_count) AS c FROM rate_limits WHERE ip_address = ? AND endpoint = 'voice-booking-create' AND window_start > datetime('now', '-1 day')").bind(ip).first() as any;
    return { session: Number(s?.c || 0), ip: Number(w?.c || 0) };
  } catch { return { session: 0, ip: 0 }; }
}

export async function countBookingCreate(env: Env, ip: string): Promise<void> {
  try {
    await env.DB.prepare("INSERT INTO rate_limits (ip_address, endpoint, request_count, window_start) VALUES (?, 'voice-booking-create', 1, datetime('now'))").run();
  } catch (err) { console.error('[booking] rate count error:', err); }
}

// ---------- Comprensión mínima (ES) ----------

const CRISIS_WORDS = ['suicid', 'matarme', 'matar me', 'quitarme la vida', 'autolesi', 'hacerme daño', 'emergencia'];
export function looksLikeCrisis(text: string): boolean {
  const t = text.toLowerCase();
  if (CRISIS_WORDS.some((w) => t.includes(w))) return true;
  // Tier-1 tolerante (typos/acentos/mayúsculas): una sola fuente de verdad.
  try {
    return assessSafety(text).level === 'EMERGENCIA';
  } catch {
    return false;
  }
}

const BOOK_WORDS = ['cita', 'agendar', 'agenda', 'reservar', 'reserva', 'appointment', 'consulta', 'valoraci'];
export function looksLikeBooking(text: string): boolean {
  const t = text.toLowerCase();
  return BOOK_WORDS.some((w) => t.includes(w));
}

// ---------- Intención de precio (PRICING > AVAILABILITY) ----------
// Causa raíz forense 2026-09-14: "COSTO" caía en availability cuando había
// booking state residual, y "CUANTO LA CONSULTA TMS" entraba a booking por
// la palabra "consulta" y pedía modalidad online/presencial para TMS.
// Regla: pricing explícito SIEMPRE gana a booking/availability y nunca
// muta el booking state (la conversación puede volver a booking después).
// Precios canónicos (misma fuente que worker/src/lib/ai-secretary.ts):
// TMS $1,500 MXN / Psicología $500 MXN. NO inventar otros.
const PRICING_WORDS = ['costo', 'precio', 'cuanto', 'cuesta', 'tarifa', 'honorario', 'cuanto vale'];
export function looksLikePricing(text: string): boolean {
  const t = norm(text);
  return PRICING_WORDS.some((w) => t.includes(w));
}
export function extractPricingService(text: string): 'tms' | 'terapia' | null {
  const t = norm(text);
  if (t.includes('tms') || t.includes('magnetica') || t.includes('estimulacion')) return 'tms';
  if (t.includes('psicolog') || t.includes('terapia') || t.includes('psiquiatr')) return 'terapia';
  return null;
}
const PRICE_TMS = TMS_PRICE_MESSAGE;
const PRICE_TERAPIA = THERAPY_PRICE_MESSAGE;
const PRICE_BOTH = PRICING_BOTH_MESSAGE;
function pricingReplyFor(text: string, st?: BookingState): string {
  const svc = extractPricingService(text);
  if (svc === 'tms') return PRICE_TMS;
  if (svc === 'terapia') return PRICE_TERAPIA;
  // "cuánto" suelto con contexto de servicio previo conserva ese contexto.
  if (st?.appt_type === BOOKING_TYPES[2]) return PRICE_TMS;
  if (st?.appt_type === BOOKING_TYPES[3]) return PRICE_TERAPIA;
  return PRICE_BOTH;
}

const CANCEL_WORDS = ['cancelar', 'cancela', 'anular', 'anula'];
export function looksLikeCancel(text: string): boolean {
  const t = text.toLowerCase();
  return CANCEL_WORDS.some((w) => t.includes(w));
}

const YES_WORDS = ['sí', 'si,', 'confirmo', 'confirmar', 'vale', 'de acuerdo', 'correcto', 'adelante', 'ok'];
const NO_WORDS = ['no', 'mejor no', 'cancela', 'olvídalo', 'olvídalo', 'después'];

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function isAffirmative(text: string): boolean {
  const t = norm(text).trim();
  if (NO_WORDS.some((w) => t === w || t.startsWith(w + ' '))) return false;
  return YES_WORDS.some((w) => t === w || t.startsWith(w + ' ') || t.endsWith(' ' + w) || t.includes(' ' + w + ' '));
}

export function extractType(text: string): string | null {
  const t = norm(text);
  if (t.includes('valoracion') || t.includes('primera vez') || t.includes('inicial')) return BOOKING_TYPES[0];
  if (t.includes('seguimiento') || t.includes('subsecuente') || t.includes('control')) return BOOKING_TYPES[1];
  if (t.includes('tms') || t.includes('estimulacion') || t.includes('magnetica')) return BOOKING_TYPES[2];
  if (t.includes('psicolog')) return BOOKING_TYPES[3];
  if (t.includes('pareja') || t.includes('familiar') || t.includes('matrimonio')) return BOOKING_TYPES[4];
  return null;
}

export function extractModality(text: string): string | null {
  const t = norm(text);
  if (t.includes('linea') || t.includes('en linea') || t.includes('online') || t.includes('virtual') || t.includes('videollamada')) return 'en línea';
  if (t.includes('presencial') || t.includes('clinica') || t.includes('consultorio') || t.includes('fisica')) return 'presencial';
  return null;
}

const MESES: Record<string, string> = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' };
const DIAS_SEMANA: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function extractDate(text: string, todayStr?: string): string | null {
  const t = norm(text);
  const today = todayStr || clinicToday();
  if (t.includes('pasado manana')) return addDays(today, 2);
  if (t.includes('manana')) return addDays(today, 1);
  if (t.includes('hoy')) return today;
  const dm = t.match(/(\d{1,2})\s*(?:de\s*)?([a-z]+)?/);
  // dd/mm[/yyyy]
  const slash = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slash) {
    const dd = slash[1].padStart(2, '0');
    const mm = slash[2].padStart(2, '0');
    let yyyy = new Date().getUTCFullYear();
    if (slash[3]) yyyy = slash[3].length === 2 ? 2000 + Number(slash[3]) : Number(slash[3]);
    let cand = `${yyyy}-${mm}-${dd}`;
    if (cand < today) cand = `${yyyy + 1}-${mm}-${dd}`;
    return cand;
  }
  // "16 de septiembre" o "el 16"
  const named = t.match(/(?:el\s+)?(\d{1,2})\s+de\s+([a-z]+)/);
  if (named && MESES[named[2]]) {
    const yyyy = new Date().getUTCFullYear();
    let cand = `${yyyy}-${MESES[named[2]]}-${named[1].padStart(2, '0')}`;
    if (cand < today) cand = `${yyyy + 1}-${MESES[named[2]]}-${named[1].padStart(2, '0')}`;
    return cand;
  }
  // día de semana próximo
  for (const [name, dow] of Object.entries(DIAS_SEMANA)) {
    if (t.includes(name)) {
      const cur = weekdayOf(today);
      let delta = (dow - cur + 7) % 7;
      if (delta === 0) delta = 7; // próximo, no hoy
      if (t.includes('este ' + name) && delta > 3) { /* mantener próximo */ }
      return addDays(today, delta);
    }
  }
  void dm;
  return null;
}

export function extractTime(text: string): string | null {
  const t = norm(text);
  let m = t.match(/(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/);
  if (m) {
    let h = Number(m[1]);
    const min = m[2];
    const ap = m[3] || '';
    if (ap.startsWith('p') && h < 12) h += 12;
    if (ap.startsWith('a') && h === 12) h = 0;
    if (!ap && h >= 1 && h <= 7 && (t.includes('tarde') || t.includes('noche'))) h += 12;
    if (h > 23) return null;
    return `${String(h).padStart(2, '0')}:${min}`;
  }
  m = t.match(/(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.|hrs|horas|h)\b/);
  if (m) {
    let h = Number(m[1]);
    const ap = m[2] || '';
    if (ap.startsWith('p') && h < 12) h += 12;
    if (ap.startsWith('a') && h === 12) h = 0;
    if (!ap.startsWith('a') && !ap.startsWith('p') && h >= 1 && h <= 7 && (t.includes('tarde') || t.includes('noche'))) h += 12;
    if (h > 23) return null;
    return `${String(h).padStart(2, '0')}:00`;
  }
  // "5 de la tarde"
  m = t.match(/(\d{1,2})\s+de\s+la\s+(manana|tarde|noche)/);
  if (m) {
    let h = Number(m[1]);
    if (m[2] !== 'manana' && h < 12) h += 12;
    if (h > 23) return null;
    return `${String(h).padStart(2, '0')}:00`;
  }
  return null;
}

// Distingue un cambio real de fecha ("y el lunes", "mañana", "22/09")
// de un nombre de paciente que contiene un día ("Domingo Pérez").
// El email siempre tiene prioridad y se evalúa antes de llamar aquí.
const DATE_FILLER = ['pasado manana', 'manana', 'hoy', 'domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'proximo', 'proxima', 'este', 'esta', 'el', 'la', 'los', 'las', 'y', 'mejor', 'para', 'de', 'en', 'un', 'una', 'que', 'viene', 'siguiente', 'quiero'];
export function looksLikeDateChange(text: string): boolean {
  if (!extractDate(text)) return false;
  const t = norm(text);
  if (/(mejor|cambi|otr)/.test(t)) return true;
  let s = ` ${t} `;
  const toks = [...DATE_FILLER].sort((a, b) => b.length - a.length);
  for (const w of toks) s = s.split(` ${w} `).join(' ');
  s = s.replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/g, ' ').replace(/\d{1,2}/g, ' ');
  return s.replace(/[^a-z]/g, '').length < 4;
}
// Identidad de contacto: el teléfono MX (10 dígitos) + email son la llave
// anti-abuso (1 pendiente + 1 activa por identidad). Se guardan hashes
// para los conteos; el texto solo para contacto operativo/calendario.
export function normalizePhoneMX(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0052')) d = d.slice(4);
  else if (d.startsWith('52') && d.length === 12) d = d.slice(2);
  else if (d.startsWith('01') && d.length === 12) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return /^\d{10}$/.test(d) ? d : null;
}
export function extractPhone(text: string): string | null {
  const cands = text.match(/\+?[\d][\d\s.\-()]{7,17}[\d]/g) || [];
  for (const c of cands) {
    const n = normalizePhoneMX(c);
    if (n) return n;
  }
  return null;
}
export async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function requestExpiresAt(fromMs = Date.now()): string {
  return new Date(fromMs + PENDING_HOLD_MIN * 60000).toISOString();
}
export function isRequestLive(req: { status: string; expires_at: string }, nowIso = new Date().toISOString()): boolean {
  return (req.status === 'requested' || req.status === 'verified') && req.expires_at > nowIso;
}
export function extractEmail(text: string): string | null {
  const m = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0] : null;
}

// Blindaje de identidad: el nombre del paciente nunca puede ser una hora,
// fecha, email, modalidad o tipo de cita. Puerta usada en need_contact y
// como validación final antes de events.insert.
export function isPlausiblePatientName(name: string): boolean {
  const t = (name || '').trim();
  if (t.length < 2 || t.length > 80) return false;
  if (!/[a-záéíóúñü]/i.test(t)) return false; // debe contener letras
  const em = extractEmail(t);
  if (em && em === t) return false; // es solo un email
  // Es (casi) solo una hora: "15:00", "a las 15:00", "5 de la tarde".
  const low = t.toLowerCase();
  const tm = low.match(/\d{1,2}:\d{2}|\d{1,2}\s*(am|pm|a\.m\.|p\.m\.|hrs|horas|h)\b|\d{1,2}\s+de\s+la\s+(manana|tarde|noche)/);
  if (tm) {
    const rest = low.replace(tm[0], '').replace(/[^a-záéíóúñü]/gi, '');
    if (rest.length < 5) return false;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return false; // es una fecha ISO
  const n = norm(t);
  if (BOOKING_TYPES.some((b) => norm(b) === n)) return false; // es un tipo de cita
  if (n === 'en linea' || n === 'presencial') return false; // es una modalidad
  return true;
}

export function prettyDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  const s = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatSlots(slots: Slot[], max = 6): string {
  return slots.slice(0, max).map((s) => `• ${prettyDate(s.date)} ${s.time}`).join('\n');
}

// ---------- Máquina conversacional (sin inventar disponibilidad) ----------

export interface BookingTurn {
  handled: boolean;
  reply?: string;
  eventId?: string;
}

const ASK_TYPE = 'Claro. Puedo ayudarte a programar tu cita. ¿Qué tipo de atención necesitas? (Valoración inicial, Seguimiento, TMS, Psicología, Pareja/familiar u Otro)';

export async function handleBookingTurn(env: Env, sessionId: string, rawText: string, ip: string): Promise<BookingTurn> {
  const text = rawText.trim();
  if (!text) return { handled: false };
  // Crisis: nunca entra al flujo administrativo; lo maneja el LLM con protocolo.
  if (looksLikeCrisis(text)) return { handled: false };

  let st = await loadBookingState(env, sessionId);
  const low = text.toLowerCase();

  // PRICING > BOOKING/AVAILABILITY: intención explícita de precio nunca
  // entra a availability ni muta el booking state (context switch reversible:
  // después "quiero agendar" retoma el booking donde quedó).
  if (looksLikePricing(text)) {
    return { handled: true, reply: pricingReplyFor(text, st) };
  }

  // Cancelación de reserva activa o solicitud pendiente
  if (looksLikeCancel(text) && (st.event_id || st.request_id || st.step === 'need_confirm' || st.step.startsWith('need_'))) {
    if (st.event_id) {
      const c = await cancelBookingEvent(env, st.event_id);
      if (c.ok) {
        await auditBooking(env, { sessionId, eventId: st.event_id, apptType: st.appt_type, modality: st.modality, date: st.date || '', time: st.time || '', name: st.patient_name, email: st.email, status: 'cancelled' });
        await cancelRequestByEvent(env, st.event_id);
        await saveBookingState(env, sessionId, { step: 'idle' });
        return { handled: true, reply: 'Listo, tu cita quedó cancelada y el horario vuelve a estar disponible. Si quieres, puedo buscarte otro horario.' };
      }
      return { handled: true, reply: 'No pude cancelar en este momento. Inténtalo de nuevo o contáctanos por WhatsApp al +52 231 144 2941.' };
    }
    if (st.request_id) {
      await cancelBookingRequest(env, st.request_id);
    }
    await saveBookingState(env, sessionId, { step: 'idle' });
    return { handled: true, reply: 'De acuerdo, no programamos nada. Si cambias de opinión, dime "quiero una cita".' };
  }

  const wantsBooking = looksLikeBooking(text) || (st.step !== 'idle' && st.step !== 'done');
  if (!wantsBooking) return { handled: false };

  // Prefill desde el primer mensaje
  if (st.step === 'idle' || st.step === 'done') {
    st = { step: 'need_type' };
    const ty = extractType(text);
    if (ty) st.appt_type = ty;
    const mo = extractModality(text);
    if (mo) st.modality = mo;
    // REGLA DE NEGOCIO: TMS = siempre presencial (nunca preguntar modalidad).
    if (st.appt_type === BOOKING_TYPES[2]) st.modality = 'presencial';
    const dt = extractDate(text);
    if (dt) st.date = dt;
  }

  // Tipo
  if (st.step === 'need_type') {
    const ty = extractType(text) || (st.appt_type as string) || null;
    if (!ty) {
      await saveBookingState(env, sessionId, st);
      return { handled: true, reply: ASK_TYPE };
    }
    st.appt_type = ty;
    st.step = 'need_modality';
  }
  // Modalidad (TMS = siempre presencial, sin preguntar; solo psicoterapia
  // y otros tipos admiten online/presencial).
  if (st.step === 'need_modality') {
    if (st.appt_type === BOOKING_TYPES[2]) {
      st.modality = 'presencial';
      st.step = 'need_date';
    } else {
      const mo = extractModality(text) || st.modality || null;
      if (!mo) {
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: `Perfecto, ${st.appt_type}. ¿Prefieres atención en línea o presencial?` };
      }
      st.modality = mo;
      st.step = 'need_date';
    }
  }
  // Fecha
  if (st.step === 'need_date') {
    const dt = extractDate(text) || st.date || null;
    if (!dt) {
      await saveBookingState(env, sessionId, st);
      return { handled: true, reply: '¿Qué día te viene bien? (por ejemplo: mañana, el sábado, o 20 de septiembre)' };
    }
    st.date = dt;
    st.step = 'need_slot';
    st.offered_slots = undefined;
  }
  // Slots reales desde Calendar
  if (st.step === 'need_slot') {
    // CAMBIO DE FECHA (causa raíz 2026-09-14 "Y EL LUNES" → slots del sábado):
    // una fecha nueva invalida selected_slot + availability anterior y fuerza
    // una NUEVA consulta a Calendar. Nunca reutilizar slots de otra fecha.
    const newDate = extractDate(text);
    if (newDate && newDate !== st.date) {
      st.date = newDate;
      st.time = undefined;
      st.offered_slots = undefined;
    }
    let slots: Slot[] | undefined;
    try { slots = st.offered_slots ? (JSON.parse(st.offered_slots) as Slot[]).filter((s) => s.date === st.date) : undefined; } catch { slots = undefined; }
    if (!slots || !slots.length) slots = undefined;
    if (!slots) {
      const avail = await getAvailableSlots(env, st.date as string);
      if (!avail.ok) {
        if (avail.code === 'CALENDAR_NOT_AUTHORIZED' || avail.code === 'CALENDAR_UNAVAILABLE') {
          await saveBookingState(env, sessionId, { step: 'idle' });
          return { handled: true, reply: avail.code === 'CALENDAR_NOT_AUTHORIZED'
            ? 'En este momento no puedo consultar la agenda en vivo. No quiero darte un horario que no esté realmente reservado. Por favor contáctanos por WhatsApp al +52 231 144 2941 y te agendamos.'
            : 'En este momento no puedo confirmar la disponibilidad de la agenda. No quiero darte un horario que no esté realmente reservado. Inténtalo de nuevo en un momento.' };
        }
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: `${avail.error} ¿Buscamos otro día?` };
      }
      slots = (avail.slots || []).filter((s) => s.date === st.date);
      if (!slots.length) {
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: 'No hay horarios libres ese día. ¿Buscamos otro día?' };
      }
      st.offered_slots = JSON.stringify(slots);
      await saveBookingState(env, sessionId, st);
      return { handled: true, reply: `Estos son los horarios realmente disponibles para ${prettyDate(st.date as string)}:\n${formatSlots(slots)}\n¿Cuál prefieres?` };
    }
    // El usuario elige un slot ofrecido
    const picked = extractTime(text);
    const match = picked ? slots.find((s) => s.time === picked) : undefined;
    if (!match) {
      return { handled: true, reply: `Elige uno de estos horarios disponibles:\n${formatSlots(slots)}\n(Ejemplo: "${slots[0].time}")` };
    }
    st.time = match.time;
    st.step = 'need_contact';
    await saveBookingState(env, sessionId, st);
    // Blindaje causa raíz "Paciente: 14:00": NO caer al paso need_contact en el
    // mismo turno. El mensaje que eligió el slot no es el nombre del paciente.
    return { handled: true, reply: `Perfecto, ${prettyDate(st.date as string)} ${st.time}. Para solicitarla necesito tu nombre, un correo y un teléfono (10 dígitos). Ejemplo: "María López — maria@correo.com — 2311442941"` };
  }
  // Contacto mínimo: nombre + correo + teléfono (la identidad frena el abuso:
  // 1 pendiente + 1 activa por contacto). Al completar se crea la SOLICITUD
  // (hold 15 min) y se verifica. Sin solicitud verificada no hay cita.
  if (st.step === 'need_contact') {
    const email = extractEmail(text);
    const phone = extractPhone(text);
    // Cambio de fecha tardío ("mejor el lunes"): solo si NO hay datos de
    // contacto en el mensaje. looksLikeDateChange evita confundir un nombre
    // ("Domingo Pérez") con un día de la semana.
    if (!email && !phone && looksLikeDateChange(text)) {
      const lateDate = extractDate(text) as string;
      if (lateDate !== st.date) {
        st.date = lateDate;
        st.time = undefined;
        st.offered_slots = undefined;
        st.step = 'need_slot';
        await saveBookingState(env, sessionId, st);
        return await handleBookingTurn(env, sessionId, text, ip);
      }
    }
    if (phone && !st.phone) st.phone = phone;
    if (email && !st.email) st.email = email;
    if (!st.patient_name) {
      let nameGuess = text.trim();
      if (email) nameGuess = nameGuess.replace(email, '');
      if (phone) nameGuess = nameGuess.replace(/[+\d\s.\-()]{9,}/g, ' ');
      nameGuess = nameGuess.replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
      if (nameGuess.length >= 2 && !nameGuess.includes('@') && isPlausiblePatientName(nameGuess) && !looksLikeDateChange(text)) {
        st.patient_name = nameGuess.slice(0, 80);
      } else if (!email && !phone && text.trim().length >= 2 && !text.includes('@')) {
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: 'Ese dato parece un horario o una fecha, no un nombre. ¿A nombre de quién queda la cita? Ejemplo: "María López"' };
      }
    }
    if (!st.patient_name) {
      await saveBookingState(env, sessionId, st);
      return { handled: true, reply: st.email || st.phone
        ? 'Gracias. ¿A nombre de quién queda la cita?'
        : 'Para solicitar tu cita necesito tu nombre, un correo y un teléfono (10 dígitos). Ejemplo: "María López — maria@correo.com — 2311442941"' };
    }
    if (!st.email) {
      await saveBookingState(env, sessionId, st);
      return { handled: true, reply: `Gracias, ${st.patient_name}. ¿Cuál es tu correo y tu teléfono (10 dígitos)?` };
    }
    if (!st.phone) {
      await saveBookingState(env, sessionId, st);
      return { handled: true, reply: `¿A qué teléfono (10 dígitos) confirmo tu cita, ${st.patient_name}?` };
    }
    // El slot pudo cambiar mientras dábamos datos: sincroniza el hold.
    if (st.request_id) {
      const existing = await getBookingRequest(env, st.request_id);
      if (existing && (existing.date !== st.date || existing.time !== st.time)) {
        const moved = await updateBookingRequestSlot(env, st.request_id, st.date as string, st.time as string);
        if (!moved.ok) {
          st.time = undefined; st.offered_slots = undefined; st.step = 'need_slot';
          await saveBookingState(env, sessionId, st);
          return { handled: true, reply: 'Ese horario acaba de ocuparse. ¿Buscamos otro día?' };
        }
      }
    }
    // Crea la solicitud una sola vez (idempotente por sesión).
    if (!st.request_id) {
      const created = await createBookingRequest(env, {
        sessionId, ip, apptType: st.appt_type as string, modality: st.modality as string,
        date: st.date as string, time: st.time as string,
        name: st.patient_name, email: st.email, phone: st.phone,
      });
      if (!created.ok) {
        if (created.code === 'flagged' || created.code === 'identity_limit') {
          await saveBookingState(env, sessionId, { step: 'idle' });
          return { handled: true, reply: created.code === 'flagged'
            ? 'Detectamos actividad inusual con este contacto y tu solicitud quedó en revisión manual. Nuestro equipo te contactará. Si es urgente, escríbenos por WhatsApp al +52 231 144 2941.'
            : `${created.error} Si necesitas ayuda, escríbenos por WhatsApp al +52 231 144 2941.` };
        }
        if (created.code === 'slot_taken') {
          st.time = undefined; st.offered_slots = undefined; st.step = 'need_slot';
          await saveBookingState(env, sessionId, st);
          return { handled: true, reply: 'Ese horario acaba de ocuparse. ¿Buscamos otro día?' };
        }
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: 'No pude registrar tu solicitud en este momento. Inténtalo de nuevo.' };
      }
      st.request_id = created.request.id;
    }
    const verified = await verifyBookingRequest(env, st.request_id);
    if (!verified.ok) {
      if (verified.code === 'flagged') {
        await saveBookingState(env, sessionId, { step: 'idle' });
        return { handled: true, reply: 'Detectamos actividad inusual con este contacto y tu solicitud quedó en revisión manual. Nuestro equipo te contactará.' };
      }
      if (verified.code === 'expired') {
        st.request_id = undefined; st.time = undefined; st.offered_slots = undefined; st.step = 'need_slot';
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: 'Tu solicitud venció (15 minutos sin confirmar). ¿Buscamos otro horario?' };
      }
      await saveBookingState(env, sessionId, { step: 'idle' });
      return { handled: true, reply: `${verified.error} Si necesitas ayuda, escríbenos por WhatsApp al +52 231 144 2941.` };
    }
    st.step = 'need_confirm';
    await saveBookingState(env, sessionId, st);
  }
  // Confirmación explícita + recheck + creación.
  // El "sí" SOLO crea la cita si existe solicitud verificada y vigente:
  // el gate vive en createBookingEvent (ninguna llamada directa lo salta).
  if (st.step === 'need_confirm') {
    if (!isAffirmative(text) && !low.includes('confirm')) {
      // Permite corregir datos antes de confirmar. Guardias (causa raíz
      // 2026-09-14): un contacto ("Domingo Pérez — dom@test.com") contiene
      // un día de semana y NO es un cambio de fecha. Solo se corrige fecha
      // ante un cambio real (looksLikeDateChange) y hora ante hora pura.
      const dt = !extractEmail(text) && looksLikeDateChange(text) ? extractDate(text) : null;
      const tmRaw = extractTime(text);
      const hasLetters = /[a-záéíóúñü]/i.test(text);
      const tm = tmRaw && (!hasLetters || /a\s+las/i.test(text) || looksLikeDateChange(text)) ? tmRaw : null;
      if (dt || tm) {
        if (dt) {
          st.date = dt; st.time = undefined; st.offered_slots = undefined; st.step = 'need_slot';
          // La solicitud conserva su verificación pero suelta el hold viejo;
          // el nuevo hold se crea al elegir hora (sincronía en need_contact).
          if (st.request_id) {
            await releaseHoldByRequest(env, st.request_id);
            try {
              await env.DB.prepare("UPDATE booking_requests SET date = ?, time = '', expires_at = ?, updated_at = datetime('now') WHERE id = ?").bind(dt, requestExpiresAt(), st.request_id).run();
            } catch (err) {
              console.error('[booking] request date reset error:', err);
            }
          }
        }
        else if (tm) {
          st.time = tm;
          if (st.request_id) {
            const moved = await updateBookingRequestSlot(env, st.request_id, st.date as string, tm);
            if (!moved.ok) {
              st.time = undefined; st.offered_slots = undefined; st.step = 'need_slot';
              await saveBookingState(env, sessionId, st);
              return await handleBookingTurn(env, sessionId, `revisar ${st.date || ''}`, ip);
            }
          }
        }
        await saveBookingState(env, sessionId, st);
        return await handleBookingTurn(env, sessionId, `revisar ${st.date || ''} ${st.time || ''}`, ip);
      }
      await saveBookingState(env, sessionId, st);
      return { handled: true, reply: `Confirma tu cita:\n📅 ${prettyDate(st.date as string)}\n🕔 ${st.time}\n🧑‍⚕️ ${st.appt_type}\n📍 ${st.modality}\n👤 ${st.patient_name}\n✉️ ${st.email}\n📞 ${st.phone}\n⏳ Esta solicitud reserva tu horario por 15 minutos.\n\n¿Confirmas esta cita? (responde Sí para crearla)` };
    }
    // Límite anti-abuso: pocas creaciones por sesión/IP al día
    const caps = await bookingCreatesToday(env, sessionId, ip);
    if (caps.session >= 3 || caps.ip >= 10) {
      await saveBookingState(env, sessionId, { step: 'idle' });
      return { handled: true, reply: 'Por seguridad no puedo crear más citas desde esta conversación hoy. Contáctanos por WhatsApp al +52 231 144 2941 y te ayudamos.' };
    }
    if (!st.request_id) {
      st.step = 'need_contact';
      await saveBookingState(env, sessionId, st);
      return { handled: true, reply: 'Tu solicitud venció o no quedó registrada. Empecemos de nuevo: ¿a nombre de quién queda la cita?' };
    }
    const created = await createBookingEvent(env, {
      date: st.date as string, time: st.time as string,
      apptType: st.appt_type as string, modality: st.modality as string,
      name: st.patient_name as string, email: st.email, phone: st.phone, sessionId,
      requestId: st.request_id,
    });
    if (!created.ok) {
      if (created.code === 'slot_taken') {
        st.time = undefined; st.offered_slots = undefined; st.step = 'need_slot';
        await saveBookingState(env, sessionId, st);
        const alt = created.slots && created.slots.length ? `\n${formatSlots(created.slots)}` : '';
        return { handled: true, reply: `Ese horario acaba de ocuparse y no lo creé para evitar una doble reserva. Horarios libres ese día:${alt}\n¿Cuál prefieres?` };
      }
      if (created.code === 'expired' || created.code === 'slot_changed') {
        st.request_id = undefined; st.time = undefined; st.offered_slots = undefined; st.step = 'need_slot';
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: 'Tu solicitud venció o el horario cambió. ¿Buscamos otro horario?' };
      }
      if (created.code === 'not_verified' || created.code === 'flagged') {
        await saveBookingState(env, sessionId, { step: 'idle' });
        return { handled: true, reply: 'Esta solicitud requiere revisión antes de confirmar. Nuestro equipo te contactará.' };
      }
      await saveBookingState(env, sessionId, { step: 'idle' });
      return { handled: true, reply: created.code === 'CALENDAR_NOT_AUTHORIZED'
        ? 'No pude conectar con la agenda para crear tu cita. Contáctanos por WhatsApp al +52 231 144 2941.'
        : 'No pude crear tu cita en este momento. Inténtalo de nuevo en un momento.' };
    }
    await countBookingCreate(env, ip);
    await auditBooking(env, { sessionId, eventId: created.eventId as string, apptType: st.appt_type, modality: st.modality, date: st.date as string, time: st.time as string, name: st.patient_name, email: st.email, status: 'created' });
    const verify = await verifyBookingEvent(env, created.eventId as string);
    await saveBookingState(env, sessionId, { step: 'done', event_id: created.eventId });
    if (!verify.ok) {
      return { handled: true, reply: `Tu cita se registró (folio ${(created.eventId as string).slice(0, 12)}), pero no pude verificarla en este momento. Te contactaremos para confirmar.`, eventId: created.eventId };
    }
    return {
      handled: true,
      eventId: created.eventId,
      reply: `✅ Tu cita quedó agendada:\n📅 ${prettyDate(st.date as string)}\n🕔 ${st.time} (${CLINIC_SCHEDULE.durationMin} min)\n🧑‍⚕️ ${st.appt_type}\n📍 ${st.modality}\nRecibirás la confirmación en ${st.email}. Si necesitas cancelar o cambiarla, dímelo aquí.`,
    };
  }

  await saveBookingState(env, sessionId, st);
  return { handled: true, reply: ASK_TYPE };
}
