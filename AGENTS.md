# AGENTS.md — Reglas de trabajo para agentes AI en este repositorio

Este archivo es la **fuente de reglas** que toda sesión nueva debe leer al iniciar.
Las instrucciones largas del usuario NO deben pegarse de nuevo: la configuración
persistente reconstruye el contexto.

## Protocolo de arranque de sesión

Cuando el usuario diga **"abre la configuración anterior y continúa"** (o variante),
ejecuta AUTOMÁTICAMENTE este protocolo:

1. Leer `AGENTS.md` (este archivo).
2. Leer `PROJECT_STATE.json` y `PROJECT_STATE.md` → fase actual, último commit, cambios sin commit.
3. Leer `TASK_QUEUE.json` → tarea activa y pendientes (máquina legible).
4. Leer `TASK_QUEUE.md` → roadmap humano con detalle.
5. Leer `SESSION_HANDOFF.md` → último handoff.
6. Verificar estado real con `git status --short` y `git log --oneline -3`.
7. Leer `bridge/queue/*.json` y `bridge/results/*.json` → estado del bridge.
8. Verificar bridge vivo (proceso `bridge.cjs`) y logs en `bridge/logs/`.
9. Detectar bloqueadores y reportar en 1 bloque resumido.
10. Continuar con la siguiente acción pendiente (según `PROJECT_STATE.json` → `nextAction`).

NO pedir al usuario que re-pegue contexto. NO usar historial de conversación
como mecanismo de persistencia. Todo está en los archivos de estado.

## Fuente de verdad (preservar y mantener actualizados)

| Archivo | Propósito |
|---|---|
| `AGENTS.md` | Reglas de este repositorio (este archivo) |
| `PROJECT_STATE.md` | Estado del proyecto legible para humanos |
| `PROJECT_STATE.json` | Estado del proyecto machine-readable (fase, commits, nextAction) |
| `TASK_QUEUE.md` | Roadmap de fases (Completed/Pending) |
| `TASK_QUEUE.json` | Cola de tareas machine-readable (active/pending/done) |
| `SESSION_HANDOFF.md` | Último handoff entre sesiones |
| `bridge/queue/` | Tareas del bridge pendientes/activas |
| `bridge/results/` | Resultados del bridge completados |
| `bridge/logs/` | Logs del bridge y del server lildax |
| `PHASES/` | Planes detallados de fases futuras |

## Normas duras (obligatorias en TODA sesión)

- NO usar operaciones destructivas de git para "arreglar" estado:
  `git reset --hard`, `git clean`, `git restore`, `git checkout .`, `git revert`, `git rebase`.
  Corregir el código, nunca destruirlo.
- NO eliminar trabajo sin backup previo. Antes de modificar dominio de una fase,
  guardar backup si hay duda.
- NO declarar PASS de build/test sin evidencia real (comando ejecutado + exit code).
- NO inventar APIs ni capacidades inexistentes. Comprobar interfaces reales.
- 9Router NO se modifica salvo necesidad estrictamente imprescindible.
- El bridge (`bridge/bridge.cjs`) es la vía hacia OpenCode/lildax v2. Preservar sus fixes:
  - no-duplicación de prompt (`promptMsgID`),
  - recuperación de sesión perdida tras reinicio,
  - recuperación de sesión colgada (`stuck`: intento previo sin respuesta).
- Al terminar una tarea: actualizar `PROJECT_STATE.*`, `TASK_QUEUE.json`, `SESSION_HANDOFF.md`
  y registrar resultado de build/tests.

## Estructura del repositorio

- `src/`, `frontend/`, `worker/` → Web (Vite + Cloudflare Worker + D1).
- `worker/src/domains/*` → dominios backend (cada uno: service.ts, routes.ts, repository.ts, validators.ts).
- `worker/migrations/*.sql` → migraciones D1.
- `worker/wrangler.toml` → configuración del Worker (D1 + R2 `CLINIC_DOCUMENTS_BUCKET`).
- `bridge/` → puente local hacia OpenCode/lildax (cola persistente, reintentos, recuperación).
- `PHASES/` → planes de fases. `RELEASE_*.md` → reportes de release.

## Entorno

- Windows / PowerShell 5.1. Shell: usar `cmd1; if ($?) { cmd2 }` (no `&&`).
- Worker typecheck: `worker\node_modules\.bin\tsc.cmd --noEmit -p worker\tsconfig.json`.
- Worker tests: `worker\node_modules\.bin\vitest.cmd run` (en `worker/`).
- Worker build: `worker\node_modules\.bin\wrangler.cmd deploy --dry-run --config worker\wrangler.toml --outdir worker\dist-check`.
- Bridge: `node bridge\bridge.cjs`.
- Credenciales: ver `SESSION_HANDOFF.md` (nunca escribir secretos nuevos en texto plano en el repo).

## Fases actuales

- **FASE 12.5** Documentos avanzados: typecheck PASS, build PASS, tests 103/103 PASS (commit pendiente).
- Siguientes: 12.6 → 12.7 → 12.8 → 12.9 → 13. Detalle en `TASK_QUEUE.md` y `PHASES/`.
