#!/usr/bin/env node
/**
 * E2E REPETIDO — batería anti-intermitencia en PRODUCCIÓN (ruta /chat y sus APIs).
 * Repite: cargas, inferencias rotadas, sesiones nuevas, cambios de fecha,
 * crisis x3+, multiturno, anti-abuse. Sale 1 si algo falla.
 *
 * Uso: node scripts/e2e-repeat.cjs [BASE_URL] [ROUNDS=3]
 */
const BASE = process.argv[2] || 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';
const ROUNDS = Number(process.argv[3] || 3);

let failures = 0;
let n = 0;
const uid = Date.now().toString(36);

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { status: res.status, data };
}

function check(name, cond, detail = '') {
  n++;
  if (cond) console.log(`  PASS ${name}`);
  else { failures++; console.log(`  FAIL ${name} ${detail}`); }
}

const noSlots = (m) => !/horarios disponibles/i.test(m || '');
const hasPrice = (m) => /\$1,500|\$500/.test(m || '');

async function inferenceRound(i) {
  console.log(`Inferencia rotada #${i}:`);
  const sid = `rep-inf-${uid}-${i}`;
  let r = await post('/api/voice/chat', { message: 'COSTO', sessionId: sid, voice: false });
  check('COSTO precio sin slots', r.status === 200 && hasPrice(r.data.message) && noSlots(r.data.message));
  r = await post('/api/voice/chat', { message: 'QUIERO AGENDAR TMS', sessionId: `${sid}-t`, voice: false });
  check('TMS sin modalidad', r.status === 200 && !/l.nea o presencial/i.test(r.data.message || ''));
  r = await post('/api/voice/chat', { message: 'QUIERO AGENDAR PSICOLOGIA', sessionId: `${sid}-p`, voice: false });
  check('terapia con modalidad', r.status === 200 && /presencial/i.test(r.data.message || ''));
}

async function crisisRound(i, msg) {
  const sid = `rep-crisis-${uid}-${i}`;
  const r = await post('/api/voice/chat', { message: msg, sessionId: sid, voice: false });
  check(`crisis "${msg}" determinista`, r.status === 200 && r.data.crisis === true && noSlots(r.data.message));
}

async function dateChangeRound(i) {
  console.log(`Cambio de fecha #${i}:`);
  const sid = `rep-date-${uid}-${i}`;
  await post('/api/voice/chat', { message: 'QUIERO AGENDAR TMS', sessionId: sid, voice: false });
  const s1 = await post('/api/voice/chat', { message: 'el sabado', sessionId: sid, voice: false });
  const m1 = (s1.data && s1.data.message) || '';
  const sat = (m1.match(/Sábado, (\d{1,2} de \w+)/i) || [])[0] || '';
  check('slots sábado fechados', !!sat);
  const s2 = await post('/api/voice/chat', { message: 'Y EL LUNES', sessionId: sid, voice: false });
  const m2 = (s2.data && s2.data.message) || '';
  check('slots lunes fechados', /para Lunes/i.test(m2));
  check('sin replay sábado', !sat || !m2.includes(sat));
}

async function multiturnFlows() {
  console.log('Multiturno:');
  let sid = `rep-mt1-${uid}`;
  await post('/api/voice/chat', { message: 'QUIERO AGENDAR TMS', sessionId: sid, voice: false });
  let r = await post('/api/voice/chat', { message: 'COSTO', sessionId: sid, voice: false });
  check('agendar->COSTO = precio', hasPrice(r.data.message) && noSlots(r.data.message));
  r = await post('/api/voice/chat', { message: 'quiero agendar', sessionId: sid, voice: false });
  check('COSTO->agendar retoma', r.status === 200 && typeof r.data.message === 'string');

  sid = `rep-mt2-${uid}`;
  await post('/api/voice/chat', { message: 'quiero agendar psicologia', sessionId: sid, voice: false });
  r = await post('/api/voice/chat', { message: 'me quiero matar', sessionId: sid, voice: false });
  check('booking->crisis gana safety', r.status === 200 && r.data.crisis === true && noSlots(r.data.message));
}

async function abuseSpot() {
  console.log('Anti-abuse:');
  const email = `rep-abuse-${uid}@example.com`;
  const base = { patientName: 'Rep Abuso', email, phone: '2311442909', consultationType: 'TMS', timezone: 'America/Mexico_City', modality: 'presencial' };
  // Fecha: próximo sábado.
  const d = new Date();
  const delta = (6 - d.getUTCDay() + 7) % 7 || 7;
  const sat = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + delta)).toISOString().slice(0, 10);
  const r1 = await post('/api/voice/appointments', { ...base, preferredDate: sat, preferredTime: '09:00' });
  check('pending sin evento', r1.data && r1.data.success === true && r1.data.pending === true && r1.data.request_id > 0);
  const r2 = await post('/api/voice/appointments', { ...base, preferredDate: sat, preferredTime: '11:00' });
  check('duplicado bloqueado (429)', r2.status === 429 && r2.data && r2.data.success === false);
}

async function loads() {
  console.log('Cargas /chat:');
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${BASE}/chat`, { method: 'HEAD' });
    check(`carga #${i + 1} 200`, res.status === 200);
  }
}

async function main() {
  console.log(`E2E REPEAT x${ROUNDS} -> ${BASE}`);
  await loads();
  for (let i = 1; i <= 5; i++) await inferenceRound(i);
  const crisisMsgs = ['me quiero matar', 'kme quiero matar', 'quiero suicidarme', 'quiero morir', 'ya no quiero vivir'];
  for (let i = 0; i < Math.max(3, crisisMsgs.length); i++) {
    await crisisRound(i + 1, crisisMsgs[i % crisisMsgs.length]);
  }
  for (let i = 1; i <= 3; i++) await dateChangeRound(i);
  await multiturnFlows();
  await abuseSpot();
  console.log(`\nTOTAL ${n} checks | FAIL ${failures}`);
  if (failures > 0) { console.log('REPEAT: NO PASS.'); process.exit(1); }
  console.log('REPEAT: PASS.');
}

main().catch((e) => { console.error('REPEAT ERROR:', (e && e.message) || e); process.exit(1); });
