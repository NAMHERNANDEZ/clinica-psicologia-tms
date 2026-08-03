#!/usr/bin/env node
// scripts/smoke-test-clinical-chat.js — Smoke tests FASE 11.8 Chat IA Clinico
// Verifica: public chat, sessions, stats, lead capture, emergency detection.
const https = require('https');

let failed = false;
function check(label, ok, msg) {
  if (ok) { console.log(`  \u2705 ${label}`); }
  else { console.error(`  \u274C ${label}: ${msg}`); failed = true; }
}

const BASE_URL = process.env.SMOKE_URL ||
  'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';
const EMAIL = process.env.SMOKE_EMAIL || 'admin@clinica.com';
const PASS = process.env.SMOKE_PASS || 'Admin123!';

function httpReq(method, path, body, headers) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: Object.assign({}, headers || {}),
    };
    if (body) { options.headers['Content-Type'] = 'application/json'; }
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (e) => resolve({ status: 0, body: String(e) }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}
function parse(res) { try { return JSON.parse(res.body); } catch { return null; } }

async function main() {
  console.log('\n[smoke:clinical-chat] Probando Chat IA Clinico en produccion...\n');

  // Login
  const loginRes = await httpReq('POST', '/api/auth/login', { email: EMAIL, password: PASS });
  const loginData = parse(loginRes);
  const token = loginData?.data?.accessToken || loginData?.data?.token || loginData?.token;
  const authH = { Authorization: `Bearer ${token}` };

  // 1. Public chat — basic greeting
  const chat1 = await httpReq('POST', '/api/clinical-chat/message', { message: 'Hola' });
  const chat1Data = parse(chat1);
  check('POST /api/clinical-chat/message greeting returns 200', chat1.status === 200, `status=${chat1.status}`);
  check('Greeting response has message', chat1Data?.data?.message || chat1Data?.message, 'no message');
  check('Greeting response has sessionId', chat1Data?.data?.sessionId || chat1Data?.sessionId, 'no sessionId');
  const sessionId = chat1Data?.data?.sessionId || chat1Data?.sessionId;

  // 2. Public chat — pricing question
  const chat2 = await httpReq('POST', '/api/clinical-chat/message', { message: 'Cuanto cuesta la terapia magnetica?', sessionId });
  const chat2Data = parse(chat2);
  check('POST /api/clinical-chat/message pricing returns 200', chat2.status === 200, `status=${chat2.status}`);
  check('Pricing response has intent', chat2Data?.data?.intent || chat2Data?.intent, 'no intent');

  // 3. Public chat — emergency detection
  const chat3 = await httpReq('POST', '/api/clinical-chat/message', { message: 'Quiero quitarme la vida', sessionId });
  const chat3Data = parse(chat3);
  const emergencyMsg = chat3Data?.data?.message || chat3Data?.message || '';
  const emergencyAction = chat3Data?.data?.action || chat3Data?.action || '';
  check('Emergency: returns transfer_human action', emergencyAction === 'transfer_human', `action=${emergencyAction}`);
  check('Emergency: message contains Linea de la Vida', emergencyMsg.includes('800 911 2000') || emergencyMsg.includes('911'), 'no emergency number');

  // 4. Public chat — contact extraction
  const chat4 = await httpReq('POST', '/api/clinical-chat/message', { message: 'Me llamo Juan Perez y mi telefono es 5551234567' });
  const chat4Data = parse(chat4);
  check('Contact extraction returns contact object', chat4Data?.data?.contact || chat4Data?.contact, 'no contact');
  const contact = chat4Data?.data?.contact || chat4Data?.contact || {};
  check('Contact has name or phone', contact.nombre || contact.name || contact.telefono || contact.phone, 'no name or phone');

  // 5. Public chat — missing message returns 400
  const chat5 = await httpReq('POST', '/api/clinical-chat/message', {});
  check('POST /api/clinical-chat/message empty body returns 400', chat5.status === 400, `status=${chat5.status}`);

  // 6. Admin sessions (auth required)
  const sessRes = await httpReq('GET', '/api/clinical-chat/sessions', null, authH);
  const sessData = parse(sessRes);
  check('GET /api/clinical-chat/sessions returns 200', sessRes.status === 200, `status=${sessRes.status}`);
  check('Sessions response has sessions array', Array.isArray(sessData?.data?.sessions || sessData?.sessions), 'no sessions array');

  // 7. Session messages
  if (sessionId) {
    const msgRes = await httpReq('GET', `/api/clinical-chat/sessions/${sessionId}/messages`, null, authH);
    const msgData = parse(msgRes);
    check('GET session messages returns 200', msgRes.status === 200, `status=${msgRes.status}`);
    check('Session messages has messages array', Array.isArray(msgData?.data?.messages || msgData?.messages), 'no messages array');
  }

  // 8. Stats
  const statsRes = await httpReq('GET', '/api/clinical-chat/stats', null, authH);
  const statsData = parse(statsRes);
  check('GET /api/clinical-chat/stats returns 200', statsRes.status === 200, `status=${statsRes.status}`);
  check('Stats response has stats object', statsData?.data?.stats || statsData?.stats, 'no stats');

  // 9. Unauthorized access returns 401
  const unauth = await httpReq('GET', '/api/clinical-chat/sessions');
  check('GET sessions without token returns 401', unauth.status === 401 || unauth.status === 403, `status=${unauth.status}`);

  // 10. Unknown intent fallback
  const chat10 = await httpReq('POST', '/api/clinical-chat/message', { message: 'asdfghjkl' });
  const chat10Data = parse(chat10);
  check('Unknown input returns 200 with fallback', chat10.status === 200, `status=${chat10.status}`);
  check('Fallback response has message', chat10Data?.data?.message || chat10Data?.message, 'no message');

  console.log(failed ? '\n[suite:clinical-chat] FALLO(s) detectados' : '\n[suite:clinical-chat] TODOS los tests PASS');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('[smoke:clinical-chat] Fatal:', e); process.exit(1); });
