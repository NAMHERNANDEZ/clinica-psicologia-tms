#!/usr/bin/env node
// scripts/check-env.js — Pre-deploy environment validation
const { execSync } = require('child_process');

let failed = false;
function check(label, ok, msg) {
  if (ok) { console.log(`  ✅ ${label}`); }
  else    { console.error(`  ❌ ${label}: ${msg}`); failed = true; }
}

console.log('\n🔍 check:env — Validando entorno...\n');

// 1. JWT_SECRET
try {
  const jwt = execSync('npx wrangler secret list --json', { encoding: 'utf8', timeout: 15000 });
  const secrets = JSON.parse(jwt);
  const jwtExists = Array.isArray(secrets) ? secrets.some(s => s.name === 'JWT_SECRET') : false;
  check('JWT_SECRET en Cloudflare', jwtExists, 'Ejecuta: echo <secret> | npx wrangler secret put JWT_SECRET');
} catch {
  check('JWT_SECRET en Cloudflare', false, 'No se pudo verificar (wrangler error)');
}

// 2. REFRESH_SECRET
try {
  const ref = execSync('npx wrangler secret list --json', { encoding: 'utf8', timeout: 15000 });
  const secrets = JSON.parse(ref);
  const refExists = Array.isArray(secrets) ? secrets.some(s => s.name === 'REFRESH_SECRET') : false;
  check('REFRESH_SECRET en Cloudflare', refExists, 'Ejecuta: echo <secret> | npx wrangler secret put REFRESH_SECRET');
} catch {
  check('REFRESH_SECRET en Cloudflare', false, 'No se pudo verificar (wrangler error)');
}

// 3. ALLOWED_ORIGINS en wrangler.toml
const fs = require('fs');
const toml = fs.readFileSync('./wrangler.toml', 'utf8');
const hasOrigins = toml.includes('ALLOWED_ORIGINS');
check('ALLOWED_ORIGINS en wrangler.toml', hasOrigins, 'Agrega ALLOWED_ORIGINS en [vars]');

// 4. schema.sql existe
const hasSchema = fs.existsSync('./schema.sql');
check('schema.sql existe', hasSchema, 'Crea schema.sql con las tablas');

// 5. .dev.vars para local dev
const hasDevVars = fs.existsSync('./.dev.vars');
check('.dev.vars existe (local dev)', hasDevVars, 'Crea .dev.vars con JWT_SECRET y REFRESH_SECRET');

// 6. package.json scripts
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
check('script "deploy" existe', !!pkg.scripts?.deploy, 'Agrega "deploy" en package.json');
check('script "typecheck" existe', !!pkg.scripts?.typecheck, 'Agrega "typecheck" en package.json');

console.log('');
if (failed) {
  console.error('❌ check:env FAILED — Corrige los errores antes de deployar.\n');
  process.exit(1);
} else {
  console.log('✅ check:env PASSED — Entorno listo para deploy.\n');
}
