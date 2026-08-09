#!/usr/bin/env node
/**
 * OpenCode Bridge — worker persistente
 *
 * Flujo:
 *   queue/<task>.json (pending) -> crea sesion (modelo fijado) -> POST prompt
 *   -> polling GET /message -> resultado -> results/<task>.json (done)
 *
 * Recovery: si el proceso se interrumpe, las tareas quedan pending/running y se
 * reanudan sin duplicar (nunca re-envía el prompt si ya existe el mensaje del usuario).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const BRIDGE_DIR = __dirname;
const CONFIG = JSON.parse(fs.readFileSync(path.join(BRIDGE_DIR, 'config.json'), 'utf8'));

const DIRS = {
  queue: path.join(BRIDGE_DIR, 'queue'),
  results: path.join(BRIDGE_DIR, 'results'),
  logs: path.join(BRIDGE_DIR, 'logs'),
};
const LOG_FILE = path.join(DIRS.logs, 'bridge.log');
const LOCK_FILE = path.join(BRIDGE_DIR, '.bridge.lock');

for (const d of Object.values(DIRS)) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

/* ---------------- logging ---------------- */
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (e) {}
}

/* ---------------- auth ---------------- */
function readPassword() {
  try {
    const pf = CONFIG.auth.passwordFile;
    if (pf && fs.existsSync(pf)) {
      const p = fs.readFileSync(pf, 'utf8').trim();
      if (p) return p;
    }
  } catch (e) {}
  const envPw = process.env[CONFIG.auth.fallbackPasswordEnvVar];
  if (envPw) return envPw;
  throw new Error('No se encontro password del servidor (passwordFile ni env).');
}
const PASSWORD = readPassword();
const AUTH_HEADER = 'Basic ' + Buffer.from(`${CONFIG.auth.username}:${PASSWORD}`).toString('base64');

/* ---------------- http helpers ---------------- */
function httpRequest(method, pathname, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://${CONFIG.server.host}:${CONFIG.server.port}${pathname}`);
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          Authorization: AUTH_HEADER,
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
        },
        timeout: timeoutMs || 15000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch (e) {
            json = null;
          }
          resolve({ status: res.statusCode, json, raw: data });
        });
      }
    );
    req.on('error', (e) => reject(e));
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

/* ---------------- server management ---------------- */
let serverChild = null;

function spawnServer() {
  const logPath = path.join(DIRS.logs, 'server.log');
  const out = fs.openSync(logPath, 'a');
  const args = [
    'serve',
    '--port', String(CONFIG.server.port),
    '--hostname', CONFIG.server.host,
    '--log-level', 'info',
  ];
  log(`Arrancando lildax serve: ${CONFIG.server.lildaxPath} ${args.join(' ')}`);
  serverChild = spawn(CONFIG.server.lildaxPath, args, {
    stdio: ['ignore', out, out],
    env: { ...process.env, OPENCODE_SERVER_PASSWORD: PASSWORD },
    windowsHide: true,
  });
  serverChild.on('exit', (code, signal) => {
    log(`Server lildax termino (code=${code}, signal=${signal}). Se reintentara si es necesario.`);
    serverChild = null;
  });
}

async function isServerUp() {
  try {
    const r = await httpRequest('GET', '/api/health');
    return r.status === 200;
  } catch (e) {
    return false;
  }
}

async function ensureServer() {
  if (await isServerUp()) {
    return true;
  }
  if (CONFIG.server.autoStartServer && !serverChild) {
    spawnServer();
  }
  const deadline = Date.now() + CONFIG.server.startupTimeoutMs;
  while (Date.now() < deadline) {
    if (await isServerUp()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/* ---------------- task model ---------------- */
function newTaskId() {
  return 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function taskPath(id) {
  return path.join(DIRS.queue, id + '.json');
}

function readTask(id) {
  try {
    return JSON.parse(fs.readFileSync(taskPath(id), 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeTask(task) {
  fs.writeFileSync(taskPath(task.id), JSON.stringify(task, null, 2));
}

function moveTaskToResults(task) {
  const src = taskPath(task.id);
  const dst = path.join(DIRS.results, task.id + '.json');
  if (fs.existsSync(dst)) fs.unlinkSync(dst);
  fs.renameSync(src, dst);
}

/* ---------------- api ---------------- */
async function createSession(task) {
  const body = {
    model: { providerID: task.model.providerID, id: task.model.id },
    location: { directory: CONFIG.workdir.replace(/\\/g, '/') },
  };
  const r = await httpRequest('POST', '/api/session', body);
  if (r.status !== 200) {
    throw new Error(`createSession HTTP ${r.status}: ${r.raw.slice(0, 300)}`);
  }
  return r.json.data.id;
}

async function sendPrompt(sessionID, text) {
  const body = { prompt: { text }, resume: true };
  const r = await httpRequest('POST', `/api/session/${sessionID}/prompt`, body);
  if (r.status !== 200) {
    throw new Error(`sendPrompt HTTP ${r.status}: ${r.raw.slice(0, 300)}`);
  }
  return r.json.data.id; // user message id
}

async function getMessages(sessionID) {
  const r = await httpRequest('GET', `/api/session/${sessionID}/message`);
  if (r.status !== 200) {
    throw new Error(`getMessages HTTP ${r.status}: ${r.raw.slice(0, 300)}`);
  }
  return r.json.data || [];
}

function findUserMessageByText(messages, text) {
  const normalized = text.trim();
  return messages.find(
    (m) => m.type === 'user' && typeof m.text === 'string' && m.text.trim() === normalized
  );
}

function findFinishedAssistant(messages) {
  // messages vienen newest-first; el primer assistant con finish es la respuesta
  return messages.find((m) => m.type === 'assistant' && (m.finish === 'stop' || m.finish === 'error'));
}

/* ---------------- processing ---------------- */
async function processTask(task) {
  if (task.state === 'done' || task.state === 'failed') {
    moveTaskToResults(task);
    return;
  }

  task.state = 'running';
  task.updatedAt = new Date().toISOString();
  task.attempts = (task.attempts || 0) + 1;
  writeTask(task);

  try {
    const up = await ensureServer();
    if (!up) {
      throw new Error('Server OpenCode v2 no disponible (el proceso seguira reintentando).');
    }

    // 1) sesion
    if (!task.sessionID) {
      task.sessionID = await createSession(task);
      task.updatedAt = new Date().toISOString();
      writeTask(task);
      log(`[${task.id}] sesion creada: ${task.sessionID}`);
    }

    // 2) enviar prompt si no fue enviado (o si la sesion se perdio o quedo colgada tras un reinicio)
    let msgs;
    try {
      msgs = await getMessages(task.sessionID);
    } catch (e) {
      msgs = [];
    }
    const hasPrompt = findUserMessageByText(msgs, task.prompt);
    const hasResponse = !!findFinishedAssistant(msgs);
    const promptLost =
      task.promptMsgID &&
      !msgs.some((m) => m.id === task.promptMsgID) &&
      !hasPrompt;
    const stuck =
      task.promptMsgID &&
      hasPrompt &&
      !hasResponse &&
      (task.attempts || 1) > 1;
    if (!task.promptMsgID || promptLost || stuck) {
      if (hasPrompt && !stuck) {
        task.promptMsgID = hasPrompt.id;
        writeTask(task);
        log(`[${task.id}] prompt ya existia en sesion (${hasPrompt.id}), no se re-envia.`);
      } else {
        if (promptLost || stuck) {
          // la sesion original quedo vacia/invalida o colgada tras reinicio del server: crear sesion nueva
          const newSession = await createSession(task);
          log(
            `[${task.id}] sesion ${promptLost ? 'perdida' : 'colgada'} tras reinicio; nueva sesion ${newSession} y re-envio de prompt.`
          );
          task.sessionID = newSession;
        }
        task.promptMsgID = await sendPrompt(task.sessionID, task.prompt);
        task.updatedAt = new Date().toISOString();
        writeTask(task);
        log(`[${task.id}] prompt enviado (${task.promptMsgID}).`);
      }
    }

    // 3) polling
    const deadline = Date.now() + CONFIG.poll.timeoutMs;
    while (Date.now() < deadline) {
      msgs = await getMessages(task.sessionID);
      const assistant = findFinishedAssistant(msgs);
      if (assistant) {
        if (assistant.finish === 'stop') {
          const textParts = (assistant.content || [])
            .filter((p) => p.type === 'text')
            .map((p) => p.text);
          task.state = 'done';
          task.result = {
            text: textParts.join('\n').trim(),
            model: assistant.model || null,
            tokens: assistant.tokens || null,
            cost: assistant.cost ?? null,
            sessionID: task.sessionID,
            messageID: assistant.id,
            promptMsgID: task.promptMsgID,
            createdAt: task.createdAt,
            completedAt: new Date().toISOString(),
            attempts: task.attempts,
          };
          writeTask(task);
          moveTaskToResults(task);
          log(`[${task.id}] DONE. modelo=${assistant.model ? assistant.model.providerID + '/' + assistant.model.id : '?'} tokens_out=${assistant.tokens ? assistant.tokens.output : '?'}`);
          return;
        } else {
          // finish === 'error'
          const errMsg =
            (assistant.error && (assistant.error.message || JSON.stringify(assistant.error))) ||
            'model error';
          throw new Error(`Modelo respondio con error: ${errMsg}`);
        }
      }
      await new Promise((r) => setTimeout(r, CONFIG.poll.intervalMs));
    }
    throw new Error('Timeout esperando respuesta del modelo.');
  } catch (e) {
    task.error = e.message;
    task.updatedAt = new Date().toISOString();
    const unreachable = /no disponible/.test(e.message) || /ECONNREFUSED/.test(e.message);
    if (unreachable) {
      // No marcar como failed: dejar pending/running para reanudar cuando el server vuelva
      task.state = 'running';
      writeTask(task);
      log(`[${task.id}] server no disponible, tarea queda para reintento: ${e.message}`);
      return;
    }
    if ((task.attempts || 0) >= CONFIG.poll.maxAttempts) {
      task.state = 'failed';
      writeTask(task);
      moveTaskToResults(task);
      log(`[${task.id}] FAILED tras ${task.attempts} intentos: ${e.message}`);
      return;
    }
    // Reintento dentro del mismo bucle: restaurar estado running sin mover de cola
    task.state = 'running';
    task.error = e.message;
    writeTask(task);
    log(`[${task.id}] error (intento ${task.attempts}): ${e.message}. Se reintentara en el proximo scan.`);
  }
}

/* ---------------- main loop ---------------- */
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8').trim(), 10);
      try {
        process.kill(pid, 0);
        log(`Ya hay otro bridge corriendo (pid=${pid}). Saliendo.`);
        return false;
      } catch (e) {
        log(`Lock obsoleto (pid=${pid} no existe). Tomando el control.`);
      }
    } catch (e) {}
  }
  fs.writeFileSync(LOCK_FILE, String(process.pid));
  return true;
}

function releaseLock() {
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch (e) {}
}

async function main() {
  log(`Bridge iniciado (pid=${process.pid}). Poll dir=${DIRS.queue}`);
  if (!acquireLock()) {
    process.exit(0);
  }
  process.on('exit', () => {
    releaseLock();
    if (serverChild) serverChild.kill();
  });
  process.on('SIGINT', () => {
    releaseLock();
    if (serverChild) serverChild.kill();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    releaseLock();
    if (serverChild) serverChild.kill();
    process.exit(0);
  });

  while (true) {
    try {
      const files = fs
        .readdirSync(DIRS.queue)
        .filter((f) => f.endsWith('.json'))
        .sort();
      for (const f of files) {
        const task = readTask(f.replace(/\.json$/, ''));
        if (!task) continue;
        if (task.state === 'done' || task.state === 'failed') {
          moveTaskToResults(task);
          continue;
        }
        await processTask(task);
      }
    } catch (e) {
      log(`Error en bucle principal: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, CONFIG.scanIntervalMs));
  }
}

main();
