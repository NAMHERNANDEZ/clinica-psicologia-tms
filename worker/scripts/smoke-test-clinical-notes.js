#!/usr/bin/env node
// Smoke tests FASE 12.3: Notas Clínicas Profesionales
// Verifica: templates, create note with template, versionado, lock, sign, cosign, audit trail

const https = require('https');

let failed = 0;
function check(label, ok, msg) {
  if (ok) { console.log(`  \u2705 ${label}`); }
  else { console.error(`  \u274C ${label}: ${msg || ''}`); failed++; }
}

const BASE_URL = process.env.SMOKE_URL ||
  'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';
const EMAIL = process.env.SMOKE_EMAIL || 'admin@clinica.com';
const PASS = process.env.SMOKE_PASS || process.env.ADMIN_PASSWORD;

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
  console.log('\n[smoke:clinical-notes] Probando Notas Clinicas Profesionales en produccion...\n');

  // Login
  const loginRes = await httpReq('POST', '/api/auth/login', { email: EMAIL, password: PASS });
  const loginData = parse(loginRes);
  const token = loginData?.data?.accessToken || loginData?.data?.token || loginData?.token;
  if (!token) { console.log('FALLo: no se pudo iniciar sesion'); process.exit(1); }
  const h = { Authorization: `Bearer ${token}` };

  // 1. GET /api/clinical-notes/templates
  const tplRes = await httpReq('GET', '/api/clinical-notes/templates', null, h);
  const tplData = parse(tplRes);
  check('GET /api/clinical-notes/templates returns 200', tplRes.status === 200, `status=${tplRes.status}`);
  check('Templates response has templates array', Array.isArray(tplData?.data?.templates), JSON.stringify(tplData));
  check('Has SOAP template', tplData?.data?.templates?.some(t => t.template_type === 'SOAP'), 'no SOAP');
  check('Has DAP template', tplData?.data?.templates?.some(t => t.template_type === 'DAP'), 'no DAP');
  check('Has BIRP template', tplData?.data?.templates?.some(t => t.template_type === 'BIRP'), 'no BIRP');
  check('Has Libre template', tplData?.data?.templates?.some(t => t.template_type === 'Libre' || t.template_type === 'LIBRE'), 'no Libre');

  // 2. POST /api/clinical-notes (with template_type)
  const createRes = await httpReq('POST', '/api/clinical-notes', {
    patient_id: 1,
    note: 'Nota de prueba para FASE 12.3 — evaluacion inicial del paciente',
    template_type: 'SOAP',
    risk_level: 'low',
    status: 'draft',
  }, h);
  const createData = parse(createRes);
  check('POST /api/clinical-notes with template returns 201', createRes.status === 201, `status=${createRes.status}`);
  check('Create response has id', createData?.data?.id !== undefined, JSON.stringify(createData));
  const noteId = createData?.data?.id;

  // 3. PUT /api/clinical-notes/:id (update note)
  const updateRes = await httpReq('PUT', `/api/clinical-notes/${noteId}`, {
    note: 'Nota de prueba actualizada — FASE 12.3 con campos estructurados',
    risk_level: 'medium',
  }, h);
  const updateData = parse(updateRes);
  check('PUT /api/clinical-notes/:id returns 200', updateRes.status === 200, `status=${updateRes.status}`);
  check('Update response has version incremented', updateData?.data?.version !== undefined, JSON.stringify(updateData));

  // 4. POST /api/clinical-notes/:id/lock
  const lockRes = await httpReq('POST', `/api/clinical-notes/${noteId}/lock`, null, h);
  const lockData = parse(lockRes);
  check('POST /api/clinical-notes/:id/lock returns 200', lockRes.status === 200, `status=${lockRes.status}`);
  check('Lock response has is_locked=1', lockData?.data?.is_locked === 1, JSON.stringify(lockData));

  // 5. PUT /api/clinical-notes/:id on locked note should fail
  const updateLockedRes = await httpReq('PUT', `/api/clinical-notes/${noteId}`, {
    note: 'Esto no deberia funcionar — nota bloqueada',
  }, h);
  check('PUT on locked note returns 403', updateLockedRes.status === 403, `status=${updateLockedRes.status}`);

  // 6. POST /api/clinical-notes/:id/sign
  const signRes = await httpReq('POST', `/api/clinical-notes/${noteId}/sign`, null, h);
  const signData = parse(signRes);
  check('POST /api/clinical-notes/:id/sign returns 200', signRes.status === 200, `status=${signRes.status}`);
  check('Sign response has signed_at', signData?.data?.signed_at !== undefined, JSON.stringify(signData));
  check('Sign response has signature_hash', signData?.data?.signature_hash !== undefined, JSON.stringify(signData));

  // 7. POST /api/clinical-notes/:id/cosign (admin can cosign)
  const cosignRes = await httpReq('POST', `/api/clinical-notes/${noteId}/cosign`, null, h);
  const cosignData = parse(cosignRes);
  check('POST /api/clinical-notes/:id/cosign returns 200', cosignRes.status === 200, `status=${cosignRes.status}`);
  check('Cosign response has cosigned_at', cosignData?.data?.cosigned_at !== undefined, JSON.stringify(cosignData));

  // 8. GET /api/clinical-notes/:id/versions
  const versionsRes = await httpReq('GET', `/api/clinical-notes/${noteId}/versions`, null, h);
  const versionsData = parse(versionsRes);
  check('GET /api/clinical-notes/:id/versions returns 200', versionsRes.status === 200, `status=${versionsRes.status}`);
  check('Versions has 2 entries', versionsData?.data?.versions?.length >= 2, JSON.stringify(versionsData));

  // 9. GET /api/clinical-notes/:id/audit
  const auditRes = await httpReq('GET', `/api/clinical-notes/${noteId}/audit`, null, h);
  const auditData = parse(auditRes);
  check('GET /api/clinical-notes/:id/audit returns 200', auditRes.status === 200, `status=${auditRes.status}`);
  check('Audit has multiple entries', auditData?.data?.audit?.length >= 3, JSON.stringify(auditData));

  // 10. Verify note state
  const getRes = await httpReq('GET', `/api/clinical-notes/1`, null, h);
  const getData = parse(getRes);
  check('GET patient notes returns 200 after all operations', getRes.status === 200, `status=${getRes.status}`);
  const notes = getData?.data?.notes || [];
  const note = notes.find(n => n.id === noteId);
  check('Note is signed', note?.signed_at !== null, JSON.stringify(getData));
  check('Note is locked', note?.is_locked === 1, JSON.stringify(getData));

  console.log(`\n[suite:clinical-notes] ${failed === 0 ? 'TODOS los tests PASS' : failed + ' FALLO(s) detectados'}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
