# TASK_QUEUE.md

## Completed (Done)
- **FASE_11.0** Chat producción ✅: Public `/api/chat`, pricing fallbacks, knowledge base created. Deployed.
- **FASE_11.1** Captura leads ✅: Lead domain (repository, service, routes), extractor de chat, migración 0020. Local testing passed (8/8). Report: `FASE_11_1_LEADS_REPORT.md`.
- **FASE_11.2** Dashboard admin ✅:
  - Dashboard en `/admin` con RBAC (`AdminLayout`, `AdminDashboard`, `LeadsPage`).
  - Catalogo de CBT y TMS en Slider + Calendar.
  - Migración de auditoría (0021_leads_audit).
  - Rutas públicas + endpoints protegidos con RBAC admin.
  - Tests: 14/14 dashboard PASS, 8/8 leads PASS, tests RBAC fallidos pensan en permisos antiguos (fuera de FASE_11.2). Report: `FASE_11_2_DASHBOARD_REPORT.md`.
- **FASE_11.2.1** Deploy producción ✅: Migraciones D1 0020/0021 aplicadas, Worker desplegado, flujo Lead extremo a extremo. Report: `FASE_11_2.1_DEPLOY_REPORT.md`.
- **FASE_11.2.2** Hardening deploy ✅: Pipeline `deploy-production.ps1` (7 etapas) + scripts de verificación D1. Report: `FASE_11_2.2_HARDENING_REPORT.md`.
- **FASE_11.3** CRM Completion ✅: email + lead_notes (migración 0023), PATCH/DELETE soft, notas, búsqueda + filtros, CRUD completo probado en producción. Report: `FASE_11_3_CRM_REPORT.md`.
- **FASE_11.4** Agenda Completion ✅: Lead→Paciente promotion (migración 0024: lead_id, type, deleted_at, availability), soft delete appointments,.createFromLead con dedup por teléfono, AgendaPage con filtros tipo/estado, LeadsPage con "Crear cita" inline. Deploy: 7/7 stages OK, smoke appointments 9/9 PASS. Report: `FASE_11_4_AGENDA_REPORT.md`.
- **FASE_11.5** Automatizaciones ✅: Dominio automation (events, executor, templates, routes), records via DB rules, providers (whatsapp/email). Report: `FASE_11_5_AUTOMATION_REPORT.md`.
- **FASE_11.5.1** Hardening Automation ✅: Migracion 0025 (automation_rules/queue/history/audit), providers base. Report: `FASE_11_5_1_HARDENING_REPORT.md`.
- **FASE_11.6** Dashboard metrics ✅: Endpoint `/api/dashboard/overview` con KPIs, smoke 8/8 PASS. Report: `FASE_11_6_DASHBOARD_REPORT.md`.
- **FASE_11.7** Marketing AI ✅: Provider Gemini real, validador clinico dual-tier, Content/Campaign/SEO AI, 6 endpoints, migration 0026, frontend MarketingPage, smoke 25/25 PASS. Pre-existing errors fixed (automation/executor, reminders, dashboard, analytics). Report: `FASE_11_7_MARKETING_AI_REPORT.md`.
- **FASE_11.8** Chat IA Clinico ✅: Knowledge base clinica (11 entries), Chat AI service (Gemini + template fallback), emergency detection (Linea de la Vida), contact extraction, D1 persistence (migration 0027: chat_sessions/messages/analytics), 4 API endpoints (public message + admin sessions/messages/stats), frontend ChatPage (simulator, sessions, stats), smoke 19/19 PASS. Report: `FASE_11_8_DEPLOY_REPORT.md`.
- **FASE_12.1** EMR Core ✅: Patient demographics overhaul (CURP, gender, address, emergency contacts, insurance, allergies, medications — migration 0028), clinical records extensions (CIE10 codes, vitals, status, version — migration 0029), consent lifecycle (revocation, witness, versioning — migration 0030), document content fields, RBAC fixes (documents routes + map expansion), audit logging (clinical-notes + sessions services), CIE10 catalog (20 mental health codes seeded), access_log + vital_signs tables. 75 D1 tables. Smoke tests PASS. Report: `RELEASE_12.1.md`.
- **FASE_12.2** PatientChartPage ✅: Vista unificada del expediente clinico (10 tabs: datos, diagnosticos, tratamientos, notas, TMS, medicamentos, escalas, documentos, consentimientos, timeline), consume 12+ endpoints existentes, PUT /api/clinical-notes/:id (actualizar nota con version auto-increment), PUT /api/consents/:id/revoke (revocar consentimiento), route /app/expediente/:patientId, 84 assets frontend. Sin entidades nuevas. Smoke PASS. Report: `RELEASE_12.2.md`.
- **FASE_12.3** Notas Clinicas Profesionales ✅: Plantillas SOAP/DAP/BIRP/Libre (migraciones 0031/0031b/0031c), tablas note_templates/versions/signatures/audit, columnas en clinical_notes (template_type, fields_json, is_locked, signed_at/by, cosigned, signature_hash, risk_level), endpoints templates/update/lock/unlock/sign/cosign/versions/audit, rol psychiatrist + RBAC, NotasTab profesional en PatientChartPage (template selector, riesgo, campos estructurados, firmar/cofirmar/versiones), API client frontend, fix extraccion notas (clave 'notes'). Smoke 19/19 PASS. Report: `RELEASE_12.3.md`.
- **FASE_12.4** Consentimientos Avanzados ✅: Firma digital (consent_signatures: hash, IP, user agent, signer_type), versionado (consent_versions), ciclo de vida (draft→signed→active→revoked), columnas en consents (lifecycle, signed_at/by, signature_hash, revoked_reason), endpoints sign/signatures/versions/templates CRUD, ConsentimientosTab profesional (selector plantillas, firmar, revocar, badges lifecycle), API client frontend, fix crítico extractId (parts[3] para sub-rutas). Smoke 19/24 PASS. Report: `RELEASE_12.4.md`.
- **FASE_12.5** Documentos avanzados ✅ (reparación + estabilización real): WIP roto reparado — `service.ts` integra R2 con patrón real del proyecto (`env.CLINIC_DOCUMENTS_BUCKET`, sin clases inventadas), restaurados métodos signDocument/archiveDocument/supersedeDocument, scopes corregidos, `scanFileForViruses` cerrado, endpoint `GET /api/documents/:id/download` registrado, `CLINIC_DOCUMENTS_BUCKET` agregado a `Env`. Conservados: migración 0032, PatientAIChat widget, Deploy-12.5/12.6.bat, PHASES 12.6–12.9. **En esta sesión**: corregidos 9 errores TS reales (clinical-chat, clinical-notes, sessions, index.ts), vitest instalado, rbac.test.ts alineado al modelo real. **Evidencia real: typecheck PASS (tsc EXIT=0), build PASS (wrangler dry-run EXIT=0), tests PASS 103/103 (vitest EXIT=0).** Commit: `61fada8` + commit pendiente de correcciones.
- **BRIDGE + CONFIG PERSISTENTE** ✅: bridge comunicado con OpenCode/lildax v2 (flujo probado real: tarea→queue→OpenCode→lildax→results→DONE), fixes preservados (no-duplicación `promptMsgID`, sesión perdida, sesión colgada `stuck`), conector `bridge/run-task.cjs` (canal automático), auto-start Windows (Startup), y configuración persistente de sesión: `AGENTS.md`, `PROJECT_STATE.md/.json`, `TASK_QUEUE.json`, `SESSION_HANDOFF.md`. Pruebas reales: E2E PASS, recuperación PASS, auto-start PASS.

## Pending
- **FASE_12.5** Documentos avanzados (completar funcionalidad restante): validación adjuntos, firmas digitales en documentos.
- **FASE_12.6** Seguimiento: tareas clínicas, recordatorios, evolución.
- **FASE_12.7** Escalas: PHQ-9, GAD-7, BDI, etc.
- **FASE_12.8** Reportes: evolución, gráficas, exportación.
- **FASE_12.9** Portal paciente: acceso paciente, citas, documentos, mensajes.
- **FASE_13** Agentes clinicos IA: Investigacion (evidencia/papers), TMS (educacion paciente), Supervisor (revision calidad), Documentacion (ayuda administrativa).
- **FASE_14** Paciente digital: portal con login, citas, documentos, recordatorios, material educativo, seguimiento.
- **FASE_15** Escalamiento empresarial: multi-clínica (usuarios, pacientes, configuración, facturación).
- **FASE_16** Ecosistema completo: Marketing AI → Web+Chat IA → CRM → Agenda → Consulta → Expediente → Seguimiento → Analytics → Marketing AI.

### Marco Nº Técnico (backlog técnico, independiente del roadmap de producto)
- **FASE_10_MLIB** MLIB Upgrades (MWS → MLIB) con fallback a manual.
- **FASE_MAIN_DEV** Backend refactor (Medication, iconrendering, reviewFlows) → Service-Router → RxRoutes → Database (WOW ADDONS / triggers).
- **ODOO_DEVICE** Solicitudes de WhatsApp (integración server-side con moderación).
- **EJECUTIVO** Detener etapas, evaluar reestablecer Camilo (asegurar integridad del modelo).

## Evergreen
- Clínica URL: https://neurocienciaclinica.mx
- Worker URL: https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev
- Workspace: `C:\CLINICA_AI`
- Guard project: AI_WORKSPACE_GUARD (Python CLI), project id: `proj_293bc46b`

## Architecture
- **Web**: TS/React (Next.js frontend + Worker backend — en proceso de consolidación)
- **Backend**: Cloudflare Worker + D1 (SQLite remote).
- **DB**: Migrations en `worker/migrations/*.sql`
- **Frontend**: Vite (`src/` → `dist`), integrado en `worker/src/frontend-assets.ts`.

## Notes
- No enviar WhatsApp sin aprobación humana.
- No guardar diagnósticos ni medicamentos en leads (Lead ≠ Consulta).
- Dashboard in `/admin` (solo área privada con RBAC).
- Guía principal: `WORKSPACE.md` + `ARCHITECTURE.md`, `WARDROBE.md` (dominios).