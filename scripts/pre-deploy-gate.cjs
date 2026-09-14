#!/usr/bin/env node
/**
 * PRE-DEPLOY GATE — ejecutar ANTES de cada deploy del worker.
 * Corre typecheck + suite worker + suite frontend. Sale 1 si algo falla
 * (bloquea el release). Sin dependencias externas.
 *
 * Uso: node scripts/pre-deploy-gate.cjs
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';

function run(label, cmd, args, cwd) {
  console.log(`\n[GATE] ${label}: ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
  if (r.status !== 0) {
    console.log(`[GATE] FAIL ${label} (exit=${r.status}) — release bloqueado.`);
    process.exit(r.status || 1);
  }
  console.log(`[GATE] PASS ${label}`);
}

const tscBin = path.join(ROOT, 'worker', 'node_modules', '.bin', isWin ? 'tsc.cmd' : 'tsc');
const vitestWorker = path.join(ROOT, 'worker', 'node_modules', '.bin', isWin ? 'vitest.cmd' : 'vitest');
const vitestRoot = path.join(ROOT, 'node_modules', '.bin', isWin ? 'vitest.cmd' : 'vitest');

run('worker typecheck', tscBin, ['--noEmit', '-p', 'tsconfig.json'], path.join(ROOT, 'worker'));
run('worker suite', vitestWorker, ['run'], path.join(ROOT, 'worker'));
run('frontend suite', vitestRoot, ['run', 'test/', '--pool=threads'], ROOT);

console.log('\n[GATE] ALL PASS — deploy desbloqueado.');
