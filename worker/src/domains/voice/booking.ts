import type { Env } from '../../types';
import { getAccessTokenFromDB } from '../../lib/calendar-oauth';
// Fuente canónica ÚNICA de precios (definida en lib/ai-secretary.ts).
import { TMS_PRICE_MESSAGE, THERAPY_PRICE_MESSAGE, PRICING_BOTH_MESSAGE } from '../../lib/ai-secretary';

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
  const step = CLINIC_SCHEDULE.durationMin + CLINIC_SCHEDULE.bufferMin;
  const isToday = dateStr === clinicToday();
  const nowMin = clinicNowMinutes() + CLINIC_SCHEDULE.leadMin;
  const slots: Slot[] = [];
  for (let start = CLINIC_SCHEDULE.startHour * 60; start + CLINIC_SCHEDULE.durationMin <= CLINIC_SCHEDULE.endHour * 60; start += step) {
    const end = start + CLINIC_SCHEDULE.durationMin + CLINIC_SCHEDULE.bufferMin;
    if (isToday && start <= nowMin) continue;
    const overlap = events.some((e) => {
      const s = new Date(e.start).getTime();
      const en = new Date(e.end).getTime();
      const slotS = new Date(`${dateStr}T${toTime(start)}:00-06:00`).getTime();
      const slotE = slotS + (end - start) * 60000;
      return s < slotE && en > slotS;
    });
    if (!overlap) slots.push({ date: dateStr, time: toTime(start) });
  }
  if (!slots.length) return { ok: false, error: 'No hay horarios libres ese día. Puedo buscar otro día.', code: 'no_availability' };
  return { ok: true, slots };
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
  date: string; time: string; apptType: string; modality: string; name: string; email?: string; phone?: string; sessionId?: string;
}): Promise<BookingResult> {
  // Saneamiento primero; validación después sobre valores ya limpios.
  const date = (input.date || '').trim();
  const time = (input.time || '').trim();
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
  // Recheck obligatorio inmediatamente antes de crear (anti doble reserva)
  const free = await isSlotFree(env, date, time);
  if (!free) {
    const alt = await getAvailableSlots(env, date);
    return { ok: false, error: 'Ese horario acaba de ocuparse. Elige otro.', code: 'slot_taken', slots: alt.slots };
  }
  // Claim atómico: ante POSTs simultáneos solo uno gana el slot.
  const claimOwner = (input.sessionId || `direct-${date}-${time}`).slice(0, 80);
  const claimed = await claimSlot(env, date, time, claimOwner);
  if (!claimed) {
    const alt = await getAvailableSlots(env, date);
    return { ok: false, error: 'Ese horario acaba de ocuparse. Elige otro.', code: 'slot_taken', slots: alt.slots };
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
    await releaseSlot(env, date, time, claimOwner);
    return { ok: false, error: 'Calendario no conectado.', code: 'CALENDAR_NOT_AUTHORIZED' };
  }
  if (status !== 200 && status !== 201) {
    await releaseSlot(env, date, time, claimOwner);
    return { ok: false, error: 'No pude crear la cita en este momento.', code: 'CALENDAR_UNAVAILABLE' };
  }
  if (!data?.id) {
    await releaseSlot(env, date, time, claimOwner);
    return { ok: false, error: 'Respuesta inesperada del calendario.', code: 'invalid_request' };
  }
  await bindClaimToEvent(env, date, time, claimOwner, data.id as string);
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

export async function claimSlot(env: Env, date: string, time: string, sessionId: string): Promise<boolean> {
  try {
    await env.DB.prepare(
      "INSERT INTO booking_slot_claims (clinic_id, date, time, session_id, created_at) VALUES (1, ?, ?, ?, datetime('now'))"
    ).bind(date, time, sessionId).run();
    return true;
  } catch {
    // Conflicto: puede ser reserva concurrente real o claim rancio (<10min
    // por caída entre claim e insert). Purga rancios y reintenta una vez.
    try {
      await env.DB.prepare(
        "DELETE FROM booking_slot_claims WHERE date = ? AND time = ? AND created_at < datetime('now', '-10 minutes')"
      ).bind(date, time).run();
      await env.DB.prepare(
        "INSERT INTO booking_slot_claims (clinic_id, date, time, session_id, created_at) VALUES (1, ?, ?, ?, datetime('now'))"
      ).bind(date, time, sessionId).run();
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
}

export async function loadBookingState(env: Env, sessionId: string): Promise<BookingState> {
  try {
    const row = await env.DB.prepare('SELECT step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id FROM booking_sessions WHERE session_id = ?').bind(sessionId).first() as any;
    if (!row) return { step: 'idle' };
    return { step: row.step || 'idle', appt_type: row.appt_type || undefined, modality: row.modality || undefined, date: row.date || undefined, time: row.time || undefined, patient_name: row.patient_name || undefined, email: row.email || undefined, phone: row.phone || undefined, offered_slots: row.offered_slots || undefined, event_id: row.event_id || undefined };
  } catch { return { step: 'idle' }; }
}

export async function saveBookingState(env: Env, sessionId: string, s: BookingState): Promise<void> {
  try {
    await env.DB.prepare(
      'INSERT INTO booking_sessions (session_id, step, appt_type, modality, date, time, patient_name, email, phone, offered_slots, event_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now")) ON CONFLICT(session_id) DO UPDATE SET step=excluded.step, appt_type=excluded.appt_type, modality=excluded.modality, date=excluded.date, time=excluded.time, patient_name=excluded.patient_name, email=excluded.email, phone=excluded.phone, offered_slots=excluded.offered_slots, event_id=excluded.event_id, updated_at=datetime("now")'
    ).bind(sessionId, s.step, s.appt_type || null, s.modality || null, s.date || null, s.time || null, s.patient_name || null, s.email || null, s.phone || null, s.offered_slots || null, s.event_id || null).run();
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
  return CRISIS_WORDS.some((w) => t.includes(w));
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

  // Cancelación de reserva activa
  if (looksLikeCancel(text) && (st.event_id || st.step === 'need_confirm' || st.step.startsWith('need_'))) {
    if (st.event_id) {
      const c = await cancelBookingEvent(env, st.event_id);
      if (c.ok) {
        await auditBooking(env, { sessionId, eventId: st.event_id, apptType: st.appt_type, modality: st.modality, date: st.date || '', time: st.time || '', name: st.patient_name, email: st.email, status: 'cancelled' });
        await saveBookingState(env, sessionId, { step: 'idle' });
        return { handled: true, reply: 'Listo, tu cita quedó cancelada y el horario vuelve a estar disponible. Si quieres, puedo buscarte otro horario.' };
      }
      return { handled: true, reply: 'No pude cancelar en este momento. Inténtalo de nuevo o contáctanos por WhatsApp al +52 231 144 2941.' };
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
    return { handled: true, reply: `Perfecto, ${prettyDate(st.date as string)} ${st.time}. Para confirmar necesito tu nombre y un correo. Ejemplo: "María López — maria@correo.com"` };
  }
  // Contacto mínimo
  if (st.step === 'need_contact') {
    const email = extractEmail(text);
    // Cambio de fecha tardío ("mejor el lunes"): descarta la hora elegida y
    // vuelve a slots con la nueva fecha. El email tiene prioridad: si el
    // mensaje trae email se trata como contacto. looksLikeDateChange evita
    // confundir un nombre ("Domingo Pérez") con un día de la semana.
    if (!email && looksLikeDateChange(text)) {
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
    if (!st.patient_name) {
      // Espera "Nombre — correo"; si solo hay correo, pide nombre y viceversa
      const nameGuess = email ? text.replace(email, '').replace(/[-–—]/g, ' ').trim() : text.trim();
      if (email && isPlausiblePatientName(nameGuess)) {
        st.email = email;
        st.patient_name = nameGuess.slice(0, 80);
      } else if (email) {
        st.email = email;
        await saveBookingState(env, sessionId, st);
        if (!isPlausiblePatientName(nameGuess)) {
          return { handled: true, reply: 'Ese dato parece un horario, no un nombre. ¿A nombre de quién queda la cita?' };
        }
        return { handled: true, reply: 'Gracias. ¿A nombre de quién queda la cita?' };
      } else if (text.trim().length >= 2 && !text.includes('@')) {
        if (!isPlausiblePatientName(text.trim())) {
          await saveBookingState(env, sessionId, st);
          return { handled: true, reply: 'Ese dato parece un horario o una fecha, no un nombre. ¿A nombre de quién queda la cita? Ejemplo: "María López"' };
        }
        st.patient_name = text.trim().slice(0, 80);
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: `Gracias, ${st.patient_name}. ¿A qué correo envío la confirmación?` };
      } else {
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: 'Para confirmar necesito tu nombre y un correo. Ejemplo: "María López — maria@correo.com"' };
      }
    }
    if (!st.email) {
      if (email) st.email = email;
      else {
        await saveBookingState(env, sessionId, st);
        return { handled: true, reply: '¿A qué correo envío la confirmación de tu cita?' };
      }
    }
    st.step = 'need_confirm';
    await saveBookingState(env, sessionId, st);
  }
  // Confirmación explícita + recheck + creación
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
        if (dt) { st.date = dt; st.time = undefined; st.offered_slots = undefined; st.step = 'need_slot'; }
        else if (tm) { st.time = tm; }
        await saveBookingState(env, sessionId, st);
        return await handleBookingTurn(env, sessionId, `revisar ${st.date || ''} ${st.time || ''}`, ip);
      }
      await saveBookingState(env, sessionId, st);
      return { handled: true, reply: `Confirma tu cita:\n📅 ${prettyDate(st.date as string)}\n🕔 ${st.time}\n🧑‍⚕️ ${st.appt_type}\n📍 ${st.modality}\n👤 ${st.patient_name}\n✉️ ${st.email}\n\n¿Confirmas esta cita? (responde Sí para crearla)` };
    }
    // Límite anti-abuso: pocas creaciones por sesión/IP al día
    const caps = await bookingCreatesToday(env, sessionId, ip);
    if (caps.session >= 3 || caps.ip >= 10) {
      await saveBookingState(env, sessionId, { step: 'idle' });
      return { handled: true, reply: 'Por seguridad no puedo crear más citas desde esta conversación hoy. Contáctanos por WhatsApp al +52 231 144 2941 y te ayudamos.' };
    }
    const created = await createBookingEvent(env, {
      date: st.date as string, time: st.time as string,
      apptType: st.appt_type as string, modality: st.modality as string,
      name: st.patient_name as string, email: st.email, sessionId,
    });
    if (!created.ok) {
      if (created.code === 'slot_taken') {
        st.time = undefined; st.offered_slots = undefined; st.step = 'need_slot';
        await saveBookingState(env, sessionId, st);
        const alt = created.slots && created.slots.length ? `\n${formatSlots(created.slots)}` : '';
        return { handled: true, reply: `Ese horario acaba de ocuparse y no lo creé para evitar una doble reserva. Horarios libres ese día:${alt}\n¿Cuál prefieres?` };
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
