#!/usr/bin/env node
/**
 * PRE-DEPLOY AUDIT — 2 Agentes
 * Ejecutar ANTES de cada deploy con: node scripts/pre-deploy-audit.js
 * 
 * Agente 1: Corrección de código (vertex colors, transformaciones, materiales)
 * Agente 2: Performance, errores, y consistencia
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

let errors = [];
let warnings = [];
let passed = 0;

function file(p) {
  try { return fs.readFileSync(path.join(SRC, p), 'utf8'); } catch { return null; }
}

function check(condition, msg, severity = 'error') {
  if (condition) { passed++; return true; }
  if (severity === 'error') errors.push(msg);
  else warnings.push(msg);
  return false;
}

// ═══════════════════════════════════════════════
// AGENTE 1: CORRECCIÓN DE CÓDIGO
// ═══════════════════════════════════════════════
console.log('\n🔍 AGENTE 1: Corrección de código\n');

// 1.1 BrainScene.ts — Iluminación del cerebro
const brain = file('brain/render/BrainScene.ts');
if (brain) {
  check(brain.includes('thermalColor'), 'BrainScene: thermalColor no importado');
  check(brain.includes('updateBrainColors'), 'BrainScene: updateBrainColors no existe');
  check(brain.includes('update(delta: number, activations?'), 'BrainScene: update() no acepta activations');
  check(brain.includes('.color.set(c)') || brain.includes('col.setXYZ'), 'BrainScene: neither material.color.set nor vertex colors found — brain will not change color');
}

// 1.2 BrainRenderer.ts — Pasar activaciones
const renderer = file('brain/render/BrainRenderer.ts');
if (renderer) {
  check(renderer.includes('this.brainScene.update(delta, this.currentActivations)'), 
    'BrainRenderer: brainScene.update() no recibe currentActivations');
  check(!renderer.includes('this.brainScene.update(delta)'), 
    'BrainRenderer: brainScene.update(delta) sin activaciones — debe pasar this.currentActivations');
}

// 1.3 MaterialLibrary.ts — thermalColor existe
const matlib = file('brain/render/MaterialLibrary.ts');
if (matlib) {
  check(matlib.includes('export function thermalColor'), 'MaterialLibrary: thermalColor no exportado');
}

// 1.4 Verificar que NO hay "SIMULACIÓN" en archivos
const filesToCheck = [
  'brain/components/ProtocolConfigPanel.tsx',
  'pages/app/BrainViewerPage.tsx',
  'pages/app/TMSSessionPage.tsx',
  'pages/app/SimulatorPage.tsx',
  'visual-engine/modules/brain/BrainViewer.tsx',
  'visual-engine/modules/tms/TMSLiveSession.tsx',
];
filesToCheck.forEach(f => {
  const c = file(f);
  if (c) {
    check(!c.includes('SIMULACIÓN'), `${f}: contiene "SIMULACIÓN" — debe usar "Estimulación"`);
    check(!c.includes('DLPFC-L'), `${f}: contiene nombre antiguo "DLPFC-L" — usar "DLPFC-Izq"`);
    check(!c.includes('wernicke'), `${f}: contiene nombre antiguo "wernicke" — usar "temporal"`);
  }
});

// 1.5 Hemisphere labels — present on brain 3D
const markers = file('brain/render/TMSRegionMarkers.ts');
if (markers) {
  check(markers.includes('HEMISFERIO IZQUIERDO'), 'TMSRegionMarkers: label HEMISFERIO IZQUIERDO no encontrado');
  check(markers.includes('HEMISFERIO DERECHO'), 'TMSRegionMarkers: label HEMISFERIO DERECHO no encontrado');
  check(!markers.includes('DLPFC Izq'), 'TMSRegionMarkers: label no debe contener "Izq"');
  check(!markers.includes('DLPFC Der'), 'TMSRegionMarkers: label no debe contener "Der"');
}

// 1.6 RealTimeMonitor — nombres actualizados
const monitor = file('components/tms/RealTimeMonitor.tsx');
if (monitor) {
  check(!monitor.includes('DLPFC-L'), 'RealTimeMonitor: contiene nombre antiguo "DLPFC-L"');
  check(!monitor.includes('wernicke'), 'RealTimeMonitor: contiene nombre antiguo "wernicke"');
}

// 1.7 HospitalOverlay — nombres actualizados
const hospital = file('brain/render/HospitalOverlay.tsx');
if (hospital) {
  check(!hospital.includes('wernicke'), 'HospitalOverlay: contiene nombre antiguo "wernicke"');
}

// 1.8 SettingsPage — nombres actualizados
const settings = file('pages/app/SettingsPage.tsx');
if (settings) {
  check(!settings.includes('wernicke'), 'SettingsPage: contiene nombre antiguo "wernicke"');
}

// ═══════════════════════════════════════════════
// AGENTE 2: PERFORMANCE, ERRORES, CONSISTENCIA
// ═══════════════════════════════════════════════
console.log('\n🔍 AGENTE 2: Performance, errores y consistencia\n');

// 2.1 Verificar que no hay imports rotos
const brainScene = file('brain/render/BrainScene.ts');
if (brainScene) {
  check(brainScene.includes("from './MaterialLibrary'"), 'BrainScene: import de MaterialLibrary roto');
  check(brainScene.includes("from 'three'"), 'BrainScene: import de three roto');
  check(brainScene.includes("from './TMSRegionMarkers'"), 'BrainScene: import de TMSRegionMarkers roto');
}

// 2.2 Verificar que dispose() existe y limpia todo
if (brainScene) {
  check(brainScene.includes('dispose()'), 'BrainScene: método dispose() no existe');
  check(brainScene.includes('geometry?.dispose()'), 'BrainScene: dispose no limpia geometrías');
  check(brainScene.includes('this.scene.remove(this.brainGroup)'), 'BrainScene: dispose no remueve brainGroup de escena');
}

// 2.3 Verificar que BrainRenderer tiene stop() y cleanup
if (renderer) {
  check(renderer.includes('stop()'), 'BrainRenderer: método stop() no existe');
  check(renderer.includes('cancelAnimationFrame'), 'BrainRenderer: stop no cancela animationFrame');
  check(renderer.includes('worker.terminate()'), 'BrainRenderer: stop no termina worker');
  check(renderer.includes('removeEventListener'), 'BrainRenderer: stop no remueve event listeners');
}

// 2.4 Verificar que no hay console.logs innecesarios (máx 5 en BrainScene)
if (brainScene) {
  const consoleLogs = (brainScene.match(/console\.(log|error|warn)/g) || []).length;
  check(consoleLogs <= 10, `BrainScene: ${consoleLogs} console.logs — máximo 10 permitidos`, 'warning');
}

// 2.5 Verificar que RegionMesh tiene update y setActivation
const regionMesh = file('brain/render/RegionMesh.ts');
if (regionMesh) {
  check(regionMesh.includes('update('), 'RegionMesh: método update() no existe');
  check(regionMesh.includes('setActivation('), 'RegionMesh: método setActivation() no existe');
}

// 2.6 Verificar que ConnectionLines tiene update
const connLines = file('brain/render/ConnectionLines.ts');
if (connLines) {
  check(connLines.includes('update('), 'ConnectionLines: método update() no existe');
  check(connLines.includes('dispose('), 'ConnectionLines: método dispose() no existe');
}

// 2.7 Verificar que worker existe
const worker = file('brain/simulation/brain.worker.ts');
if (worker) {
  check(worker.includes('postState'), 'Worker: postState no encontrado — worker no envía estado');
  check(worker.includes('START_PROTOCOL'), 'Worker: START_PROTOCOL no encontrado');
  check(worker.includes('STOP_PROTOCOL'), 'Worker: STOP_PROTOCOL no encontrado');
}

// 2.8 Verificar ProtocolStateMachine — approach aplica estimulación
const psm = file('brain/simulation/ProtocolStateMachine.ts');
if (psm) {
  check(psm.includes('applyExternalStimulus') || psm.includes('applyStimulus'), 
    'ProtocolStateMachine: approach phase no aplica estimulación');
}

// 2.9 Verificar que BrainCanvas tiene readyRef
const canvas = file('brain/render/BrainCanvas.tsx');
if (canvas) {
  check(canvas.includes('readyRef'), 'BrainCanvas: readyRef no existe — puede causar race condition');
}

// 2.10 Verificar package.json — versiones correctas
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
check(pkg.dependencies?.three, 'package.json: three.js no es dependencia');
check(pkg.dependencies?.react, 'package.json: react no es dependencia');
check(parseFloat(pkg.version) >= 2.0, `package.json: versión ${pkg.version} < 2.0`, 'warning');

// ═══════════════════════════════════════════════
// RESULTADOS
// ═══════════════════════════════════════════════
console.log('\n' + '═'.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Errors: ${errors.length}`);
console.log(`⚠️  Warnings: ${warnings.length}`);
console.log('═'.repeat(50));

if (errors.length > 0) {
  console.log('\n❌ ERRORES (DEPLOY BLOQUEADO):\n');
  errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
}

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (deploy permitido pero revisar):\n');
  warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
}

if (errors.length > 0) {
  console.log('\n🚫 DEPLOY BLOQUEADO — Corregir errores antes de continuar\n');
  process.exit(1);
} else {
  console.log('\n✅ DEPLOY PERMITIDO — Todos los checks pasaron\n');
  process.exit(0);
}
