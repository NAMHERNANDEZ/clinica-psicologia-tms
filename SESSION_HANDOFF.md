# SESSION_HANDOFF.md
## Ultima sesion: 2026-08-03 (FASE 11.7 + 11.8 completadas)

## Estado actual
- **FASE 11.7** Marketing AI **COMPLETADA** ✅
  - Provider Gemini real (`src/ai/providers/gemini.ts`) con fallback a template
  - Validador clinico dual-tier (13 BLOCKED + 13 WARNING terms)
  - Content AI, Campaign AI, SEO AI services
  - 6 endpoints API (overview, content/generate, content list, content status, campaign/generate, seo/generate)
  - Migration 0026 (marketing_content, marketing_campaigns, seo_analysis, ai_audit_logs)
  - Frontend MarketingPage con 4 tabs (Contenido IA, Campanas IA, SEO IA, KPIs)
  - Smoke tests 25/25 PASS en produccion
  - Deploy completo: worker + frontend assets

- **FASE 11.8** Chat IA Clinico **COMPLETADA** ✅
  - Knowledge base clinica (11 entries: services, pricing, location, hours, faq, emergency)
  - Chat AI service (`src/ai/services/chat-ai.ts`) — Gemini + template fallback + clinical safety
  - Emergency detection → Linea de la Vida 800 911 2000 (auto-transfer)
  - Contact extraction (nombre, telefono, email, edad, servicio, motivo)
  - D1 persistence: migration 0027 (clinical_chat_sessions, clinical_chat_messages, clinical_chat_analytics)
  - 4 API endpoints: POST /api/clinical-chat/message (public), GET sessions, GET session messages, GET stats (admin)
  - Frontend ChatPage: simulator, session history, analytics stats
  - Smoke tests 19/19 PASS en produccion
  - Worker version: 95288ac5-f01e-455e-870c-9ba3309695f2

## Pendiente
- **FASE 12** — Portal clinico: pacientes, expedientes, documentos, consentimientos, notas clinicas
- Configurar `wrangler secret put GEMINI_API_KEY` para activar Gemini real (actualmente template fallback)

## Archivos clave
- `TASK_QUEUE.md` — roadmap con prioridades
- `SESSION_HANDOFF.md` — este archivo
- `FASE_11_7_MARKETING_AI_REPORT.md` — reporte Marketing AI
- `FASE_11_8_DEPLOY_REPORT.md` — reporte Chat IA Clinico

## Credenciales de acceso
- Admin: `admin@clinica.com` / `Admin123!`
- Worker URL: `https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev`

## Arquitectura AI (Marketing + Chat IA)
```
Marketing: Admin → Marketing AI Service → Prompt → Gemini API → Validator → Score → Audit D1 → Aprobar → Publicar
Chat IA:   Paciente → Clinical Chat → Knowledge Base + Gemini → Safety Validator → Response + D1 Persistence
```

## FASE 11.8 — Archivos creados/modificados
- `worker/src/ai/knowledge/clinical.ts` — Knowledge base (11 entries)
- `worker/src/ai/services/chat-ai.ts` — Chat AI service
- `worker/src/domains/clinical-chat/routes.ts` — 4 API endpoints
- `worker/migrations/0027_clinical_chat.sql` — D1 migration
- `worker/scripts/smoke-test-clinical-chat.js` — 19 smoke tests
- `worker/scripts/deploy-production.ps1` — Updated (migration 0027 + Stage 9)
- `worker/scripts/check-remote-migrations.js` — Updated (clinical_chat tables)
- `worker/src/index.ts` — Wired clinical-chat routes
- `src/pages/admin/ChatPage.tsx` — Frontend ChatPage
- `src/lib/api/chat.ts` — API client
- `src/admin/AdminLayout.tsx` — Chat IA nav item
- `src/App.tsx` — /admin/chat route
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
