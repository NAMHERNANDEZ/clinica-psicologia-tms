# SESSION_HANDOFF.md

## Fix CHAT-TABS-TEXTO-VOZ (2026-09-14, COMMIT f420a94 +eb58395 + DEPLOY worker d3058243 + Pages 0d5ce393 - PASS EN /chat)

- **REPORTE USUARIO (correcto)**: botones de voz no visibles en /chat. Causa: controles solo en /voz + link bajo el fold. /voz existía pero el usuario usa /chat.
- **FIX (reuso, cero duplicación)**: pestañas Texto|Voz en /chat (Chat.tsx) montando el VoiceChat existente + botón mic en la barra del input que cambia a Voz. Sin tocar backend/voz.
- **REGLA GLOBAL PERMANENTE DEL USUARIO**: PASS exige flujo exacto pedido + E2E real + producción real + evidencia (SOURCE→BUILD→DEPLOY→RUNTIME→E2E, UI→acción→resultado) en LA MISMA ruta; sin PASS parcial.
- **EVIDENCIA EN /chat**: tabs visibles sin scroll; Voz muestra "Iniciar conversación" + input + enviar (screenshot test-results/e2e-chat-voz-tab.png verificado visualmente); mic→Voz; texto intacto. Tests frontend 28/28. E2E UI Edge 19/19 en /chat.
- **PENDIENTE AJENO**: neurocienciaclinica.mx no resuelve DNS desde esta red (verificar DNS/hosting fuera del repo).

## Fix VOZ-EXISTENTE (2026-09-14, COMMITS 25c3a83+d28f0fa+646534f + DEPLOY worker 49b4b47c - PASS PRODUCCION)

- **PREMISA (correcta)**: no reemplazar nada. Stack existente: VoiceChat + /api/voice/chat + sttRouter/ttsRouter + voice/routes.ts + keys en prod (GEMINI + OPENROUTER presentes).
- **HALLAZGO 1 (contrato roto)**: /api/chat/stt devolvía {success,data:{transcript}} pero VoiceChat exige {success,text} top-level -> TODA transcripción exitosa se descartaba y la voz quedaba "incompleta". Fix: toSttClientPayload() plano en voice-provider-router (server, aditivo: conserva transcript) + mismo uso en index.ts. Cero cambios frontend. Único consumidor verificado.
- **HALLAZGO 2 (catálogo podrido, evidencia tail en vivo)**: Gemini STT 404 (gemini-2.5-flash-preview retirado) + OpenRouter STT 403 (modelos harness-only) + LLM 503 (gemini-2.0-flash retirado; Google sugiere gemini-3.6-flash; OpenRouter gemma 429 transitorio). Fix SOLO IDs (misma arquitectura): DEFAULT_MODEL y STT -> gemini-3.6-flash (GA, audio in, docs oficiales) + fallback gemini-3.5-flash ante 503. TTS intacto (fish-audio vivo; gemini-2.5-flash-preview-tts sigue documentado).
- **TESTS**: voice-stt-contract 6/6 (contrato + router hermético + sin modelos retirados). Suite 347/347. Typecheck PASS.
- **E2E PRODUCCION (implementación existente)**: STT transcribe real "Hola." (wav del repo) con success/text; TTS mp3 57KB; voice/chat voice=true con audio; LLM revivido (HOLA 200); mic Edge con dispositivo falso -> flujo sin crash ni burbujas vacías. Smoke 29/29, UI Edge 14/14.
- **PROXIMO**: MH-EXPANSION 1.2 (CBT); fase 2 externa: challenge con codigo, recordatorios 24/48h, no-show.

## Fix CRISIS-SAFETY + VOZ UI + MATRIZ (2026-09-14, COMMITS f1dc857+495eab4+4147dc5 + DEPLOY worker eea6ed5b + Pages 16588592 - PASS PRODUCCION)

- **INCIDENTE CRITICO**: "kme quiero matar" -> horarios. Causa doble: (1) looksLikeCrisis no matcheaba ("quiero matar" separado no contiene "matarme"); con booking state residual need_slot reenviaba slots. (2) assessSafety+buildCrisisResponse existian pero MUERTOS (solo los usa un .bak); ningun path vivo los llamaba; crisis dependia de LLM FREE (caido -> 503 -> fallback secretary sin crisis).
- **FIX (reuso, sin duplicar)**: safety-router endurecido (normalizacion + frases/compactos tolerantes + isEmergency; assessSafety lo usa primero); looksLikeCrisis delega; crisisGate() unico en crisis-handler (reusa buildCrisisResponse, sin LLM, politica repo: sin lista de telefonos); gates ANTES de booking en /api/voice/chat (200 safety-deterministic + TTS best-effort, jamas 503), /api/chat (transfer_human plano) y FreeSecretary. Orden: CRISIS > SESSION > PRICING > BOOKING > LLM.
- **VOZ UI**: VoiceChat existia completo pero SIN MONTAR en ninguna ruta -> nueva ruta publica /voz (App.tsx) + link "Hablar por voz" en /chat. Evidencia visual: screenshot test-results/e2e-voz.png (boton Iniciar conversacion, input, enviar, burbuja precio).
- **MATRIZ**: worker chat-matrix 43/43 (crisis 16 variantes + 10 negativas, voice/secretary/multiturno, pricing/booking/date, no-silent-fallback 503, no-burbujas-vacias, no-svg); frontend VoiceChat 5/5 + Chat 3/3; scripts/smoke-chat-matrix.cjs (prod 21/21) + scripts/pre-deploy-gate.cjs (tsc+suites, bloquea release) + scripts/e2e-ui-edge.cjs (Edge sistema, 12/12).
- **E2E PRODUCCION PASS**: crisis voice+secretary determinista sin slots; smoke 21/21; UI Edge 12/12; /voz 200. STT/TTS en vivo requieren keys (gap preexistente tipo STT); matriz prueba ruteo por transcript + contratos; TTS crisis es best-effort sin caida.
- **PROXIMO**: MH-EXPANSION 1.2 (CBT); fase 2 con bloqueadores externos: challenge con codigo, recordatorios 24/48h, no-show; resto voice/ untracked ya commiteado lo necesario.

## Fix BOOKING-INTEGRITY (2026-09-14, COMMITS ec1a14b+20ba858 + DEPLOY 8a30a7f4 - PASS PRODUCCION)

- **OBJETIVO**: "crear cita" -> solicitud -> verificacion -> confirmacion -> cita. Un "si" ya no crea evento directo.
- **AUDIT PREVIO**: rate_limits sin DDL en repo (existe en prod; caps de booking estaban vivos solo a medias); automation = notificaciones internas, SIN canal de envio externo (Twilio/Resend/SMTP inexistentes) -> codigos por SMS/email quedan FASE 2 documentada; appointments exige patient_id/therapist NOT NULL y reminders leen appointments -> recordatorios 24/48h para chat quedan FASE 2 (requieren linkage + canal); /api/voice/appointments sin consumidores frontend -> contrato evolucionado a pending->confirm.
- **SCHEMA (migracion 0045, aplicada remoto via execute --file; journal D1 casi vacio, precedente 0042-44)**: rate_limits (IF NOT EXISTS, igual a prod) + booking_requests (requested/verified/confirmed/cancelled/expired/flagged, hashes, TTL, auditoria) + request_id en claims y sessions. OJO: `migrations apply` falla en 005 preexistente (duplicate column) -> usar execute --file.
- **MOTOR**: telefono MX requerido; 1 pendiente + 1 activa por identidad (hashes SHA-256); rafaga sesion 5/dia; flagging (3 nombres/telefono, 3 cancelaciones -> REVIEW_REQUIRED); holds 15min excluidos de availability + lazy expiry + sweeper en cron; flip atomico verified->confirmed (doble si); gate requestId en createBookingEvent (chat + directa); directa en 2 pasos con match de contacto; solo dias Lun-Sab.
- **TESTS**: booking-integrity 15/15 (ciclo, gate, caps, TTL, sweeper, flagging, rafaga, move-hold, directa x3, chat telefono, domingo). Suite 298/298. Typecheck PASS. Raices halladas por tests: verify se autobloqueaba (exclusion own-request) y el hold propio chocaba con su PK en confirm (ownLiveHold + flip).
- **E2E PRODUCCION PASS**: chat completo -> evento real -> cancel (D1 #1 cancelled con auditoria); directa pending sin evento + duplicado 429; domingo rechazado; date-change y pricing intactos. Residuo: request #2 (domingo, pre-fix) expira solo sin evento.
- **FASE 2 (bloqueadores externos)**: challenge con codigo (requiere proveedor envio + keys), recordatorios 24/48h (requieren linkage appointments + canal), escalamiento no-show (requiere registro de asistencia por staff).
- **PROXIMO**: MH-EXPANSION 1.2 (CBT) + decidir commit del resto de voice/ untracked (routes.ts base ya commiteada en ec1a14b por necesidad).

## Fix BOOKING-DATE-CHANGE (2026-09-14, COMMIT 0148f2e + DEPLOY e88a829f - PASS PRODUCCION)

- **ROOT CAUSE**: need_slot jamas extraia fecha del mensaje y reenviaba offered_slots cacheados (Y EL LUNES -> slots del sabado). Segunda raiz hallada por tests: need_confirm corregia fecha con cualquier texto con dia de semana (Domingo Perez -> cambiaba fecha a domingo en el mismo turno del contacto).
- **FIX (backend)**: need_slot actualiza fecha + limpia slot/slots ante fecha nueva + filtro offered_slots por fecha + respuesta con fecha explicita; need_contact redirige cambio tardio a need_slot (email tiene prioridad; looksLikeDateChange protege nombres); need_confirm solo corrige fecha ante cambio real y hora ante hora pura. Precios: fuente canonica unica exportada en ai-secretary.ts (TMS_PRICE_MESSAGE, THERAPY_PRICE_MESSAGE, PRICING_BOTH_MESSAGE).
- **TESTS**: booking-date-change 11/11 (sabado->lunes, repetido, proximo/este, explicitas, manana, slot->cambio, terapia conserva modalidad, Domingo Perez contacto/nombre, looksLikeDateChange). Suite 282/282. Typecheck PASS. Dry-run PASS.
- **E2E PRODUCCION PASS**: TMS -> sabado slots 19-sep -> Y EL LUNES -> slots lunes 14-sep fechados (0 replay); 14:00 ocupado rechazado por Calendar real; 15:00 -> contacto -> confirm -> evento real creado -> cancelado OK (sin residuo); terapia en linea -> sabado -> mejor el lunes -> slots lunes; pricing intacto. Semantica documentada: dia de semana = proxima ocurrencia desde hoy America/Mexico_City (hoy->+7).
- **PROXIMO**: MH-EXPANSION 1.2 (CBT) + decidir commit del resto de voice/ untracked.

## Fix forense CHAT-PRICING-MODALITY (2026-09-14, COMMIT 9ba0296 + DEPLOY b66adb6d - PASS PRODUCCION)

- **ROOT CAUSE (probada, no asumida)**: looksLikeBooking incluia 'consulta'/'valoraci' -> CUANTO LA CONSULTA TMS entraba a booking y pedia modalidad. Y wantsBooking con state residual != idle -> COSTO caia en need_slot -> horarios. Sin prioridad PRICING.
- **FIX (backend)**: looksLikePricing+extractPricingService+pricingReplyFor en booking.ts antes de booking, sin mutar state. TMS=presencial automatico. Misma regla en ai-secretary.ts (fallback /api/chat). Precios canonicos: TMS $1,500 / psico $500.
- **TESTS**: chat-pricing-modality 21/21. Suite 271/271. Typecheck PASS. Dry-run PASS.
- **DEPLOY**: Worker b66adb6d (sin cambios frontend). booking.ts vivia untracked y se commiteo en esta unidad; voice/routes.ts y resto de voice/ SIGUEN untracked (skew parcial preexistente, fuera de alcance).
- **E2E PRODUCCION PASS**: COSTO/CUANTO/PRECIO->precios; COSTO TMS y CUANTO LA CONSULTA TMS->$1,500; COSTO TERAPIA->$500; AGENDAR TMS->fecha directo + slots reales Calendar 19-sep; AGENDAR PSICOLOGIA->pregunta modalidad; switch booking->COSTO->precio->retoma slots; /api/chat->pricing_tms; /chat 200; 0 burbujas vacias; 0 <svg.
- **SVG**: no reproducido (respuestas texto plano). Guard en tests: ninguna respuesta contiene <svg.
- **PROXIMO**: MH-EXPANSION 1.2 (CBT) + decidir commit del resto de voice/ untracked.

## Reconciliación SECRETARY (2026-09-12, COMMIT 6705a07 + DEPLOY d20f53b8 — SKEW CERRADO)

- **Commit unidad independiente**: `6705a07` (index.ts + secretary/routes.ts + Chat.tsx + secretary-chat.test.ts). Fuera: migraciones 0038/0039, chat-ai-regression, evidence/bak (otras tareas).
- **Reproducibilidad probada**: typecheck PASS, 227/227, 18/18, build PASS, regen frontend-assets.ts SIN diff, dry-run PASS, Pages subió 0 archivos (bytes idénticos).
- **Runtime d20f53b8**: chat flat 200 idéntico (322 chars, sin data anidada) + MH E2E completo PASS + cleanup + assets 5/5 MATCH con mismos hashes.
- **Cierre global**: producción == HEAD. MH-EXPANSION 1.2 desbloqueado para diseño y deploy.

## Cierre forense SECRETARY REFACTOR (2026-09-12, sin commit — WIP independiente)

- **Inventario**: `worker/src/index.ts` (M, 3 hunks: solo imports + body `/api/chat` → delega a `handleChat`); `worker/src/domains/secretary/routes.ts` (?? untracked, única definición de `handleChat`, reutiliza `lib/ai-secretary.ts` + `domains/leads/*` trackeados); `src/pages/Chat.tsx` (M: voice-first `/api/voice/chat` + fallback plano `/api/chat`, valida `fj.message` no vacío).
- **No duplicación**: un solo `handleChat`, un solo `createSecretary`. `frontend/` es árbol legacy divergente (26 tracked, último toque `a3fe270`; dist stale sin chunks Mh; no cableado a wrangler/Pages que usan root dist) → inerte, NO borrar (flag para limpieza dedicada).
- **Delta real vs HEAD**: fix de burbujas vacías — el `json()` viejo anidaba `{success:true,data:{action,message...}}` pero el frontend lee `message` en top-level; el refactor devuelve plano `{success,message,...}`. Producción verificado: `/api/chat` 200 real (action=respond, 322 chars).
- **Impacto MH: NINGUNO**. Diff no toca `/api/mh/*` ni `/api/assessments/wellbeing/*`. Evidencia: worker 227/227, frontend 18/18, E2E wellbeing PASS sobre el mismo deploy `a63d0b10`, assets 6/6 MATCH.
- **STT 500 clasificado**: con multipart válido responde `provider:none`, error explícito "STT FREE no disponible (Gemini + OpenRouter FREE)" → falta de keys, dominio voz preexistente, ruta intacta en el diff. `calendar/auth` 401 = comportamiento esperado sin auth (ruta intacta).
- **SKEW COMMIT/DEPLOY (riesgo)**: producción `a63d0b10` SÍ ejecuta el refactor (build desde working tree con archivo untracked). HEAD no lo contiene → un deploy futuro desde checkout limpio REVERTIRÍA `/api/chat` al envelope anidado. REGLA: commitear la tarea secretary por separado ANTES de cualquier nuevo deploy; no redesplegar hasta entonces. Producción actual queda INTACTA.
- **1.2 (CBT)**: vía libre — MH limpio, therapeutic-engine no tocado por este WIP.

## Ultima sesion: 2026-09-12 (MH-EXPANSION 1.1 — FRONTEND /mh/assessments, PRODUCTION_PASS_COMMITTED)

- **COMMIT**: `7463c67` `feat(frontend): MH-EXPANSION 1.1 - UI /mh/assessments wellbeing`.
- **BACKEND** (commit previo `1c15dad`, MH-EXPANSION 1.0): dominio wellbeing desplegado, 6 escalas, scoring comun, E2E 1.0 PASS.
- **FRONTEND NUEVO**: `MhAssessmentsPage.tsx` (catalogo + historial user-scoped API real, errores visibles, retry, null-safe), `MhAssessmentRunPage.tsx` (flujo answer->preview->complete->result, borrador sessionStorage, previene doble submit con boton disabled real en fase saving, error real sin mock/demo, mini chat /api/chat), `wellbeing-questions.ts` (contenido 6 escalas, sin scoring en frontend), `api.ts` (+wellbeing client y sendChatMessage), `App.tsx`/`MhLayout.tsx` (rutas y nav).
- **TESTS FRONTEND NUEVOS**: vitest+RTL+jsdom+jest-dom. `vitest.config.ts` requiere `esbuild.jsx: 'automatic'` (si no: "React is not defined"). 18/18 PASS (wellbeing-questions 6, MhAssessmentsPage 5, MhAssessmentRunPage 7).
- **BUILD**: typecheck worker PASS, worker tests 227/227, frontend tests 18/18, vite build PASS (1603 modules), wrangler dry-run PASS.
- **DEPLOY**: Worker `a63d0b10-2161-4b61-b43a-77755853a48d` + Pages `069b6e90.clinica-psicologia-tms.pages.dev`. Assets MATCH local (MhAssessmentsPage-QM14edIm.js, MhAssessmentRunPage-C-ISsCri.js, index-BZfI5yRE.js, index.html, css, brain.worker).
- **E2E PRODUCCION PASS**: register->login cookie->scales 6->list 0->preview pss4 score=8/16 moderate->create id=3 score=8->list 1->detail responses=4 score=8->account confirm=1 cleanup True.
- **REGRESIONES CORREGIDAS AQUI**: `scales.length` crash cuando `success:true, data:null` (null-safe en MhAssessmentsPage); duplicacion de interpretacion en resultado; preview ahora visible en fase saving (boton wb-confirm disabled real); tests con queries ambiguas (getAllByText/getAllByRole dentro de wb-preview).
- **WIP AJENO NO COMMITEADO** (otra tarea, AI secretary/chat): `src/pages/Chat.tsx`, `worker/src/index.ts`. Dejar para su propia tarea.
- **PROXIMO**: roadmap 12.6+ (ver TASK_QUEUE.json). NOTA: scoring PSS-4 inversion de items 2/4 NO implementado (suma simple) documentado como mejora futura.

## Sesion anterior: 2026-09-12 (MH-EXPANSION 1.0 — MODELO DE DATOS WELLBEING, PRODUCTION_PASS)

- **CONTEXTO**: FASE MH consolidada (`8d2fcc1`). `MH-EXPANSION 1.0` usa `/api/assessments`, R2 sigue desactivado. No se creó un segundo assessment engine.
- **DECISIÓN**: OPCIÓN B — tablas separadas wellbeing (user-scoped) por FKs clínicos obligatorios (clinic/patient/therapist). Nada clínico modificado.
- **MIGRACIÓN**: `worker/migrations/0043_wellbeing_assessments.sql` APPLIED remoto (6 escalas seed; 102 tablas; indices (user_id,domain,administered_at); FK user_id→users ON DELETE CASCADE; provenance user_self_report|imported|system_generated; disclaimer por registro).
- **BACKEND**: `validators.ts` (WELLBEING_SCALE_DEFINITIONS + WELLBEING_CUTOFFS + getScaleDomain; scoring COMUN reutilizado), `repository.ts`, `service.ts`, `routes.ts`, `index.ts` (6 rutas `/api/assessments/wellbeing/*`).
- **TESTS**: `worker/test/wellbeing-assessments.test.ts` 19/19 (scoring, bandas, aislamiento cross-domain, user-scoping SQL, rechazo escala clínica, regresión clínica). Suite total 223/223. Audit 56/56. Typecheck PASS.
- **DEPLOY**: Worker `3bb6dc69-f631-4efa-b843-e46b09eefcc8` (previa `167ab998`). Primera deploy tenía bug: regex cutoffs `[\w]+` no matcheaba `stress-pss4` (guion) → corregido a `[\w-]+`, redeployed, cutoffs 3 bandas verificado.
- **E2E PRODUCCIÓN PASS**: scales 6, cutoffs x2 3 bandas cada, preview score=8 moderate, create id=1 score=8, list A=1 B=0, detail A responses=4, B→A 404 (aislado), clínica→wellbeing 400, preview clínico phq9 OK, clinical-scales 6, chat 200, cleanup confirm=1 OK (usuarios probe limpiados).
- **BACKUP**: `backup/fase-mh-expansion-2026-09-12/` (diff-backend.diff + 0043 SQL + tests).
- **COMMIT PENDIENTE** de MH-EXPANSION + estado. Siguiente hito: FRONTEND `/mh/assessments` (contratos listar/iniciar/preview/completar/resultado), luego roadmap 12.8.

## Sesion anterior (historial)

## Ultima sesion previa: 2026-09-12 (FASE MH — CONSOLIDADA CON COMMIT `8d2fcc1`)

- **COMMIT**: `8d2fcc15097c641ab1dbe305e7156298bc816060` (23 archivos, +3424) — FASE MH + estado.
  Base previa: `ac2162c`. No hubo redeploy (hashes `index-DZkxWOlF.js` / `MhLayout-B0evBqam.js` idénticos
  antes y después del commit; el runtime desplegado no cambió).
- Backup verificable: `backup/fase-mh-2026-09-12/` (14 archivos verificados por SHA256, manifest `BACKUP_MANIFEST.sha256`).
- Revalidación post-commit: typecheck PASS, vitest 204/204 (MH 28/28), dry-run 4028.50 KiB, frontend build PASS,
  audit 56/56 — todo repetido de cero, no asumido.
- Regresión runtime producción: health 200, /mh 200, home estable 3/3, checkin+rec, sesión delta −4, journal,
  export 200, assessments/scales 6, chat 200, security 200, delete OK. Usuarios probe limpiados de D1.
- Defectos preexistentes documentados (NO regresión MH, código voz WIP nunca desplegado antes de este upload):
  `GET /api/voice/availability` → 500 "Unexpected end of JSON input" (handler exige POST con body,
  `worker/src/domains/voice/routes.ts:308 handleCheckAvailability`); `GET /api/calendar/auth` → error 1101
  (excepción en ruta OAuth). Tratar en una fase de voz/calendar dedicada, no en consolidación MH.

### Estado al cerrar la sesion
- **Objetivo completado y desplegado en produccion**: dominio `mental-health` (/api/mh/*) + UI mobile-first
  `/mh` + migracion D1 `0042_mental_health.sql` + tests 28/28 + E2E real contra produccion PASS.
- **Backend nuevo** `worker/src/domains/mental-health/`: validators, service (motor de recomendacion V1
  activacion/energia/sueno/estado, delta antes/despues, insights trazables con disclaimer
  "no es diagnostico", computeStreak, computeStats), repository (user-scoped SIEMPRE por user_id),
  routes (home, checkins, trend, interventions, sessions, insights+dismiss, consents, journal,
  export JSON, delete account). Wiring completo en `worker/src/index.ts` (bloque FASE MH).
- **UI nueva** `src/pages/mh/`: MhLayout (nav mobile-first, logout, disclaimer pie), Home (prioridades:
  como estoy / que necesito / que puedo hacer / que aprendi), Checkin (11 estados, 4 sliders,
  sueno, contexto, nota -> resultado + recomendacion), Intervenciones (catalogo + filtros),
  IntervencionDetail (flujo antes -> practica con cronometro -> despues -> siguiente + resultado),
  Insights (open/dismissed), Historial (checkins/sesiones/diario tabs), Privacidad
  (consentimientos, exportar datos, eliminar datos). Rutas en `src/App.tsx` (ProtectedRoute)
  y cliente `src/lib/api.ts` (namespace `mh`). `src/pages/mh/*` NO generan errores TS.
- **Migracion 0042 aplicada en remoto** (18 queries, 40 filas escritas, 7 tablas, seed 6 intervenciones).

### Accion clave: R2 comentado en `worker/wrangler.toml`
- Cloudflare NO tiene R2 habilitado en la cuenta (errores 10042 "enable R2" / 10085 "bucket not found").
  El binding activo impedía el deploy. Se comento `[[r2_buckets]]` (linea 12-15) siguiendo la
  intencion documentada del propio archivo ("descomentar tras activar R2"). DOCS 12.5 quedó
  funcional en codigo pero NO desplegado (WIP previo sin deploy verificado). Para integrar docs:
  activar R2 en dashboard y descomentar.

### Evidencia de produccion (E2E real, 2026-09-12)
| Prueba | Resultado |
|---|---|
| Worker deploy `clinica-psicologia-tms` | PASS version `167ab998-12db-4806-af9f-788b8ff06e3e` |
| Pages deploy `clinica-psicologia-tms.pages.dev` | PASS (bundle `index-DZkxWOlF.js` = hash local exacto) |
| SPA /mh worker + pages | 200 en ambos |
| Chunk `MhLayout-B0evBqam.js` | servido por worker Y pages = hash local, contiene MyCalma |
| Typecheck worker | PASS |
| Tests worker | PASS 204/204 (18 archivos; mental-health 28/28) |
| vite build frontend | PASS (8 chunks Mh*) |
| Pre-deploy audit | PASS 56 checks |
| E2E API produccion | registro->login->checkins x6->recomendacion->sesiones delta=-4->rechazo after=11->insights conf 0.8/0.85->dismiss->consents->journal->export 7328B->persistencia reload->delete verificado |
| Limpieza | usuarios/clinicas de prueba E2E borrados de D1 |

### Pendientes
- Commit de la FASE MH (todo en working tree, listo).
- RELEASE_FASE_MH.md con la evidencia.
- Activar R2 y descomentar wrangler.toml para fase 12.5 (docs).

## Ultima sesion: 2026-09-12 (RESTAURACION post-reset — seguridad y consistencia del worker)

### Estado al cerrar la sesion
- Problema raiz: `git reset` previo perdio cambios NO commiteados sobre archivos trackeados
  (types.ts, gemini.ts, index.ts, dominios). Los archivos untracked de voz/engine/frontend
  SOBREVIVIERON; lo que se perdio/corrompio fue el wiring y los guards en trackeados.
- Restaurado y verificado (7 archivos trackeados modificados, SIN commit):
  - **Guards IDOR/BOLA por clinica**: assessments (2), clinical-notes (1), tms-profiles (2),
    tms-sessions (3): fetch previo de la entidad + `X.clinic_id !== user.clinic_id` -> 404.
  - **index.ts**: rate-limit GLOBAL temprano (antes de rutas publicas), rutas de voz
    (/api/voice/chat, /tts, /availability, /appointments), STT (/api/chat/stt),
    OAuth calendario (/api/calendar/auth con sesion admin/therapist + nonce,
    /api/calendar/callback con consumeOAuthState + exchangeCode + storeCalendarAuth),
    `limitChatText` en /api/chat (anti-abuso).
  - **types.ts Env**: props OPENROUTER_API_KEY, UNOROUTER_API_KEY, UNOROUTER_BASE_URL.
  - **gemini.ts**: `geminiSTTRouter` reimplementado (STT inline base64, modelo flash-preview).
  - **gtts.ts**: stub corregido (ArrayBuffer real). **realtime-voice.ts**: imports
    `../../lib/calendar-oauth` corregidos (habian una ruta rota `./calendar-oauth`).
  - **therapeutic-engine.ts**: interfaz catalog renombrada a TherapeuticStrategy,
    helper toMove, uniones strategy/phase ampliadas, buildResponse reimplementado
    (eran 27 errores TS; hoy typecheck limpio).

### Pruebas reales completadas (evidencia)
| Prueba | Resultado |
|---|---|
| Typecheck worker (tsc --noEmit) | PASS (0 errores) |
| Tests worker (vitest) | PASS 176/176 (17 archivos; incluye idor-regression 7/7 y gemini 8/8) |
| Build worker (wrangler deploy --dry-run) | PASS (3903.79 KiB / gzip 963.66 KiB) |
| Deploy | NO realizado (sin instruccion esta sesion) |

### Estado de produccion
- Worker vivo: `clinica-psicologia-tms` (version observada 8dc3639c).
- Los cambios de esta sesion estan en working tree — un deploy futuro sin commit los perdera.
  **ACCION RECOMENDADA: commit + deploy.** Ver `RELEASE` pendiente en `TASK_QUEUE.md`.

### Siguiente accion (proxima sesion)
1. `git add` de los 7 archivos trackeados modificados + commit (mensaje tipo
   "fix: IDOR guards por clinica + wiring voz/STT/calendario + rate-limit global").
2. `wrangler deploy` (si el usuario lo autoriza) y smoke de produccion:
   login -> paciente -> assessments -> convenio/cross-clinica 404 -> reload.
3. Continuar fases pendientes segun `TASK_QUEUE.md` (12.8 Reportes ...).

---

## Sesiones anteriores (historial)

## Ultima sesion: 2026-08-28 (FASE 12.7 PASS real con deploy + smoke)

### Estado al cerrar la sesion
- **FASE 12.7 Escalas Clinicas**: PASS real en produccion.
  - Commit 84e3e1b: backend completo (assessments/validators, repository, service, routes) + EscalasTab.
  - Commit a33fce0: wire endpoints (importa handlers de assessments en index.ts, reemplaza handlers viejos de tms-engine).
- **Migracion 0034 aplicada a D1 remoto**: 6 queries, 26 rows written, 7 changes, 83 tablas.
- **Worker desplegado en `clinica-psicologia-tms`**: v b264d9c3.
- **Smoke test real en produccion**: 23/23 PASS.

### Pruebas reales completadas (evidencia)
| Prueba | Resultado |
|---|---|
| Tests worker (vitest) | PASS 146/146 (32 nuevos de assessments) |
| Typecheck | 0 nuevos errores (18 errores preexistentes en blog/) |
| Build worker (wrangler dry-run) | PASS 3830.16 KiB / gzip 946.59 KiB |
| Build frontend (VITE_API_URL) | PASS (dist/ generado) |
| Migracion 0034 a D1 remoto | PASS (26 rows, 7 changes) |
| Deploy worker `clinica-psicologia-tms` | PASS v b264d9c3 |
| Smoke test produccion: 23 assertions (scales, cutoffs, create, score, cutoff info, by patient, detail, preview) | PASS 23/23 |

### Endpoints funcionales validados (FASE 12.7)
- `GET /api/assessments/scales` -> 6 escalas (PHQ-9, GAD-7, BDI-II, PCL-5, AUDIT, DASS-21)
- `GET /api/assessments/scales/:id/cutoffs` -> array de 5 niveles
- `POST /api/assessments` (con `responses[]`) -> 201 + score auto, max_score, cutoff
- `GET /api/assessments/patient/:id` -> assessments del paciente
- `GET /api/assessments/patient/:id/:type` -> filtrado por escala
- `GET /api/assessments/:id` -> detail
- `POST /api/assessments/preview` -> scoring en vivo sin persistir

### Siguiente accion (proxima sesion)
1. Continuar FASE 12.8 Reportes (evolucion, graficas, exportacion) segun `TASK_QUEUE.md`.
2. Limpiar archivos basura en el ws (sin tocar repo): `$null`, `.atl/`, `00_CORE/`, `*.txt` de debug, `bridge/auto-executor.cjs`, `worker/src/domains/blog/` (codigo no tipado correctamente).
3. Actualizar `RELEASE_12.7.md` con evidencia real de la sesion.

### Archivos modificados en esta sesion
- `worker/src/index.ts` (+3/-9 lineas: import aliases + unificacion rutas)
- `src/pages/app/PatientChartPage.tsx` (-2/-1 lineas: simplificacion de console.log)
- 6 archivos en `worker/src/domains/assessments/` (commit previo 84e3e1b)
- `worker/migrations/0034_assessments_scales.sql` (commit previo 84e3e1b)
- `worker/test/assessments.test.ts` (commit previo 84e3e1b)
- `scripts/smoke-test-assessments.cjs` (smoke test runner, no commiteado)

---

## Sesiones anteriores (historial)

## Ultima sesion: 2026-08-08 (FASE 12.5 PASS real + bridge integrado + config persistente)

### Estado al cerrar la sesion
- **Bridge**: RUNNING, auto-start configurado (Startup shortcut `OpenCodeBridge.lnk`).
- **FASE 12.5**: typecheck/build/tests PASS — listo para commit (22 archivos sin commit).
- **Protocolo persistente**: `AGENTS.md` + `PROJECT_STATE.*` + `TASK_QUEUE.json` + `SESSION_HANDOFF.md`.

### Pruebas reales completadas (evidencia)
| Prueba | Resultado |
|---|---|
| Bridge resiliencia (3 casos) | PASS (sesión perdida, no-duplicación, stuck) |
| E2E real (tarea→bridge→OpenCode→lildax→results) | PASS — `e2e-real-001` → `E2E_OK` |
| Recuperación real (RUNNING→interrupción→reinicio) | PASS — `RECOVERY_OK`, attempts=2 |
| Auto-start Windows (reinicio simulado) | PASS — bridge pid 864 procesó `auto-start-003` → `AUTO_OK` |
| Typecheck worker | PASS (tsc EXIT=0) |
| Build worker (wrangler dry-run) | PASS (incluye R2 CLINIC_DOCUMENTS_BUCKET) |
| Tests worker (vitest) | PASS 103/103 |

### Siguiente accion (proxima sesion)
1. `git add` + commit FASE 12.5 (correcciones TS, vitest, rbac test, bridge, config persistente).
2. Continuar FASE 12.5 restante (adjuntos, firmas digitales) o pasar a FASE 12.6 segun `TASK_QUEUE.md`.

### Como se usa el bridge (canal automatico)
- Encolar + esperar resultado: `node bridge\run-task.cjs "prompt" [--id nombre] [--model provider/model]`
- Resultados en `bridge/results/<id>.json`, logs en `bridge/logs/`.
- Auto-arranque al iniciar Windows (acceso directo en carpeta Startup).

### Credenciales bridge
- server lildax local: puerto 4137, password local (ver `bridge/config.json`; no exponer).
- Ver `bridge/logs/bridge.log` y `bridge/logs/server.log`.

---

## Sesiones anteriores (historial)

## Ultima sesion: 2026-08-08 (FASE 12.5 reparada y estabilizada)

## Estado actual
- **FASE 11.8** Chat IA Clinico **COMPLETADA** ✅ — Worker `95288ac5`, smoke 19/19 PASS
- **FASE 12.1** EMR Core **COMPLETADA** ✅ — Worker `20e57e9b`, 75 D1 tables, smoke PASS
- **FASE 12.2** PatientChartPage **COMPLETADA** ✅ — Worker `a2e13e19`, 84 assets frontend
- **FASE 12.3** Notas Clinicas Profesionales **COMPLETADA** ✅ — Worker `3f412d7a`
- **FASE 12.4** Consentimientos Avanzados **COMPLETADA** ✅ — Worker `c3609e7e`
- **FASE 12.5** Documentos avanzados **REPARADA** ✅ — Commit `61fada8`
  - WIP roto reparado: service.ts ahora usa `env.CLINIC_DOCUMENTS_BUCKET` (patrón R2 real del proyecto, sin clases inventadas)
  - Métodos restaurados: signDocument, archiveDocument, supersedeDocument
  - Endpoint nuevo registrado: `GET /api/documents/:id/download`
  - `CLINIC_DOCUMENTS_BUCKET` agregado a interfaz `Env`
  - Typecheck documents domain: 0 errores nuevos (12 errores pre-existentes en otros dominios, idénticos a HEAD)
  - Worker build (wrangler dry-run): PASS
  - Frontend vite build: PASS (115 errores TS pre-existentes, 0 nuevos)
  - Consents smoke: 22/24 PASS (limitaciones conocidas de templates CUSTOM)
  - Conservado: migración 0032, PatientAIChat widget, Deploy-12.5/12.6.bat, PHASES 12.6–12.9
  - Pendiente: completar funcionalidad restante FASE 12.5 (adjuntos/firmas), luego FASE 12.6

## Pendiente
- **FASE 12.5** (resto) — Documentos (adjuntos, firmas digitales de documentos)
- **FASE 12.6** — Seguimiento (tareas clínicas, recordatorios, evolución)
- **FASE 12.7** — Escalas (PHQ-9, GAD-7, BDI, etc.)
- **FASE 12.8** — Reportes (evolución, gráficas, exportación)
- **FASE 12.9** — Portal paciente (acceso paciente, citas, documentos, mensajes)

## Archivos clave
- `TASK_QUEUE.md` — roadmap con prioridades
- `SESSION_HANDOFF.md` — este archivo
- `RELEASE_11.8.md` — release FASE 11.8
- `RELEASE_12.1.md` — release FASE 12.1
- `RELEASE_12.2.md` — release FASE 12.2
- `RELEASE_12.3.md` — release FASE 12.3
- `RELEASE_12.4.md` — release FASE 12.4
- `PHASES/12.6.md` – `12.9.md` — planes de fases siguientes

## Credenciales de acceso
- Admin: `admin@clinica.com` / `Admin123!`
- Worker URL: `https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev`

## Git tags
- `v11.8` — FASE 11.8 Chat IA Clinico
- `v12.1` — FASE 12.1 EMR Core
- `v12.2` — FASE 12.2 PatientChartPage
- `v12.3` — FASE 12.3 Notas Clínicas
- `v12.4` — FASE 12.4 Consentimientos Avanzados
```
Admin -> Marketing AI -> Prompt Estructurado -> Gemini API -> Validador Clinico -> Audit D1 -> Aprobacion Humana -> Publicacion
```

## API endpoints (FASE 11.7)
- `GET /api/marketing/overview` — KPIs de marketing
- `POST /api/marketing/content/generate` — Generar contenido (blog/social/email/whatsapp)
- `GET /api/marketing/content` — Historial generado
- `PATCH /api/marketing/content/:id/status` — Aprobacion humana
- `POST /api/marketing/campaign/generate` — Generar campana
- `POST /api/marketing/seo/generate` — Analisis SEO
