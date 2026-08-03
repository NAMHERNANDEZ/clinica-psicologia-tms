#!/usr/bin/env node
const { execSync } = require('child_process');

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

console.log('\n[check:compliance] Validando cumplimiento normativo...\n');

// 1. Tablas existen
const tables = d1("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('compliance_rules','compliance_alerts','compliance_runs','backup_runs')");
if (tables) {
  const names = tables.map(r => r.name);
  check('Tabla compliance_rules', names.includes('compliance_rules'), 'Ejecuta migration 0008');
  check('Tabla compliance_alerts', names.includes('compliance_alerts'), 'Ejecuta migration 0008');
  check('Tabla compliance_runs', names.includes('compliance_runs'), 'Ejecuta migration 0008');
  check('Tabla backup_runs', names.includes('backup_runs'), 'Ejecuta migration 0012');
} else { check('D1 remota', false, 'No se pudo conectar'); }

// 2. Reglas de compliance existen
const rules = d1("SELECT COUNT(*) as cnt FROM compliance_rules");
const cnt = rules?.[0]?.cnt || 0;
check(`Reglas cargadas (${cnt})`, cnt > 0, 'Ejecuta seed.sql');

// 3. Auditoria en componentes principales
const fs = require('fs');
const dirs = fs.readdirSync('./src/domains').filter(d => fs.statSync(`./src/domains/${d}`).isDirectory());
let domainsWithAudit = 0;
for (const d of dirs) {
  const svc = `./src/domains/${d}/service.ts`;
  if (fs.existsSync(svc)) {
    const code = fs.readFileSync(svc, 'utf8');
    if (code.includes('logAudit')) domainsWithAudit++;
  }
}
check(`Dominios con auditoria (${domainsWithAudit}/${dirs.length})`, domainsWithAudit >= 2, 'Agrega logAudit en al menos backups y documents');

console.log('');
if (failed) { console.error('[check:compliance] FAILED\n'); process.exit(1); }
else { console.log('[check:compliance] PASSED\n'); }
