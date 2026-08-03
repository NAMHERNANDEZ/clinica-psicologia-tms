#!/usr/bin/env node
// scripts/smoke-test-automation.js — Smoke tests del motor de automatización
// FASE 11.5 — Verifica ejecución automática de eventos.
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
  console.log('\n[smoke:automation] Probando flujo de automatización en producción...\n');

  // Login admin
  const login = await httpReq('POST', '/api/auth/login', { email: 'admin@clinica.com', password: 'Admin123!' });
  const loginJson = parse(login);
  const accessToken = loginJson?.data?.accessToken;
  check('Login admin', !!accessToken, 'No token');
  if (!accessToken) { console.log('\n❌ No se puede continuar sin auth.\n'); process.exit(1); }

  const auth = { Authorization: `Bearer ${accessToken}` };

  // 1. Crear lead de prueba para probar automación
  const postLead = await httpReq('POST', '/api/leads', {
    nombre: 'Smoke Automation',
    telefono: '5559991111',
    email: 'smoke.automation@test.com',
    servicio_interesado: 'TMS'
  }, auth);
  const leadJson = parse(postLead);
  const leadId = leadJson?.data?.id;
  check(`Crear lead de prueba (id ${leadId || 'null'})`, !!leadId, postLead.body);

  if (leadId) {
    // 2. Crear cita desde lead (debería ejecutar automación)
    const today = new Date().toISOString().split('T')[0];
    const appt = await httpReq('POST', '/api/appointments', {
      lead_id: leadId,
      date: today,
      time: '10:00',
      type: 'TMS'
    }, auth);
    const apptJson = parse(appt);
    const apptId = apptJson?.data?.id;
    const promoted = apptJson?.data?.promoted;
    check(`Crear cita desde lead (HTTP ${appt.status})`, !!apptId, `body: ${appt.body}`);
    check(`Lead marcado como promovido`, promoted === true, `promoted: ${promoted}`);

    // 3. Listar notificaciones
    const notifications = await httpReq('GET', '/api/notifications', null, auth);
    const notificationsJson = parse(notifications);
    const notificationsList = notificationsJson?.data || [];
    check(`Listar notificaciones (HTTP ${notifications.status})`, Array.isArray(notificationsList), 'No es array');

    // 4. Generar recordatorios (should trigger automation)
    const generateReminders = await httpReq('POST', '/api/reminders/generate', null, auth);
    const generateRemindersJson = parse(generateReminders);
    check(`Generar recordatorios (HTTP ${generateReminders.status})`, generateReminders.status === 200, `body: ${generateReminders.body}`);

    // 5. Ejecutar endpoint de automatización directamente (endpoint de control)
    const automationEvent = await httpReq('POST', '/api/automation/events', {
      event_type: 'APPOINTMENT_CREATED',
      data: apptJson?.data || { id: apptId, clinic_id: 1, patient_id: apptJson?.data?.patient_id }
    }, auth);
    const automationJson = parse(automationEvent);
    check(`Ejecutar evento de automatización manualmente`, automationJson?.success === true, `body: ${automationEvent.body}`);
  }

  console.log('');
  if (failed) {
    console.error('❌ smoke:automation FAILED — Revisa los fallos.\n');
    process.exit(1);
  } else {
    console.log('✅ smoke:automation PASSED — Motor de automatización OK.\n');
  }
}

main();
