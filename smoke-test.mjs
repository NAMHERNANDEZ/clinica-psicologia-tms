import { chromium } from 'playwright';

const URL = 'https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errorDetails = { message: null, stack: null, componentStack: null };

page.on('console', msg => {
  if (msg.type() === 'error') {
    console.log('CONSOLE ERROR:', msg.text());
  }
});

page.on('pageerror', err => {
  console.log('PAGE ERROR:', err.message);
  console.log('STACK:', err.stack);
});

await page.goto(URL, { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(3000);

const title = await page.title();
console.log('PAGE TITLE:', title);

const errorText = await page.evaluate(() => {
  const root = document.getElementById('root');
  if (!root) return { error: null, html: 'no-root' };
  return {
    error: root?.innerText?.includes?.('Error al cargar') || false,
    html: root?.innerHTML?.substring(0, 3000) || ''
  };
});

console.log('HAS ERROR BOUNDARY:', errorText.error);

const diagOutput = await page.evaluate(() => {
  const root = document.getElementById('root');
  if (!root) return 'no-root';
  return root.innerHTML;
});

const lines = diagOutput.split('\n');
for (const line of lines) {
  if (line.includes('Error') || line.includes('error') || line.includes('Cannot') || line.includes('Cannot read') || line.includes('stack') || line.includes('at ') || line.includes('componentStack') || line.includes('pre')) {
    console.log('DIAG LINE:', line.substring(0, 200));
  }
}

if (errorText.error) {
  const fullHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
  const preMatches = fullHtml.match(/<pre[^>]*>([\s\S]*?)<\/pre>/g);
  if (preMatches) {
    for (const m of preMatches) {
      const text = m.replace(/<[^>]+>/g, '');
      console.log('ERROR DETAIL:', text.substring(0, 2000));
    }
  }
  console.log('FULL ROOT HTML SNIPPET:', fullHtml.substring(0, 2000));
} else {
  console.log('PAGE LOADED WITHOUT ErrorBoundary showing');
}

await browser.close();
