#!/usr/bin/env node
// scripts/smoke-test-leads.js — Smoke tests del flujo de captación y CRM de leads
// FASE 11.3 — Verifica chat, seguridad, CRUD de leads, notas y auditoría en producción.
const https = require('https');

let failed = false;
function check(label, ok, msg) {
  if (ok) { console.log(`  \u2705 ${label}`); }
  else    { console.error(`  \u274C ${label}: ${msg}`); failed = true; }
}

const BASE_URL = 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';

function httpReq(method, path, body, headers) {
  return new Promise((resolve) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: headers || {},
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', (e) => resolve({ status: 0, body: String(e) }));
    if (body) { req.write(JSON.stringify(body)); }
    req.end();
  });
}

function parse(res) {
  try { return JSON.parse(res.body); } catch { return null; }
}

async function main() {
  console.log('\n[smoke:leads] Probando flujo de captación y CRM en producción...\n');

  // 1. Chat público (pricing)
  const chat = await httpReq('POST', '/api/chat', { message: 'Cuanto cuesta la TMS' });
  check(`Chat público (pricing TMS, HTTP ${chat.status})`, chat.status === 200 && /1500|1,500|costo/i.test(chat.body), 'No devolvió costo TMS');

  // 2. Seguridad: GET /api/leads sin auth -> 401/403
  const sec = await httpReq('GET', '/api/leads');
  check(`Seguridad GET /api/leads sin auth (HTTP ${sec.status})`, sec.status === 401 || sec.status === 403, `Esperaba 401/403, obtuvo ${sec.status}`);

  // 3. POST /api/leads (crear lead, público)
  const newLead = {
    nombre: 'Smoke CRM',
    telefono: '5550009876',
    email: 'smoke@test.com',
    ciudad: 'Prueba',
    servicio_interesado: 'TMS',
    motivo: 'Smoke test FASE 11.3',
  };
  const post = await httpReq('POST', '/api/leads', newLead);
  const postJson = parse(post);
  let createdId = postJson?.data?.id || null;
  check(`POST /api/leads (HTTP ${post.status})`, createdId != null, `No se creó el lead: ${post.body}`);

  // 4. Health
  const health = await httpReq('GET', '/api/health');
  check(`Health endpoint (HTTP ${health.status})`, health.status === 200, `Health falló: ${health.status}`);

  // 5. Login admin para endpoints protegidos del CRM
  const login = await httpReq('POST', '/api/auth/login', { email: 'admin@clinica.com', password: 'Admin123!' });
  const loginJson = parse(login);
  const accessToken = loginJson?.data?.accessToken;
  if (accessToken) {
    console.log('  \u2705 Login admin OK');
  } else {
    check('Login admin', false, `No se obtuvo token: ${login.body}`);
    console.log('\n  Nota: los checks de edición/notas/borrado requieren login admin. Se omiten.\n');
  }

  if (accessToken && createdId) {
    const auth = { Authorization: `Bearer ${accessToken}` };

    // GET detalle con audit + notes
    const detail = await httpReq('GET', `/api/leads/${createdId}`, null, auth);
    const dJson = parse(detail);
    check(`GET /api/leads/:id (HTTP ${detail.status})`, detail.status === 200 && (dJson?.data?.id ?? dJson?.data?.lead?.id) === createdId, `No devolvió el lead`);

    // PATCH: editar email/motivo
    const patch = await httpReq('PATCH', `/api/leads/${createdId}`, { email: 'actualizado@test.com', motivo: 'Motivo editado' }, auth);
    check(`PATCH /api/leads/:id (HTTP ${patch.status})`, patch.status === 200, `Falló edición: ${patch.body}`);

    // POST nota
    const note = await httpReq('POST', `/api/leads/${createdId}/notes`, { note: 'Contacto realizado por el equipo' }, auth);
    check(`POST /api/leads/:id/notes (HTTP ${note.status})`, note.status === 201 || note.status === 200, `Falló nota: ${note.body}`);

    // GET detalle con notas
    const detail2 = await httpReq('GET', `/api/leads/${createdId}`, null, auth);
    const d2 = parse(detail2);
    const notesArr = d2?.data?.notes || [];
    check(`Nota persistida en detalle (${notesArr.length})`, notesArr.length >= 1, 'No apareció la nota en detalle');

    // PUT estado
    const estado = await httpReq('PUT', `/api/leads/${createdId}/estado`, { estado: 'CONTACTADO' }, auth);
    check(`PUT /api/leads/:id/estado (HTTP ${estado.status})`, estado.status === 200, `Falló cambio de estado: ${estado.body}`);

    // DELETE soft
    const del = await httpReq('DELETE', `/api/leads/${createdId}`, null, auth);
    check(`DELETE /api/leads/:id soft (HTTP ${del.status})`, del.status === 200, `Falló borrado: ${del.body}`);

    // GET detalle tras borrar -> 404 (soft delete oculto)
    const afterDel = await httpReq('GET', `/api/leads/${createdId}`, null, auth);
    check(`Lead eliminado ya no visible (HTTP ${afterDel.status})`, afterDel.status === 404, `Se esperaba 404 tras soft delete`);
  }

  console.log('');
  if (failed) {
    console.error('❌ smoke:leads FAILED — Revisa los fallos.\n');
    process.exit(1);
  } else {
    console.log('✅ smoke:leads PASSED — Flujo de captación y CRM OK.\n');
  }
}

main();