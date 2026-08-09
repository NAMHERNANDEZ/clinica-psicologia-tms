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
  console.log('\n[smoke:followup] Probando Seguimiento Clínico en produccion...\n');

  // Login
  const loginRes = await httpReq('POST', '/api/auth/login', { email: EMAIL, password: PASS });
  const loginData = JSON.parse(loginRes.body);
  const token = loginData?.data?.accessToken || loginData?.data?.token || loginData?.token;
  if (!token) { console.log('FALLO: no se pudo iniciar sesion'); process.exit(1); }
  const h = { Authorization: `Bearer ${token}` };

  // Create a followup
  const createRes = await httpReq('POST', '/api/followups', {
    patient_id: 1,
    type: 'CONTROL',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    notes: 'Seguimiento de rutina',
    priority: 'NORMAL'
  }, h);
  const createData = JSON.parse(createRes.body);
  check('POST /api/followups returns 201', createRes.status === 201, `status=${createRes.status}`);
  check('Create response has id', typeof createData?.data?.id === 'number', JSON.stringify(createData));
  const followupId = createData?.data?.id;

  // Get followup
  const getRes = await httpReq('GET', `/api/followups/${followupId}`, null, h);
  const getData = JSON.parse(getRes.body);
  check('GET /api/followups/:id returns 200', getRes.status === 200, `status=${getRes.status}`);
  check('Get response has followup', typeof getData?.data?.id === 'number', JSON.stringify(getData));

  // List followups
  const listRes = await httpReq('GET', '/api/followups?patient_id=1', null, h);
  const listData = JSON.parse(listRes.body);
  check('GET /api/followups?patient_id=1 returns 200', listRes.status === 200, `status=${listRes.status}`);
  check('List has followups array', Array.isArray(listData?.data?.followups), JSON.stringify(listData));

  // Update followup
  const updateRes = await httpReq('PUT', `/api/followups/${followupId}`, {
    notes: 'Seguimiento actualizado',
    status: 'COMPLETED'
  }, h);
  const updateData = JSON.parse(updateRes.body);
  check('PUT /api/followups/:id returns 200', updateRes.status === 200, `status=${updateRes.status}`);

  // Complete followup
  const completeRes = await httpReq('POST', `/api/followups/${followupId}/complete`, {
    outcome: 'EXITOSO',
    notes: 'Paciente estable'
  }, h);
  const completeData = JSON.parse(completeRes.body);
  check('POST /api/followups/:id/complete returns 200', completeRes.status === 200, `status=${completeRes.status}`);

  // Delete followup (soft delete)
  const deleteRes = await httpReq('DELETE', `/api/followups/${followupId}`, null, h);
  check('DELETE /api/followups/:id returns 200', deleteRes.status === 200, `status=${deleteRes.status}`);

  console.log('\n[suite:followup] ' + (failed === 0 ? '\u2705 TODOS los tests PASS' : `\u274C ${failed} tests FALLARON`));
  if (failed) process.exit(1);
}

main().catch(e => { console.error('Smoke test error:', e); process.exit(1); });