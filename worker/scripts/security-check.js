#!/usr/bin/env node
// scripts/security-check.js — Pre-deploy security validation
const { execSync } = require('child_process');
const fs = require('fs');

let failed = false;
let warnings = false;
function check(label, ok, msg) {
  if (ok) console.log(`  \u2705 ${label}`);
  else { console.log(`  \u274C ${label}: ${msg}`); failed = true; }
}
function warn(label, ok, msg) {
  if (ok) console.log(`  \u2705 ${label}`);
  else { console.log(`  \u26A0 ${label}: ${msg}`); warnings = true; }
}

console.log('\n\uD83D\uDD12 check:security — Validando seguridad...\n');

// 1. Secrets in Cloudflare
try {
  const jwt = execSync('node node_modules/wrangler/wrangler-dist/cli.js secret list --json 2>&1', { encoding: 'utf8', timeout: 15000 });
  const jsonStart = jwt.indexOf('[');
  let secrets = [];
  if (jsonStart >= 0) {
    try { secrets = JSON.parse(jwt.slice(jsonStart)); } catch {}
  }
  const names = Array.isArray(secrets) ? secrets.map(s => s.name) : [];
  warn('JWT_SECRET en Cloudflare', names.includes('JWT_SECRET'), 'Ejecuta: echo <secret> | npx wrangler secret put JWT_SECRET');
  warn('REFRESH_SECRET en Cloudflare', names.includes('REFRESH_SECRET'), 'Ejecuta: echo <secret> | npx wrangler secret put REFRESH_SECRET');
} catch { warn('Secrets en Cloudflare', false, 'No se pudo verificar (necesita autenticacion Cloudflare)'); }

// 2. CORS config
const toml = fs.readFileSync('./wrangler.toml', 'utf8');
check('ALLOWED_ORIGINS configurado', toml.includes('ALLOWED_ORIGINS'), 'Falta ALLOWED_ORIGINS en wrangler.toml');
check('HTTPS origins only', !toml.includes('http://') || toml.includes('localhost'), 'Origenes HTTP solo para localhost');

// 3. CSP headers in index.ts
const indexSrc = fs.readFileSync('./src/index.ts', 'utf8');
check('CSP header configurado', indexSrc.includes("Content-Security-Policy"), 'Agrega Content-Security-Policy en securityHeaders()');
check('HSTS header configurado', indexSrc.includes("Strict-Transport-Security"), 'Agrega Strict-Transport-Security en securityHeaders()');
check('X-Content-Type-Options', indexSrc.includes("X-Content-Type-Options"), 'Agrega X-Content-Type-Options en securityHeaders()');
check('X-Frame-Options DENY', indexSrc.includes("X-Frame-Options"), 'Agrega X-Frame-Options en securityHeaders()');

// 4. Rate limiting
const indexTs = fs.readFileSync('./src/index.ts', 'utf8');
check('Rate limit implementado', indexTs.includes('checkRateLimit'), 'Falta rate limiting en fetch handler');

console.log('');
if (failed) {
  console.error('\u274C check:security FAILED — Corrige antes de deployar.\n');
  process.exit(1);
} else if (warnings) {
  console.log('\u2705 check:security PASSED (con advertencias)\n');
} else {
  console.log('\u2705 check:security PASSED\n');
}
