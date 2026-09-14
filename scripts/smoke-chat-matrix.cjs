#!/usr/bin/env node
/**
 * SMOKE CHAT MATRIX — corre contra PRODUCCIÓN (o la base indicada).
 * Verifica condiciones CRÍTICAS negativas + positivas del chat/voz.
 * Sale 1 si falla cualquier prueba crítica (bloquea release).
 *
 * Uso: node scripts/smoke-chat-matrix.cjs [BASE_URL]
 */
const BASE = process.argv[2] || 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';

let failures = 0;
let warnings = 0;
let n = 0;

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

function check(name, cond, critical = true, detail = '') {
  n++;
  if (cond) {
    console.log(`  PASS ${name}`);
  } else if (critical) {
    failures++;
    console.log(`  FAIL ${name} ${detail}`);
  } else {
    warnings++;
    console.log(`  WARN ${name} ${detail}`);
  }
}

function noSlots(m) { return !/horarios disponibles/i.test(m || ''); }
function noSvg(m) { return !(m || '').includes('<svg'); }
function nonEmpty(m) { return typeof m === 'string' && m.length > 20; }

async function main() {
  console.log(`SMOKE CHAT MATRIX -> ${BASE}`);

  // 1. CRISIS por voz: determinista, sin slots, sin Calendar.
  console.log('CRISIS voice:');
  {
    const sid = `smoke-crisis-${Date.now()}`;
    const r = await post('/api/voice/chat', { message: 'kme quiero matar', sessionId: sid, voice: false });
    check('crisis voice 200', r.status === 200, true, `status=${r.status}`);
    check('crisis flag', r.data && r.data.crisis === true);
    check('crisis mensaje no vacío', nonEmpty(r.data && r.data.message));
    check('crisis sin horarios', noSlots(r.data && r.data.message));
    check('crisis sin svg', noSvg(r.data && r.data.message));
  }

  // 2. CRISIS por /api/chat.
  console.log('CRISIS secretary:');
  {
    const r = await post('/api/chat', { message: 'me quiero suicidar' });
    check('crisis chat 200', r.status === 200, true, `status=${r.status}`);
    check('crisis action transfer_human', r.data && r.data.action === 'transfer_human');
    check('crisis chat sin horarios', noSlots(r.data && r.data.message));
  }

  // 3. PRICING nunca availability.
  console.log('PRICING:');
  {
    const r = await post('/api/voice/chat', { message: 'COSTO TMS', sessionId: `smoke-p-${Date.now()}`, voice: false });
    check('pricing 200', r.status === 200, true, `status=${r.status}`);
    check('pricing $1,500', (r.data && r.data.message || '').includes('$1,500'));
    check('pricing sin horarios', noSlots(r.data && r.data.message));
  }

  // 4. TMS nunca modalidad.
  console.log('TMS modality:');
  {
    const r = await post('/api/voice/chat', { message: 'QUIERO AGENDAR TMS', sessionId: `smoke-t-${Date.now()}`, voice: false });
    check('tms 200', r.status === 200, true, `status=${r.status}`);
    check('tms sin modalidad', !/l.nea o presencial/i.test(r.data && r.data.message || ''));
  }

  // 5. Terapia SÍ modalidad.
  console.log('Therapy modality:');
  {
    const r = await post('/api/voice/chat', { message: 'QUIERO AGENDAR PSICOLOGIA', sessionId: `smoke-th-${Date.now()}`, voice: false });
    check('terapia 200', r.status === 200, true, `status=${r.status}`);
    check('terapia pregunta modalidad', /presencial/i.test(r.data && r.data.message || ''));
  }

  // 6. Cambio de fecha real (agnóstico a la fecha actual: el lunes
  // resuelve según America/Mexico_City; lo crítico es fecha NUEVA fechada).
  console.log('Date change:');
  {
    const sid = `smoke-d-${Date.now()}`;
    await post('/api/voice/chat', { message: 'QUIERO AGENDAR TMS', sessionId: sid, voice: false });
    const s1 = await post('/api/voice/chat', { message: 'el sabado', sessionId: sid, voice: false });
    const m1 = (s1.data && s1.data.message) || '';
    const satMatch = m1.match(/Sábado, (\d{1,2} de \w+)/i);
    check('slots sábado fechados', !!satMatch && /horarios realmente disponibles para Sábado/i.test(m1));
    const s2 = await post('/api/voice/chat', { message: 'Y EL LUNES', sessionId: sid, voice: false });
    const m2 = (s2.data && s2.data.message) || '';
    check('slots lunes fechados (nueva fecha)', /horarios realmente disponibles para Lunes/i.test(m2));
    check('sin replay del sábado', !satMatch || !m2.includes(satMatch[0]));
  }

  // 7. Voz general: 200 con LLM o 503 explícito (jamás éxito falso ni slots).
  console.log('Voice general:');
  {
    const r = await post('/api/voice/chat', { message: 'HOLA', sessionId: `smoke-v-${Date.now()}`, voice: false });
    const ok = r.status === 200 || (r.status === 503 && /LLM FREE/i.test((r.data && r.data.error) || ''));
    check('voz general 200-o-503-explícito', ok, false, `status=${r.status}`);
    if (r.status === 200) {
      check('voz general sin slots', noSlots(r.data && r.data.message), false);
      check('voz general no vacía', nonEmpty(r.data && r.data.message), false);
    }
  }

  // 8. /chat page viva.
  console.log('Pages:');
  {
    const res = await fetch(`${BASE}/chat`, { method: 'HEAD' });
    check('/chat 200', res.status === 200, true, `status=${res.status}`);
    const res2 = await fetch(`${BASE}/voz`, { method: 'HEAD' });
    check('/voz 200', res2.status === 200, true, `status=${res2.status}`);
  }

  // 9. STT vivo con asset real del repo (usa la implementación existente).
  console.log('STT live:');
  {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const wavPath = path.resolve(__dirname, '..', 'tests', 'audio', 'habla-humana-hola.wav');
    if (!fs.existsSync(wavPath)) {
      check('stt asset presente', false, true, 'falta tests/audio/habla-humana-hola.wav');
    } else {
      const buf = fs.readFileSync(wavPath);
      const blob = new Blob([buf], { type: 'audio/wav' });
      const form = new FormData();
      form.append('audio', blob, 'habla-humana-hola.wav');
      form.append('language', 'es');
      form.append('mimeType', 'audio/wav');
      const res = await fetch(`${BASE}/api/chat/stt`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      check('stt 200', res.status === 200, true, `status=${res.status} err=${data && data.error}`);
      check('stt success+text (contrato VoiceChat)', data && data.success === true && typeof data.text === 'string' && data.text.trim().length > 0, true, `body=${JSON.stringify(data).slice(0, 160)}`);
    }
  }

  // 10. TTS vivo (implementación existente).
  console.log('TTS live:');
  {
    const r = await post('/api/voice/tts', { text: 'Hola, prueba de voz.' });
    check('tts 200', r.status === 200, true, `status=${r.status}`);
    check('tts audio no vacío', r.data && typeof r.data.audio === 'string' && r.data.audio.length > 1000, true);
  }

  // 11. voice/chat con voice=true trae audio (cadena completa).
  console.log('Voice chain:');
  {
    const r = await post('/api/voice/chat', { message: 'COSTO', sessionId: `smoke-chain-${Date.now()}`, voice: true });
    check('voice/chat 200', r.status === 200, true, `status=${r.status}`);
    check('voice/chat con audio TTS', !!(r.data && r.data.audio && r.data.audio.length > 1000), true);
  }

  console.log(`\nTOTAL ${n} checks | FAIL ${failures} | WARN ${warnings}`);
  if (failures > 0) {
    console.log('SMOKE: NO PASS — release bloqueado.');
    process.exit(1);
  }
  console.log('SMOKE: PASS.');
}

main().catch((e) => { console.error('SMOKE ERROR:', e && e.message); process.exit(1); });
