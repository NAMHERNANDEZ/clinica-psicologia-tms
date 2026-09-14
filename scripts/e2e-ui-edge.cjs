#!/usr/bin/env node
/**
 * E2E UI REAL con navegador Edge del sistema (cero descargas).
 * Verifica /chat y /voz en PRODUCCIÓN: carga, controles, envío y respuesta.
 * Sale 1 si algo falla (bloquea release).
 *
 * Uso: node scripts/e2e-ui-edge.cjs [BASE_URL]
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

let failures = 0;
let n = 0;

function check(name, cond, detail = '') {
  n++;
  if (cond) console.log(`  PASS ${name}`);
  else { failures++; console.log(`  FAIL ${name} ${detail}`); }
}

async function main() {
  console.log(`E2E UI EDGE -> ${BASE}`);
  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      permissions: ['microphone'],
    });
    const page = await context.newPage();

    // 1. /chat: carga, input, enviar COSTO TMS, respuesta con precio.
    console.log('/chat:');
    await page.goto(`${BASE}/chat`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const input = page.getByPlaceholder(/escribe tu mensaje/i);
    await input.waitFor({ state: 'visible', timeout: 20000 });
    check('chat input visible', true);
    await input.fill('COSTO TMS');
    await page.keyboard.press('Enter');
    const price = page.getByText(/\$1,500/, { exact: false }).first();
    await price.waitFor({ state: 'visible', timeout: 30000 });
    check('chat responde precio', true);
    const chatBody = await page.content();
    check('chat sin horarios', !/horarios disponibles/i.test(chatBody));
    check('chat sin svg literal', !/<svg><|>\s*svg\s*</i.test(chatBody));

    // 2. /chat enlaza a /voz + pestañas Texto|Voz con controles reales.
    const vozLink = page.getByRole('link', { name: /hablar por voz/i });
    await vozLink.waitFor({ state: 'visible', timeout: 20000 });
    check('chat enlaza /voz', (await vozLink.getAttribute('href')) === '/voz');
    const tabTexto = page.getByRole('tab', { name: /texto/i });
    const tabVoz = page.getByRole('tab', { name: /voz/i });
    await tabVoz.waitFor({ state: 'visible', timeout: 10000 });
    check('chat pestaña Texto visible', await tabTexto.isVisible());
    check('chat pestaña Voz visible', await tabVoz.isVisible());
    await tabVoz.click();
    const listenBtn = page.getByRole('button', { name: /iniciar escucha/i });
    await listenBtn.waitFor({ state: 'visible', timeout: 10000 });
    check('chat pestaña Voz muestra controles de voz', true);
    await listenBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'test-results/e2e-chat-voz-tab.png' });
    check('screenshot pestaña Voz guardado', true);
    await tabTexto.click();
    await page.getByPlaceholder(/escribe tu mensaje/i).waitFor({ state: 'visible', timeout: 10000 });
    check('volver a Texto funciona', true);

    // 3. /voz: controles de voz montados y visibles.
    console.log('/voz:');
    await page.goto(`${BASE}/voz`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('button', { name: /iniciar escucha/i }).waitFor({ state: 'visible', timeout: 20000 });
    check('voz botón escucha visible', true);
    await page.getByRole('textbox', { name: /escribe tu mensaje/i }).waitFor({ state: 'visible', timeout: 10000 });
    check('voz input visible', true);
    await page.getByRole('button', { name: /enviar mensaje/i }).waitFor({ state: 'visible', timeout: 10000 });
    check('voz botón enviar visible', true);
    await page.getByText(/agendamiento real/i).waitFor({ state: 'visible', timeout: 10000 });
    check('voz indicadores visibles', true);

    // 4. /voz por texto (sin micrófono): COSTO -> precio.
    await page.getByRole('textbox', { name: /escribe tu mensaje/i }).fill('COSTO');
    await page.getByRole('button', { name: /enviar mensaje/i }).click();
    await page.getByText(/\$1,500/, { exact: false }).first().waitFor({ state: 'visible', timeout: 30000 });
    check('voz responde precio por texto', true);
    const vozBody = await page.content();
    check('voz sin svg literal', !/<svg><|>\s*svg\s*</i.test(vozBody));

    // 5. Screenshot evidencia.
    await page.screenshot({ path: 'test-results/e2e-voz.png' });
    check('screenshot guardado', true);

    // 6. Flujo micrófono vivo (dispositivo falso): Iniciar conversación ->
    // grabación (12s) -> STT real -> transcripción o error honesto, sin crash
    // ni burbujas vacías. Usa la implementación existente, nada simulado.
    console.log('/voz mic:');
    await page.goto(`${BASE}/voz`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.getByRole('button', { name: /iniciar escucha/i }).click();
    // 12s de grabación + STT real + respuesta: la UI debe reaccionar
    // (saludo, estado, error honesto o respuesta), nunca crashear.
    await page.waitForTimeout(75000);
    const micBody = await page.content();
    const reacted = /estoy aquí para escucharte|pensando|escuchando|hablando/i.test(micBody)
      || /no pude transcribir|no se capturó|micrófono|permiso/i.test(micBody);
    check('mic fluye a estado/resultado sin crash', reacted);
    const emptyBubbles = await page.evaluate(() => {
      const ps = [...document.querySelectorAll('p.whitespace-pre-wrap')];
      return ps.filter((p) => !(p.textContent || '').trim()).length;
    });
    check('sin burbujas vacías tras mic', emptyBubbles === 0, `vacías=${emptyBubbles}`);
  } finally {
    await browser.close();
  }
  console.log(`\nTOTAL ${n} checks | FAIL ${failures}`);
  if (failures > 0) { console.log('E2E UI: NO PASS — release bloqueado.'); process.exit(1); }
  console.log('E2E UI: PASS.');
}

main().catch((e) => { console.error('E2E UI ERROR:', (e && e.message) || e); process.exit(1); });
