#!/usr/bin/env node
// Smoke tests FASE 12.4: Consentimientos Avanzados
// Verifica: plantillas, crear consentimiento, firma digital, revocación, versionado, auditoria

const https = require('https');

let failed = 0;
function check(label, ok, msg) {
  if (ok) { console.log(`  \u2705 ${label}`); }
  else { console.error(`  \u274C ${label}: ${msg || ''}`); failed++; }
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
  console.log('\n[smoke:consents] Probando Consentimientos Avanzados en produccion...\n');

  // Login
  const loginRes = await httpReq('POST', '/api/auth/login', { email: EMAIL, password: PASS });
  const loginData = parse(loginRes);
  const token = loginData?.data?.accessToken || loginData?.data?.token || loginData?.token;
  if (!token) { console.log('FALLO: no se pudo iniciar sesion'); process.exit(1); }
  const h = { Authorization: `Bearer ${token}` };

  // 1. GET /api/consents/templates
  const tplRes = await httpReq('GET', '/api/consents/templates', null, h);
  const tplData = parse(tplRes);
  check('GET /api/consents/templates returns 200', tplRes.status === 200, `status=${tplRes.status}`);
  check('Templates response has templates array', Array.isArray(tplData?.data?.templates), JSON.stringify(tplData));
  check('Has CONSENTIMIENTO_TERAPIA template', tplData?.data?.templates?.some(t => t.type === 'CONSENTIMIENTO_TERAPIA'), 'no TERAPIA');
  check('Has CONSENTIMIENTO_TMS template', tplData?.data?.templates?.some(t => t.type === 'CONSENTIMIENTO_TMS'), 'no TMS');
  check('Has COMUNICACION_WHATSAPP template', tplData?.data?.templates?.some(t => t.type === 'COMUNICACION_WHATSAPP'), 'no WhatsApp');
  check('Has DATOS_CLINICOS template', tplData?.data?.templates?.some(t => t.type === 'DATOS_CLINICOS'), 'no Datos Clinicos');

  // 2. Create consent from template
  const terapiaTpl = tplData?.data?.templates?.find(t => t.type === 'CONSENTIMIENTO_TERAPIA');
  const createRes = await httpReq('POST', '/api/consents', {
    patient_id: 1,
    type: 'CONSENTIMIENTO_TERAPIA',
    document_hash: 'test_hash_' + Date.now(),
    accepted_at: new Date().toISOString(),
    template_id: terapiaTpl?.id,
    version: terapiaTpl?.version,
  }, h);
  const createData = parse(createRes);
  check('POST /api/consents returns 201', createRes.status === 201, `status=${createRes.status}`);
  check('Create response has id', typeof createData?.data?.id === 'number', JSON.stringify(createData));
  const consentId = createData?.data?.id;

  // 3. Sign consent
  const sigHash = btoa(`${consentId}-${Date.now()}-admin`);
  const signRes = await httpReq('POST', `/api/consents/${consentId}/sign`, {
    signer_type: 'patient',
    signer_name: 'Paciente Test',
    signature_hash: sigHash,
  }, h);
  const signData = parse(signRes);
  check('POST /api/consents/:id/sign returns 200', signRes.status === 200, `status=${signRes.status}, body=${signRes.body}`);
  check('Sign response has signed_at', !!signData?.data?.signed_at, JSON.stringify(signData));

  // 4. Get signatures
  const sigsRes = await httpReq('GET', `/api/consents/${consentId}/signatures`, null, h);
  const sigsData = parse(sigsRes);
  check('GET /api/consents/:id/signatures returns 200', sigsRes.status === 200, `status=${sigsRes.status}`);
  check('Signatures array has entries', Array.isArray(sigsData?.data?.signatures) && sigsData.data.signatures.length > 0, JSON.stringify(sigsData));

  // 5. Get versions
  const versRes = await httpReq('GET', `/api/consents/${consentId}/versions`, null, h);
  const versData = parse(versRes);
  check('GET /api/consents/:id/versions returns 200', versRes.status === 200, `status=${versRes.status}`);
  check('Versions response has array', Array.isArray(versData?.data?.versions), JSON.stringify(versData));

  // 6. Revoke consent
  const revokeRes = await httpReq('PUT', `/api/consents/${consentId}/revoke`, { reason: 'Smoke test revocacion' }, h);
  const revokeData = parse(revokeRes);
  check('PUT /api/consents/:id/revoke returns 200', revokeRes.status === 200, `status=${revokeRes.status}`);
  check('Revoke response has status revoked', revokeData?.data?.status === 'revoked', JSON.stringify(revokeData));

  // 7. Verify lifecycle is revoked
  const getRes = await httpReq('GET', `/api/consents/${consentId}`, null, h);
  const getData = parse(getRes);
  check('GET consent after revoke shows lifecycle revoked', getData?.data?.consent?.lifecycle === 'revoked', `lifecycle=${getData?.data?.consent?.lifecycle}`);
  check('Consent has revoked_reason', !!getData?.data?.consent?.revoked_reason, JSON.stringify(getData));

  // 8. Create another consent for versioning test
  const createRes2 = await httpReq('POST', '/api/consents', {
    patient_id: 1,
    type: 'CONSENTIMIENTO_DATOS',
    document_hash: 'test_hash_v2_' + Date.now(),
    accepted_at: new Date().toISOString(),
  }, h);
  const createData2 = parse(createRes2);
  const consentId2 = createData2?.data?.id;
  check('Second consent created', typeof consentId2 === 'number', JSON.stringify(createData2));

  // 9. List patient consents
  const listRes = await httpReq('GET', '/api/consents?patient_id=1', null, h);
  const listData = parse(listRes);
  check('GET /api/consents?patient_id=1 returns 200', listRes.status === 200, `status=${listRes.status}`);
  check('List has consents array', Array.isArray(listData?.data?.consents) && listData.data.consents.length >= 2, JSON.stringify(listData));

  // 10. Create template
  const newTplRes = await httpReq('POST', '/api/consents/templates', {
    name: 'Consentimiento Smoke Test',
    type: 'CUSTOM',
    content: 'Contenido de prueba para smoke test',
    language: 'es',
  }, h);
  const newTplData = parse(newTplRes);
  check('POST /api/consents/templates returns 201', newTplRes.status === 201, `status=${newTplRes.status}`);
  check('Template create has id', typeof newTplData?.data?.id === 'number', JSON.stringify(newTplData));

  // 11. Update template
  const tplId = newTplData?.data?.id;
  const updTplRes = await httpReq('PUT', `/api/consents/templates/${tplId}`, {
    name: 'Consentimiento Smoke Test Actualizado',
    is_active: 0,
  }, h);
  const updTplData = parse(updTplRes);
  check('PUT /api/consents/templates/:id returns 200', updTplRes.status === 200, `status=${updTplRes.status}`);

  // 12. Verify inactive template filtered
  const tplListRes = await httpReq('GET', '/api/consents/templates?active=true', null, h);
  const tplListData = parse(tplListRes);
  const inactiveFound = tplListData?.data?.templates?.some(t => t.id === tplId);
  check('Inactive template not in active list', !inactiveFound, 'Plantilla inactiva encontrada en lista activa');

  console.log('\n[suite:consents] ' + (failed === 0 ? '\u2705 TODOS los tests PASS' : `\u274C ${failed} tests FALLARON`));
  if (failed) process.exit(1);
}

main().catch(e => { console.error('Smoke test error:', e); process.exit(1); });