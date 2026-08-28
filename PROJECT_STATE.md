# PROJECT_STATE.md

Estado del proyecto. Fuente legible; la versión machine-readable es `PROJECT_STATE.json`.

## Fase actual: FASE 12.7 — Escalas Clínicas (PHQ-9, GAD-7, BDI-II, PCL-5, AUDIT, DASS-21)

**Estado: COMPLETADA CON PASS REAL EN PRODUCCIÓN.**

### Evidencia real (producida en esta sesión)
- **Tests worker (vitest)**: 146/146 PASS (32 nuevos de assessments.test.ts).
- **Typecheck**: 0 nuevos errores (18 errores preexistentes en `blog/`, no relacionados).
- **Build worker** (`wrangler deploy --dry-run`): PASS — 3830.16 KiB / gzip 946.59 KiB.
- **Build frontend** (VITE_API_URL): PASS.
- **Migración 0034 aplicada a D1 remoto**: 6 queries, 26 rows, 7 changes, 83 tablas.
- **Deploy worker** `clinica-psicologia-tms`: v `b264d9c3`.
- **Smoke test real en producción** (`scripts/smoke-test-assessments.cjs`): 23/23 PASS.

### Endpoints verificados en producción
- `GET /api/assessments/scales` → 6 escalas con cutoffs.
- `GET /api/assessments/scales/:id/cutoffs` → 5 niveles por escala.
- `POST /api/assessments` con `responses[]` → 201 + score auto, max_score, cutoff.
- `GET /api/assessments/patient/:id` → assessments del paciente.
- `GET /api/assessments/patient/:id/:type` → filtrado por escala.
- `GET /api/assessments/:id` → detail.
- `POST /api/assessments/preview` → scoring en vivo sin persistir.

### Componentes entregados
- `worker/src/domains/assessments/{validators,repository,service,routes}.ts` (4 archivos).
- `worker/migrations/0034_assessments_scales.sql` (DDL + 6 seeds de escalas).
- `worker/test/assessments.test.ts` (32 tests).
- `src/pages/app/PatientChartPage.tsx` (EscalasTab enriquecido: 6 escalas, formulario ítem-por-ítem, score en vivo, historial agrupado).
- `scripts/smoke-test-assessments.cjs` (smoke test runner).
- `worker/src/index.ts` (wire de endpoints FASE 12.7).

## Último commit
- `a33fce0` — FASE 12.7: wire assessments scoring endpoints to index.ts
- `84e3e1b` — feat: FASE 12.7 Escalas Clinicas — backend completo + EscalasTab enriquecido

## Cambios sin commit (residuales del workspace, no de FASE 12.7)
- `$null`, `.atl/`, `00_CORE/`, `.opencodeignore`, `AUTONOMOUS_EXECUTION_PLAN.md`,
  `MASTER_LOOP.ps1`, `OPENCE_EXECUTE_PLAN_CMD.txt`, `XVPN_*.txt`, `app-errors.txt`,
  `bridge/auto-executor.cjs`, `bridge/results/`, `build-out.txt`, `errs.txt`,
  `scripts/smoke-test-assessments.cjs`, `tc.txt`, `typecheck-out.txt`,
  `worker/src/domains/blog/` (código no tipado, errores preexistentes).
- Acción recomendada: ignorar o limpiar en próxima sesión (no tocan FASE 12.7).

## Siguiente acción (nextAction)
1. FASE 12.8 — Reportes (evolución, gráficas, exportación).
2. Limpiar archivos basura del workspace.
3. Crear `RELEASE_12.7.md` con evidencia real.

## Bloqueadores
Ninguno.
