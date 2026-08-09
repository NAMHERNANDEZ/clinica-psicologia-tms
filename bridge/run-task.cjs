#!/usr/bin/env node
/**
 * run-task.cjs — Canal automatico proyecto <-> bridge <-> OpenCode.
 *
 * Encola una tarea en bridge/queue, espera a que el bridge la procese
 * (OpenCode + lildax) y devuelve el resultado desde bridge/results.
 *
 * Uso:
 *   node run-task.cjs "prompt" [--id task-id] [--model provider/model] [--timeout-ms 300000]
 *
 * Exit codes:
 *   0 -> done
 *   2 -> failed
 *   3 -> timeout
 */
const fs = require('fs');
const path = require('path');

const BRIDGE_DIR = __dirname;
const QUEUE_DIR = path.join(BRIDGE_DIR, 'queue');
const RESULTS_DIR = path.join(BRIDGE_DIR, 'results');

let args = process.argv.slice(2);
let id = null;
let model = null;
let timeoutMs = 300000;

const promptArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--id') { id = args[++i]; }
  else if (args[i] === '--model') { model = args[++i]; }
  else if (args[i] === '--timeout-ms') { timeoutMs = parseInt(args[++i], 10) || 300000; }
  else promptArgs.push(args[i]);
}
const prompt = promptArgs.join(' ').trim();

if (!prompt) {
  console.error('Uso: node run-task.cjs "prompt" [--id task-id] [--model provider/model] [--timeout-ms N]');
  process.exit(1);
}

if (!id) id = 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

const CONFIG = JSON.parse(fs.readFileSync(path.join(BRIDGE_DIR, 'config.json'), 'utf8'));
const defaultModel = { providerID: CONFIG.model.providerID, id: CONFIG.model.id };
let taskModel = defaultModel;
if (model) {
  const parts = model.split('/');
  taskModel = parts.length === 2 ? { providerID: parts[0], id: parts[1] } : { providerID: 'opencode', id: model };
}

if (!fs.existsSync(QUEUE_DIR)) fs.mkdirSync(QUEUE_DIR, { recursive: true });

const task = {
  id,
  state: 'pending',
  prompt,
  model: taskModel,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  attempts: 0,
  sessionID: null,
  promptMsgID: null,
  result: null,
  error: null,
};

const file = path.join(QUEUE_DIR, id + '.json');
fs.writeFileSync(file, JSON.stringify(task, null, 2));
console.log(`[run-task] tarea encolada: ${id}`);

function readResult() {
  try {
    return JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, id + '.json'), 'utf8'));
  } catch (e) {
    return null;
  }
}

const deadline = Date.now() + timeoutMs;
let lastState = null;

(async () => {
  while (Date.now() < deadline) {
    // La tarea puede moverse de queue -> results cuando termine
    const inResults = readResult();
    if (inResults) {
      if (inResults.state === 'done' && inResults.result) {
        console.log(`[run-task] DONE (${inResults.attempts} intentos)`);
        console.log(JSON.stringify({ id, state: 'done', result: inResults.result }, null, 2));
        process.exit(0);
      }
      if (inResults.state === 'failed') {
        console.error(`[run-task] FAILED: ${inResults.error || 'sin error'}`);
        console.error(JSON.stringify({ id, state: 'failed', error: inResults.error }, null, 2));
        process.exit(2);
      }
    }
    const inQueue = JSON.parse(fs.readFileSync(file, 'utf8').toString());
    if (inQueue && inQueue.state !== lastState) {
      lastState = inQueue.state;
      console.log(`[run-task] estado: ${inQueue.state}${inQueue.error ? ' (' + inQueue.error + ')' : ''}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.error(`[run-task] TIMEOUT tras ${timeoutMs}ms. La tarea sigue en la cola y se recuperara al reiniciar el bridge.`);
  process.exit(3);
})();
