#!/usr/bin/env node
// scripts/check-db.js — Pre-deploy D1 database validation
const { execSync } = require('child_process');

let failed = false;
function check(label, ok, msg) {
  if (ok) { console.log(`  ✅ ${label}`); }
  else    { console.error(`  ❌ ${label}: ${msg}`); failed = true; }
}

console.log('\n🔍 check:db — Validando base de datos D1...\n');

const DB_NAME = 'clinica-tms-db';
const REQUIRED_TABLES = ['clinics', 'users', 'patients', 'therapists', 'appointments', 'audit_logs', 'rate_limits'];

// 1. DB remota accesible
try {
  const info = execSync(`npx wrangler d1 info ${DB_NAME} --json`, { encoding: 'utf8', timeout: 15000 });
  const db = JSON.parse(info);
  check('D1 remota accesible', !!db.uuid, `UUID: ${db.uuid || 'desconocido'}`);
} catch (err) {
  check('D1 remota accesible', false, 'No se pudo conectar a D1. Ejecuta: npx wrangler d1 create ' + DB_NAME);
}

// 2. Tablas existen
try {
  const result = execSync(
    `npx wrangler d1 execute ${DB_NAME} --remote --command "SELECT name FROM sqlite_master WHERE type='table'"`,
    { encoding: 'utf8', timeout: 30000 }
  );
  const parsed = JSON.parse(result);
  const rows = parsed?.results?.[0]?.results || [];
  const tables = rows.map(r => r.name).filter(t => t !== 'sqlite_sequence');
  const existing = new Set(tables);

  for (const table of REQUIRED_TABLES) {
    check(`Tabla "${table}"`, existing.has(table), 'Falta en D1. Ejecuta: npm run db:init:remote');
  }
} catch (err) {
  check('Consulta de tablas', false, 'No se pudo ejecutar query contra D1');
}

// 3. Schema.sql existe y tiene CREATE TABLE
const fs = require('fs');
if (fs.existsSync('./schema.sql')) {
  const schema = fs.readFileSync('./schema.sql', 'utf8');
  const createCount = (schema.match(/CREATE TABLE/gi) || []).length;
  check(`schema.sql tiene ${createCount} CREATE TABLE`, createCount >= 7, `Se esperan al menos 7 tablas`);
} else {
  check('schema.sql', false, 'Archivo no encontrado');
}

console.log('');
if (failed) {
  console.error('❌ check:db FAILED — Corrige los errores antes de deployar.\n');
  process.exit(1);
} else {
  console.log('✅ check:db PASSED — Base de datos lista.\n');
}
