#!/usr/bin/env node
// scripts/smoke-test-marketing-ai.js — Smoke tests FASE 11.7 Marketing AI
// Verifica: generacion de contenido, campana, SEO + validacion clinica + DB + auditoria.
const https = require('https');

let failed = false;
function check(label, ok, msg) {
  if (ok) { console.log(`  \u2705 ${label}`); }
  else { console.error(`  \u274C ${label}: ${msg}`); failed = true; }
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
  console.log('\n[smoke:marketing-ai] Probando Marketing AI en produccion...\n');

  // Login admin
  const login = await httpReq('POST', '/api/auth/login', { email: EMAIL, password: PASS });
  const loginJson = parse(login);
  const accessToken = loginJson?.data?.accessToken;
  check('Login admin', !!accessToken, loginJson?.error || 'No token');
  if (!accessToken) { console.log('\n❌ No se puede continuar sin auth.\n'); process.exit(1); }
  const auth = { Authorization: `Bearer ${accessToken}` };

  // 1. Content AI
  const contentRes = await httpReq('POST', '/api/marketing/content/generate', {
    type: 'social',
    topic: 'Terapia Magnetica Transcraneal para ansiedad',
    audience: 'adultos jovenes con ansiedad',
    goal: 'informar sobre la TMS como opcion de tratamiento',
    length: 'corto',
    callToAction: 'Solicita una valoracion profesional',
  }, auth);
  const contentJson = parse(contentRes);
  check(`Content AI (HTTP ${contentRes.status})`, contentRes.status === 200, contentJson?.error || '');
  const content = contentJson?.data?.content;
  check('Content headline presente', !!content?.headline, JSON.stringify(content));
  check('Content body presente', !!content?.body, '');
  // Validacion clinica: no debe contener terminos bloqueados
  const blockedRaw = (content?.headline || '') + ' ' + (content?.body || '');
  const blockedTerms = ['cura', 'garantizad', '100%', 'elimina', 'sin efectos secundarios'];
  const foundBlocked = blockedTerms.filter(t => blockedRaw.toLowerCase().includes(t));
  check('Content AI sin terminos bloqueados', foundBlocked.length === 0, foundBlocked.join(', '));
  check('Content AI tiene CTA con valoracion', /valoracion/.test(blockedRaw.toLowerCase()), '');
  check('Content validation status valido', ['approved','requires_review','blocked'].includes(contentJson?.data?.validation?.status), '');
  check('Content audit id asignado', contentJson?.data?.id !== undefined, '');

  // 2. Campaign AI
  const campRes = await httpReq('POST', '/api/marketing/campaign/generate', {
    name: 'Campana TMS Ansiedad',
    audience: 'adultos 25-45 con ansiedad moderada',
    budget: 2000,
    channels: ['instagram', 'whatsapp'],
    durationDays: 15,
    goal: 'generar citas de valoracion',
  }, auth);
  const campJson = parse(campRes);
  check(`Campaign AI (HTTP ${campRes.status})`, campRes.status === 200, campJson?.error || '');
  const campaign = campJson?.data?.campaign;
  check('Campaign summary presente', !!campaign?.summary, '');
  check('Campaign budget_allocation presente', !!campaign?.budget_allocation, '');
  const budgetVals = Object.values(campaign?.budget_allocation || {});
  check('Campaign budget suma correcto', budgetVals.reduce((a, b) => a + (b || 0), 0) === 2000, JSON.stringify(budgetVals));
  check('Campaign validada', ['approved','requires_review','blocked'].includes(campJson?.data?.validation?.status), '');

  // 3. SEO AI
  const seoRes = await httpReq('POST', '/api/marketing/seo/generate', {
    keyword: 'terapia magnetica transcraneal para la ansiedad',
    searchIntent: 'informativo',
    competition: 'media',
    audience: 'personas con ansiedad en Puebla',
  }, auth);
  const seoJson = parse(seoRes);
  check(`SEO AI (HTTP ${seoRes.status})`, seoRes.status === 200, seoJson?.error || '');
  const seo = seoJson?.data?.seo;
  check('SEO keyword presente', !!seo?.keyword, '');
  check('SEO meta_title presente', !!seo?.meta_title && seo.meta_title.length <= 60, seo?.meta_title);
  check('SEO meta_description presente', !!seo?.meta_description && seo.meta_description.length <= 160, seo?.meta_description?.slice(0,40));
  check('SEO content_outline presente', Array.isArray(seo?.content_outline) && seo.content_outline.length > 0, '');
  check('SEO source asignado', ['gemini','template'].includes(seoJson?.data?.source), '');

  // 4. Marketing overview (KPIs)
  const overviewRes = await httpReq('GET', '/api/marketing/overview', null, auth);
  const overviewJson = parse(overviewRes);
  check(`Marketing overview (HTTP ${overviewRes.status})`, overviewRes.status === 200, overviewJson?.error || '');
  check('Overview data presente', !!overviewJson?.data, '');

  // 5. Content list (historial en DB)
  const listRes = await httpReq('GET', '/api/marketing/content', null, auth);
  const listJson = parse(listRes);
  check(`Content list (HTTP ${listRes.status})`, listRes.status === 200, listJson?.error || '');
  check('Content list es array', Array.isArray(listJson?.data), '');
  const generatedItem = (listJson?.data || []).find((x) => x.id === (contentJson?.data?.id));
  check('Item generado encontrado en historial', !!generatedItem, '');

  // 6. RBAC: usuario sin admin (login como reception si existe) — skip si no; test RBAC con token invalido
  const badAuth = { Authorization: `Bearer invalido` };
  const rbacRes = await httpReq('GET', '/api/marketing/content', null, badAuth);
  check('RBAC: rechaza no-auth (401/403)', rbacRes.status === 401 || rbacRes.status === 403, `status=${rbacRes.status}`);

  console.log('');
  if (failed) {
    console.error('❌ smoke:marketing-ai FAILED — Revisa los fallos.\n');
    process.exit(1);
  } else {
    console.log('✅ smoke:marketing-ai PASSED — Marketing AI OK.\n');
  }
}

main();
