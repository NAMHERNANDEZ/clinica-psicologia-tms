#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

let failed = false;
function check(label, ok, msg) {
  if (ok) console.log(`  \u2705 ${label}`);
  else { console.error(`  \u274C ${label}: ${msg}`); failed = true; }
}

function d1(sql) {
  try {
    const out = execSync(`node node_modules/wrangler/wrangler-dist/cli.js d1 execute clinica-tms-db --remote --command "${sql.replace(/"/g, '\\"')}" 2>&1`, { encoding: 'utf8', timeout: 30000 });
    const jsonStart = out.indexOf('[');
    if (jsonStart === -1) return null;
    const arr = JSON.parse(out.slice(jsonStart));
    return arr?.[0]?.results || [];
  } catch { return null; }
}

console.log('\n[check:migrations] Validando migraciones...\n');

// 1. Migrations folder
check('Directorio migrations existe', fs.existsSync('./migrations'), 'Crea carpeta migrations/');

// 2. Migration files
const files = fs.readdirSync('./migrations').filter(f => f.endsWith('.sql')).sort();
check(`Archivos de migracion (${files.length})`, files.length > 0, 'Agrega archivos .sql');

// 3. Tables in schema.sql match migrations
const schema = fs.readFileSync('./schema.sql', 'utf8');
for (const file of files) {
  const content = fs.readFileSync(`./migrations/${file}`, 'utf8');
  const tables = content.match(/CREATE TABLE IF NOT EXISTS (\w+)/g) || [];
  for (const match of tables) {
    const name = match.replace('CREATE TABLE IF NOT EXISTS ', '');
    check(`${file}: ${name} en schema.sql`, schema.includes(`CREATE TABLE IF NOT EXISTS ${name}`), 'Agrega a schema.sql');
  }
}

// 4. D1 remota accesible
const tblList = d1("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
check('D1 remota accesible', tblList !== null, 'npm run db:init:remote');
if (tblList) check(`Tablas en D1 (${tblList.length})`, tblList.length > 10, 'Ejecuta todas las migrations');

console.log('');
if (failed) { console.error('[check:migrations] FAILED\n'); process.exit(1); }
else { console.log('[check:migrations] PASSED\n'); }
