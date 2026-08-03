import { chromium } from 'playwright';

const URL = 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';
const API = URL;

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

const results = {};
let allPass = true;

function logPass(name) { results[name] = 'PASS'; console.log(`✅ ${name}`); }
function logFail(name, reason) { results[name] = `FAIL: ${reason}`; allPass = false; console.log(`❌ ${name}: ${reason}`); }

// Step 1: Register test user
try {
  const reg = await fetch(API + '/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gate@test.tms', password: 'Gate1234!', name: 'Gate Test', clinic_name: 'Gate Clinic' })
  });
  const d = await reg.json();
  if (d.success) logPass('Register test user');
  else logFail('Register test user', d.error);
} catch (e) { logFail('Register test user', e.message); }

// Step 2: Login via API to get session cookie
let cookies = null;
try {
  const login = await fetch(API + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gate@test.tms', password: 'Gate1234!' })
  });
  const d = await login.json();
  if (d.success) {
    cookies = await context.request.storageState();
    logPass('Login via API');
  } else {
    logFail('Login via API', d.error);
  }
} catch (e) { logFail('Login via API', e.message); }

// Step 3: Navigate to login page, fill credentials, submit
async function loginViaBrowser() {
  await page.goto(`${URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Check if already logged in
  const alreadyLoggedIn = await page.evaluate(() => {
    return document.querySelector('a[href="/app/dashboard"]') !== null;
  });

  if (!alreadyLoggedIn) {
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill('gate@test.tms');
    await passwordInput.fill('Gate1234!');
    await submitBtn.click();
    await page.waitForTimeout(3000);
  } else {
    logPass('Already logged in (session cookie)');
  }
}

// Step 4: Auth flow check via browser
try {
  await loginViaBrowser();
  // Check if redirected to dashboard
  const currentUrl = page.url();
  if (currentUrl.includes('/app/dashboard')) {
    logPass('Login redirects to dashboard');
  } else if (currentUrl.includes('/login')) {
    logFail('Login redirects to dashboard', 'Still on login page');
  } else {
    logPass('Login flow (redirected to: ' + currentUrl + ')');
  }
} catch (e) { logFail('Login flow', e.message); }

// Step 5: Track console errors during navigation
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text();
    const isExpected = text.includes('401') || text.includes('No autenticado') ||
      text.includes("Content Security Policy") || text.includes("fonts.googleapis");
    if (!isExpected) errors.push(text);
  }
});

// Step 6: Navigate all protected routes
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
      logFail(`Route ${name} (${route})`, 'ErrorBoundary');
    } else {
      logPass(`Route ${name} (${route})`);
    }
  } catch (e) {
    logFail(`Route ${name} (${route})`, e.message);
  }
}

// Step 7: Final console error check
if (errors.length > 0) {
  console.log('\n=== UNEXPECTED CONSOLE ERRORS ===');
  errors.forEach(e => console.log(`❌ ${e}`));
  allPass = false;
}

// Final report
console.log('\n=== AUTH GATE VALIDATION ===');
console.log(allPass ? '🎉 ALL GATES PASSED' : '❌ SOME GATES FAILED');

await browser.close();
