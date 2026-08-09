#!/usr/bin/env node
/**
 * Encola una tarea en la cola del bridge.
 *
 * Uso:
 *   node new-task.js "tu prompt aqui"
 *   node new-task.js --model openrouter/anthropic/claude-3.5-sonnet "tu prompt"
 */
const fs = require('fs');
const path = require('path');

const BRIDGE_DIR = __dirname;
const CONFIG = JSON.parse(fs.readFileSync(path.join(BRIDGE_DIR, 'config.json'), 'utf8'));
const QUEUE_DIR = path.join(BRIDGE_DIR, 'queue');

let args = process.argv.slice(2);
let model = null;
let id = null;
if (args[0] === '--model') {
  model = args[1];
  args = args.slice(2);
}
if (args[0] === '--id') {
  id = args[1];
  args = args.slice(2);
}
const prompt = args.join(' ').trim();

if (!prompt) {
  console.error('Uso: node new-task.js [--model provider/model] [--id task-id] "tu prompt"');
  process.exit(1);
}

if (!fs.existsSync(QUEUE_DIR)) fs.mkdirSync(QUEUE_DIR, { recursive: true });

if (!id) id = 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
const defaultModel = { providerID: CONFIG.model.providerID, id: CONFIG.model.id };
let taskModel = defaultModel;
if (model) {
  const parts = model.split('/');
  taskModel = parts.length === 2 ? { providerID: parts[0], id: parts[1] } : { providerID: 'opencode', id: model };
}

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
console.log(`Tarea creada: ${id}`);
console.log(`  prompt: ${prompt.slice(0, 80)}`);
console.log(`  model:  ${taskModel.providerID}/${taskModel.id}`);
console.log(`  file:   ${file}`);
