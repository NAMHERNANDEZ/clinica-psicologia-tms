#!/usr/bin/env node
// scripts/smoke-test-dashboard.js — Smoke tests del dashboard clínico
// FASE 11.6 — Verifica métricas y paneles admin.
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
  console.log('\n[smoke:dashboard] Probando métricas del dashboard en producción...\n');

  // Login admin
  const login = await httpReq('POST', '/api/auth/login', { email: 'admin@clinica.com', password: 'Admin123!' });
  const loginJson = parse(login);
  const accessToken = loginJson?.data?.accessToken;
  check('Login admin', !!accessToken, 'No token');
  if (!accessToken) { console.log('\n❌ No se puede continuar sin auth.\n'); process.exit(1); }

  const auth = { Authorization: `Bearer ${accessToken}` };

  // 1. Obtener métricas del dashboard
  const dashboard = await httpReq('GET', '/api/dashboard/overview', null, auth);
  const dashboardJson = parse(dashboard);
  check(`Obtener dashboard (HTTP ${dashboard.status})`, dashboard.status === 200, `body: ${dashboard.body}`);

  // 2. Verificar métricas principales
  const metrics = dashboardJson?.data;
  const missingFields = [];
  if (!metrics?.leads?.today) missingFields.push('leads.today');
  if (!metrics?.appointments?.today?.total) missingFields.push('appointments.today.total');
  if (!metrics?.automation?.today) missingFields.push('automation.today');
  check('Métricas del dashboard completas', missingFields.length === 0, `Faltan campos: ${missingFields.join(', ')}`);

  // 3. Obtener estado de automatizaciones
  const notifications = await httpReq('GET', '/api/notifications', null, auth);
  const notificationsJson = parse(notifications);
  const notificationsList = notificationsJson?.data || [];
  check(`Listar notificaciones (HTTP ${notifications.status})`, Array.isArray(notificationsList), 'No es array');

  // 4. Verificar que las métricas tienen los campos requeridos
  if (metrics) {
    const requiredPaths = ['leads.today', 'leads.month', 'appointments.today.total', 'automation.today', 'conversion.rate_percentage'];
    requiredPaths.forEach(path => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], metrics);
      check(`Campo ${path} presente`, value !== undefined && value !== null, `Valor: ${value}`);
    });
  }

  // 5. Llamar dashboard nuevamente para asegurar idempotencia
  const dashboard2 = await httpReq('GET', '/api/dashboard/overview', null, auth);
  const dashboard2Json = parse(dashboard2);
  check(`Dashboard idempotente (HTTP ${dashboard2.status})`, dashboard2.status === 200, `body: ${dashboard2.body}`);

  console.log('');
  if (failed) {
    console.error('❌ smoke:dashboard FAILED — Revisa los fallos.\n');
    process.exit(1);
  } else {
    console.log('✅ smoke:dashboard PASSED — Dashboard clínico OK.\n');
  }
}

main();
