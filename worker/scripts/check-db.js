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
// Wrangler se invoca vía node cli.js (npx wrangler no emite salida en PowerShell)
const WRANGLER = 'node node_modules/wrangler/wrangler-dist/cli.js';
// Tablas críticas del flujo de captación (FASE 11.1/11.2)
const REQUIRED_TABLES = [
  'clinics', 'users', 'patients', 'therapists', 'appointments', 'audit_logs', 'rate_limits',
  'leads', 'lead_audit', 'lead_notes', 'availability'
];

// 1. DB remota accesible
try {
  const info = execSync(`${WRANGLER} d1 info ${DB_NAME} --json`, { encoding: 'utf8', timeout: 15000 });
  const cleanInfo = info.replace(/\x1b\[[0-9;]*m/g, '');
  const db = JSON.parse(cleanInfo.slice(cleanInfo.indexOf('{')));
  check('D1 remota accesible', !!db.uuid, `UUID: ${db.uuid || 'desconocido'}`);
} catch (err) {
  check('D1 remota accesible', false, 'No se pudo conectar a D1. Ejecuta: node node_modules/wrangler/wrangler-dist/cli.js d1 create ' + DB_NAME);
}

// Helper: parsear salida de wrangler (limpia ANSI y extrae array JSON de results)
function parseD1Json(result) {
  const clean = result.replace(/\x1b\[[0-9;]*m/g, '');
  const jsonStart = clean.lastIndexOf('\n[');
  if (jsonStart === -1) return null;
  const arr = JSON.parse(clean.slice(jsonStart + 1));
  return arr;
}

// 2. Tablas existen
try {
  const result = execSync(
    `${WRANGLER} d1 execute ${DB_NAME} --remote --command "SELECT name FROM sqlite_master WHERE type='table'"`,
    { encoding: 'utf8', timeout: 30000 }
  );
  const parsed = parseD1Json(result);
  const rows = parsed?.[0]?.results || [];
  const tables = rows.map(r => r.name).filter(t => t !== 'sqlite_sequence');
  const existing = new Set(tables);

  const missing = REQUIRED_TABLES.filter(t => !existing.has(t));
  for (const table of REQUIRED_TABLES) {
    check(`Tabla "${table}"`, existing.has(table), 'Falta en D1. Ejecuta el deploy-production (aplica migraciones).');
  }
  if (missing.length > 0) {
    console.error(`\n  Sugerencia: aplica la migración que crea ${missing.join(', ')}`);
  }
} catch (err) {
  check('Consulta de tablas', false, 'No se pudo ejecutar query contra D1: ' + err.message);
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
