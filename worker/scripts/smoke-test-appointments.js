#!/usr/bin/env node
// scripts/smoke-test-appointments.js — Smoke tests del flujo Lead→Cita→Agenda
// FASE 11.4 — Verifica crear cita desde lead, listar agenda, cambiar estado, soft delete.
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
    if (body) options.headers['Content-Type'] = 'application/json';
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
  console.log('\n[smoke:appointments] Probando flujo Lead→Cita→Agenda en producción...\n');

  // Login admin
  const login = await httpReq('POST', '/api/auth/login', { email: 'admin@clinica.com', password: process.env.ADMIN_PASSWORD });
  const loginJson = parse(login);
  const accessToken = loginJson?.data?.accessToken;
  check('Login admin', !!accessToken, 'No token');
  if (!accessToken) { console.log('\n❌ No se puede continuar sin auth.\n'); process.exit(1); }

  const auth = { Authorization: `Bearer ${accessToken}` };

  // 1. Crear lead de prueba
  const postLead = await httpReq('POST', '/api/leads', { nombre: 'Cita Smoke', telefono: '5559990000', email: 'cita.smoke@test.com', servicio_interesado: 'TMS' });
  const leadJson = parse(postLead);
  const leadId = leadJson?.data?.id;
  check(`Crear lead de prueba (id ${leadId || 'null'})`, !!leadId, postLead.body);

  if (leadId) {
    // 2. Crear cita desde lead (promoción lead→paciente)
    const today = new Date().toISOString().split('T')[0];
    const appt = await httpReq('POST', '/api/appointments', { lead_id: leadId, date: today, time: '11:00', type: 'TMS' }, auth);
    const apptJson = parse(appt);
    const apptId = apptJson?.data?.id;
    const patientId = apptJson?.data?.patient_id;
    const promoted = apptJson?.data?.promoted;
    check(`Crear cita desde lead (HTTP ${appt.status})`, !!apptId, `body: ${appt.body}`);
    check(`Paciente creado automáticamente`, !!patientId, `patient_id: ${patientId}`);
    check(`Lead marcado como promovido`, promoted === true, `promoted: ${promoted}`);

    // 3. Listar agenda
    const list = await httpReq('GET', '/api/appointments', null, auth);
    const listJson = parse(list);
    const listArr = listJson?.data?.appointments || listJson?.data || [];
    check(`Listar agenda (HTTP ${list.status})`, Array.isArray(listArr), 'No es array');

    // 4. Cambiar estado de la cita
    if (apptId) {
      const upd = await httpReq('PUT', `/api/appointments/${apptId}`, { status: 'completed' }, auth);
      check(`Cambiar estado cita (HTTP ${upd.status})`, upd.status === 200, upd.body);

      // 5. Soft delete
      const del = await httpReq('DELETE', `/api/appointments/${apptId}`, null, auth);
      check(`Soft delete cita (HTTP ${del.status})`, del.status === 200, del.body);

      // 6. Verificar que la cita borrada no aparece
      const afterDel = await httpReq('GET', `/api/appointments/${apptId}`, null, auth);
      check(`Cita eliminada no visible (HTTP ${afterDel.status})`, afterDel.status === 404 || afterDel.status === 400, `Esperaba 404, obtuvo ${afterDel.status}`);
    }
  }

  console.log('');
  if (failed) {
    console.error('❌ smoke:appointments FAILED — Revisa los fallos.\n');
    process.exit(1);
  } else {
    console.log('✅ smoke:appointments PASSED — Flujo Lead→Cita→Agenda OK.\n');
  }
}

main();