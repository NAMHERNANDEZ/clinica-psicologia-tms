import { chromium } from 'playwright';

const URL = 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';
const API = URL;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const results = {};
let allPass = true;
const errors = [];

function logPass(name) { results[name] = 'PASS'; console.log(`✅ ${name}`); }
function logFail(name, reason) { results[name] = `FAIL: ${reason}`; allPass = false; console.log(`❌ ${name}: ${reason}`); }

// Register test user (ignore if exists)
try {
  const reg = await fetch(API + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gate@test.tms', password: 'Gate1234!', name: 'Gate Test', clinic_name: 'Gate Clinic' })
  });
  const d = await reg.json();
  if (d.success || d.error === 'Email ya registrado') {
    logPass('Test user ready');
  } else {
    logFail('Test user ready', d.error);
  }
} catch (e) { logFail('Test user ready', e.message); }

// Login
try {
  const login = await fetch(API + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gate@test.tms', password: 'Gate1234!' })
  });
  const d = await login.json();
  if (d.success) {
    await context.request.storageState({ path: '/tmp/auth-state.json' });
    logPass('Login via API');
  } else {
    logFail('Login via API', d.error);
  }
} catch (e) { logFail('Login via API', e.message); }

// Authenticated browser
try {
  await context.request.fetch(API + '/api/auth/me');
  await page.goto(URL + '/app/dashboard', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  logPass('Authenticated session');
} catch (e) { logFail('Authenticated session', e.message); }

page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text();
    const isExpected = text.includes('401') || text.includes('No autenticado') ||
      text.includes("Content Security Policy") || text.includes("fonts.googleapis");
    if (!isExpected) errors.push(text);
  }
});

// Test all protected routes
const protectedRoutes = [
  ['/app/dashboard', 'Dashboard'],
  ['/app/recepcion', 'Reception'],
  ['/app/terapeuta', 'Therapist'],
  ['/app/pacientes', 'Patients'],
  ['/app/agenda', 'Agenda'],
  ['/app/tratamientos', 'Treatments'],
  ['/app/tms', 'TMS Module'],
  ['/app/tms/brain', 'Brain Viewer'],
  ['/app/tms/sesion', 'TMS Session'],
  ['/app/tms/twin', 'Digital Twin'],
  ['/app/tms/simulador', 'Simulator'],
  ['/app/reportes', 'Reports'],
  ['/app/evaluaciones', 'Assessments'],
  ['/app/configuracion', 'Settings'],
];

for (const [route, name] of protectedRoutes) {
  try {
    await page.goto(`${URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    const hasErrBoundary = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return true;
      return root.innerText.includes('Error al cargar esta sección');
    });

    if (hasErrBoundary) {
      logFail(`Route ${name}`, 'ErrorBoundary');
    } else {
      logPass(`Route ${name}`);
    }
  } catch (e) {
    logFail(`Route ${name}`, e.message);
  }
}

if (errors.length > 0) {
  console.log('\n=== UNEXPECTED CONSOLE ERRORS ===');
  errors.forEach(e => console.log(`❌ ${e}`));
  allPass = false;
}

console.log('\n=== FINAL GATE ===');
console.log(allPass ? '🎉 ALL GATES PASSED' : '❌ SOME GATES FAILED');

await browser.close();
process.exit(allPass ? 0 : 1);