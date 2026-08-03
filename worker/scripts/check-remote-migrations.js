#!/usr/bin/env node
// scripts/check-remote-migrations.js — Verifica que todas las migraciones esperadas
// están aplicadas en la DB remota y que no hay tablas críticas faltantes.
// FASE 11.2.2 (hardening) — Falla si falta una tabla crítica (leads, lead_audit, etc.)
const { execSync } = require('child_process');
const fs = require('fs');

let failed = false;
function check(label, ok, msg) {
  if (ok) { console.log(`  \u2705 ${label}`); }
  else    { console.error(`  \u274C ${label}: ${msg}`); failed = true; }
}

console.log('\n[check:remote-migrations] Verificando esquema local vs remoto...\n');

const DB_NAME = 'clinica-tms-db';
const WRANGLER = 'node node_modules/wrangler/wrangler-dist/cli.js';
const MIGRATIONS_DIR = './migrations';

// Tablas que hacen falta para el flujo de captación funcional
const CRITICAL_TABLES = ['leads', 'lead_audit', 'lead_notes', 'clinical_chat_sessions', 'clinical_chat_messages'];

function d1(sql) {
  try {
    const out = execSync(
      `${WRANGLER} d1 execute ${DB_NAME} --remote --command "${sql.replace(/"/g, '\\"')}" 2>&1`,
      { encoding: 'utf8', timeout: 30000 }
    );
    // Limpiar códigos ANSI que wrangler inserta en la salida
    const clean = out.replace(/\x1b\[[0-9;]*m/g, '');
    // El array JSON de resultados empieza en el último '[' de línea top-level tras "Executed"
    const jsonStart = clean.lastIndexOf('\n[');
    if (jsonStart === -1) {
      // fallback: buscar '[{' en todo el texto
      const six = clean.indexOf('[{');
      if (six === -1) return null;
      const arr = JSON.parse(clean.slice(six));
      return arr?.[0]?.results || [];
    }
    const arr = JSON.parse(clean.slice(jsonStart + 1));
    return arr?.[0]?.results || [];
  } catch (e) {
    return null;
  }
}

// 1. Carpeta de migraciones
check('Directorio migrations existe', fs.existsSync(MIGRATIONS_DIR), 'Crea carpeta migrations/');

// 2. Archivos .sql del esquema leads (0020, 0021)
const leadFiles = ['0020_leads.sql', '0021_leads_audit.sql', '0023_crm_enhancement.sql', '0024_appointments_completion.sql', '0027_clinical_chat.sql'];
for (const f of leadFiles) {
  check(`Migración ${f} existe localmente`, fs.existsSync(`${MIGRATIONS_DIR}/${f}`), 'Agrega el archivo .sql');
}

// 3. Tablas críticas presentes en la DB remota
const rows = d1("SELECT name FROM sqlite_master WHERE type='table'");
if (rows === null) {
  check('Consulta a DB remota', false, 'No se pudo ejecutar query contra D1');
} else {
  const tables = rows.map(r => r.name);
  check(`DB remota accesible (${tables.length} tablas)`, tables.length > 10, 'Ejecuta db:init o deploy-production');
  for (const tbl of CRITICAL_TABLES) {
    check(`Tabla crítica "${tbl}"`, tables.includes(tbl),
      'Falta. Aplica la migración correspondiente (0020_leads / 0021_leads_audit).');
  }
}

// 4. Coherencia: cada tabla crítica definida en schema.sql local debe existir remoto
if (fs.existsSync('./schema.sql')) {
  const schema = fs.readFileSync('./schema.sql', 'utf8');
  const localTables = [...schema.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/g)].map(m => m[1]);
  const remoteTables = d1("SELECT name FROM sqlite_master WHERE type='table'")?.map(r => r.name) || [];
  const missingLocal = localTables.filter(t => !remoteTables.includes(t));
  check('Coherencia local<->remoto', missingLocal.length === 0,
    `Tablas en schema.sql ausentes en remoto: ${missingLocal.join(', ') || 'ninguna'}`);
} else {
  check('schema.sql', false, 'Archivo no encontrado');
}

console.log('');
if (failed) {
  console.error('❌ check:remote-migrations FAILED — Corrige antes de deployar.\n');
  process.exit(1);
} else {
  console.log('✅ check:remote-migrations PASSED — Esquema remoto al día.\n');
}