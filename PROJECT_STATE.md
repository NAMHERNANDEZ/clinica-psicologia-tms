# PROJECT_STATE.md

Estado del proyecto. Fuente legible; la versión machine-readable es `PROJECT_STATE.json`.

## Fase actual: MH-EXPANSION 1.1 — FRONTEND /mh/assessments (bienestar)

**Estado: COMPLETADA CON PASS REAL EN PRODUCCIÓN (deploy + E2E) + COMMIT `7463c67`.** Backend 1.0 (`1c15dad`) + UI 1.1.

### Evidencia real (producida en esta sesión)
- **Backend wellbeing (1.0)**: 6 escalas (stress-pss4, sleep-sq5, wellbeing-who5, activation-gad2, energy-vas3, focus-cfq3), scoring común, aislamiento user-scoped, migración 0043 aplicada.
- **Frontend (1.1)**: `/mh/assessments` (catálogo+historial) y `/mh/assessments/:scaleId` (responder→preview→completar→resultado) + mini chat `/api/chat` + borrador sessionStorage + previene doble submit.
- **Tests**: worker 227/227 PASS; frontend vitest/RTL 18/18 PASS; typecheck PASS; vite build PASS (1603 modules); wrangler dry-run PASS.
- **Deploy**: Worker `a63d0b10-2161-4b61-b43a-77755853a48d` + Pages `069b6e90`; assets MATCH local (index.html, JS/CSS wellbeing, brain.worker).
- **E2E producción PASS**: register→login cookie→scales 6→list 0→preview pss4 8/16 moderate→create id=3 score=8→list 1→detail responses=4→cleanup confirm=1 True.
- **WIP ajeno sin commitear**: `src/pages/Chat.tsx` y `worker/src/index.ts` (AI secretary).

## Fase previa: FASE MH — Mental Health / Bienestar personal

**Estado: COMPLETADA CON PASS REAL EN PRODUCCIÓN (deploy + E2E).**

### Evidencia real (producida en esta sesión)
- **Tests worker (vitest)**: 204/204 PASS (mental-health.test.ts 28/28).
- **Typecheck worker**: PASS (0 errores).
- **Build worker** (`wrangler deploy --dry-run`): PASS — 4028.50 KiB / gzip 989.08 KiB.
- **Build frontend** (VITE_API_URL): PASS — 8 chunks `Mh*` generados.
- **Migración 0042 aplicada a D1 remoto**: 18 queries, 40 filas, 7 tablas, seed 6 intervenciones.
- **Deploy worker** `clinica-psicologia-tms`: version `167ab998-12db-4806-af9f-788b8ff06e3e`.
- **Deploy Cloudflare Pages**: bundle `index-DZkxWOlF.js` (hash = build local).
- **E2E producción**: registro → login → 6 check-ins → recomendación → 2 sesiones de respiración
  (delta −4) → rechazo de `after=11` → insights `breathing_reduction` (conf 0.8) +
  `sleep_activation` (conf 0.85) → dismiss → consentimiento → diario → export (7 328 B) →
  persistencia tras recarga → delete account verificado. Usuarios/clínicas de prueba limpiados.
- **R2**: binding comentado en `wrangler.toml` (Cloudflare R2 no habilitado en la cuenta, error
  10042). Descomentar al activar R2 para fase 12.5 (docs).

### Qué incluye la FASE MH
- Backend `/api/mh/*`: check-in de 10-30 s (11 estados, intensidad/activación/energía/concentración/sueño),
  motor de recomendación V1 (seguridad si activación ≥ 9; respiración/relajación/reflexión según estado),
  sesión antes/después con delta y observación + disclaimer (no diagnóstico), insights trazables por
  usuario (sueño↔activación, reducción en respiración, sesiones cortas), consentimientos, diario,
  export JSON, borrado permanente. Todo user-scoped.
- UI `/mh` mobile-first con 7 pantallas (Hoy, Check-in, Intervenciones + detalle, Insights, Historial,
  Privacidad).

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
- (pendiente) MH-EXPANSION 1.0 — modelo de datos wellbeing + backend domain=wellbeing
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
1. Commit MH-EXPANSION 1.0 (PRODUCTION_PASS) — modelos wellbeing + backend.
2. Frontend /mh/assessments (hito FRONTEND: contratos listar/iniciar/preview/completar/resultado).
3. FASE 12.8 — Reportes.
4. Limpiar archivos basura del workspace.

## Bloqueadores
Ninguno.

## MH-EXPANSION 1.0 — MODELO DE DATOS WELLBEING (2026-09-12)
- Decisión: **OPCIÓN B** — tablas separadas `wellbeing_scales`, `wellbeing_assessments`, `wellbeing_responses` (user-scoped; sin clinic/patient/therapist). No se contamina el modelo clínico; FKs clínicos quedan intactos.
- Motor de scoring **COMPARTIDO**: `calculateScore`/`interpretScore` con `ALL_SCALE_DEFINITIONS`/`ALL_SCALE_CUTOFFS`. Wellbeing usa `WELLBEING_CUTOFFS` (bandas low/moderate/high, NO severidad clínica).
- 6 escalas seed: stress-pss4, sleep-sq5, wellbeing-who5, activation-gad2, energy-vas3, focus-cfq3.
- Rutas: `/api/assessments/wellbeing/{scales,scales/:id/cutoffs,list,preview,/:id}` + POST `/api/assessments/wellbeing`.
- Aislamiento: user A no lee B (404/list vacío); escala clínica en wellbeing → HTTP 400; rutas clínicas intactas.
- Producción PASS: 223/223 tests, audit 56/56, migración 0043 (102 tablas), Worker `3bb6dc69-f631-4efa-b843-e46b09eefcc8`.
- `backup/fase-mh-expansion-2026-09-12/` contiene diff y migración.
