# PROJECT_STATE.md

Estado del proyecto. Fuente legible; la versión machine-readable es `PROJECT_STATE.json`.

## Fase actual: FASE 12.5 — Documentos avanzados

**Estado: REPARADA y ESTABILIZADA.** Typecheck PASS, build PASS, tests 103/103 PASS.
Pendiente: commit y completar funcionalidad restante (adjuntos, firmas digitales en documentos).

### Qué se hizo en esta sesión
- Corregidos **9 errores TypeScript** reales que rompían el typecheck de FASE 12.5:
  - `clinical-chat/routes.ts` — campos `nombre`/`telefono` (no `name`/`phone`).
  - `clinical-notes/routes.ts` — cast `body` a `Partial<ClinicalNoteInput>`.
  - `clinical-notes/service.ts` — `existing` tipado (era `{}`).
  - `sessions/service.ts` + `repository.ts` — `patient_id` derivado del tratamiento (`getPatientIdByTreatment`).
  - `index.ts` — alias para handlers duplicados de templates (consents vs templates).
- Instalado **vitest** en worker (tests reales).
- Actualizados `test/rbac.test.ts` al modelo RBAC real (FASE 12.1 expandió permisos).
- **Typecheck:** `tsc --noEmit` → EXIT 0.
- **Build:** `wrangler deploy --dry-run` → EXIT 0 (incluye R2 `CLINIC_DOCUMENTS_BUCKET`).
- **Tests:** `vitest run` → **103/103 PASS** (EXIT 0).

## Último commit
- `c2b9038` — docs: update state after FASE 12.5 repair

## Cambios sin commit (15)
Correcciones TS de worker + vitest + configuración persistente nueva:
`AGENTS.md`, `PROJECT_STATE.json`, `TASK_QUEUE.json`, `worker/src/index.ts`,
`worker/src/domains/{clinical-chat,clinical-notes,sessions}/*`, `worker/test/rbac.test.ts`,
`worker/package.json`, `worker/package-lock.json`.

## Bridge (comunicación con OpenCode/lildax)
- Fixes probados y preservados: no-duplicación de prompt (`promptMsgID`),
  recuperación de sesión perdida, recuperación de sesión colgada (`stuck`).
- Directorios: `bridge/queue/` (tareas), `bridge/results/` (resultados), `bridge/logs/`.
- Siguiente: integrar con el flujo real del proyecto (conector) + E2E real + automatización Windows.

## Siguiente acción (nextAction)
1. Commit FASE 12.5 (correcciones TS + vitest + configuración persistente).
2. Integración proyecto ↔ bridge.
3. Prueba end-to-end real.
4. Prueba de recuperación real.
5. Automatización Windows (arranque persistente).

## Bloqueadores
Ninguno.
