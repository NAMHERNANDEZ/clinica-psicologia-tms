# FASE 11.7 Marketing AI — Reporte de Implementacion

**Fecha:** 2026-08-03
**Estado:** COMPLETADA
**Deploy:** https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev

---

## Resumen Ejecutivo

FASE 11.7 implementa el sistema de Marketing AI para la clinica. Genera contenido de marketing clinico seguro usando plantillas estructuradas + Gemini API (cuando la API key esta configurada), con validador clinico dual-tier que bloquea promesas medicas y requiere revision humana antes de publicar.

## Stack Implementado

### Backend (Worker)
- **Provider Gemini** (`src/ai/providers/gemini.ts`) — Cliente real de Google Gemini API v1beta con rate limits, safety settings y fallback a template cuando no hay API key
- **Validador Clinico** (`src/ai/validators/clinical-validator.ts`) — Dual-tier: BLOCKED (13 terminos criticos) + WARNING (13 terminos). Score 0-100. Sin disclaimer de valoracion profesional resta 15 puntos.
- **Prompts Estructurados** (`src/ai/prompts/`) — Templates que restringen la IA a generar SOLO dentro del marco clinico definido
- **Content AI** (`src/ai/services/content-ai.ts`) — Genera posts blog/social/email/whatsapp con validacion
- **Campaign AI** (`src/ai/services/campaign-ai.ts`) — Genera campanas con audiencia, presupuesto, canales, copy, metricas
- **SEO AI** (`src/ai/services/seo-ai.ts`) — Analisis SEO: meta title, meta description, schema, outline, keywords
- **Routes** (`src/domains/marketing/routes.ts`) — 6 endpoints: overview, content/generate, content (list), content/:id/status, campaign/generate, seo/generate
- **Migration 0026** — 4 tablas: marketing_content, marketing_campaigns, seo_analysis, ai_audit_logs

### Frontend (React)
- **MarketingPage** (`src/pages/admin/MarketingPage.tsx`) — 4 tabs: Contenido IA, Campanas IA, SEO IA, KPIs
- **API Client** (`src/lib/api.ts`) — Funciones: marketing.overview, generateContent, generateCampaign, generateSeo, listContent, updateContentStatus
- **Admin Nav** — Link "Marketing AI" agregado al sidebar admin
- **Route** `/admin/marketing` conectada

### Seguridad Clinica
- Todos los endpoints requieren auth + role admin (RBAC)
- Nunca se envian datos de pacientes a la API de Gemini
- Validador bloquea: cura, garantizado, 100%, elimina, sin efectos secundarios
- Validador requiere: referencia a "valoracion profesional" o "evalua"
- Auditoria completa via ai_audit_logs (quien, cuando, que modelo, score)
- Aprobacion humana obligatoria antes de publicar (status: PENDING_REVIEW -> APPROVED -> PUBLISHED)

### Arquitectura de Seguridad

```
Admin -> Marketing AI Service -> Prompt Estructurado -> Gemini API -> Validador Clinico -> Score 0-100 -> Audit D1 -> Aprobacion Humana -> Publicacion
```

## Smoke Tests (25/25 PASS)

| Test | Resultado |
|------|-----------|
| Login admin | PASS |
| Content AI HTTP 200 | PASS |
| Content headline presente | PASS |
| Content body presente | PASS |
| Content sin terminos bloqueados | PASS |
| Content tiene CTA con valoracion | PASS |
| Content validation status valido | PASS |
| Content audit id asignado | PASS |
| Campaign AI HTTP 200 | PASS |
| Campaign summary presente | PASS |
| Campaign budget_allocation presente | PASS |
| Campaign budget suma correcto | PASS |
| Campaign validada | PASS |
| SEO AI HTTP 200 | PASS |
| SEO keyword presente | PASS |
| SEO meta_title presente | PASS |
| SEO meta_description presente | PASS |
| SEO content_outline presente | PASS |
| SEO source asignado | PASS |
| Marketing overview HTTP 200 | PASS |
| Overview data presente | PASS |
| Content list HTTP 200 | PASS |
| Content list es array | PASS |
| Item generado encontrado en historial | PASS |
| RBAC: rechaza no-auth | PASS |

## Correcciones Preexistentes (bloqueaban deploy)

Durante FASE 11.7 se corrigieron errores preexistentes que impedian el deploy del worker:

1. **automation/executor.ts** — Importaba `./service` inexistente. Se creo `service.ts` con `triggerAutomationEvent` y `triggerAutomationForReminder` usando el schema correcto de `logNotification` (6 args, no 7).
2. **automation/events.ts** — Importaba tipos `Lead`, `Appointment`, `Reminder` de repositorios que no los exportaban. Se definieron interfaces locales tipadas.
3. **dashboard/service.ts** — Importaba `createNotificationLog` desde `repository` en vez de `service`. Corregido + cast `Number()` para tipos unknown.
4. **reminders/service.ts** — Faltaba import de `createReminder` y `findPendingReminders` desde `./repository`. Corregido + cast de argumentos `unknown -> string|undefined`.
5. **analytics/service.ts** — Todas las queries SQL usaban columnas inexistentes (`lead_origen`, `utm_source`, `created_at`, `patient_id`). Reescrito contra el schema real (`origen`, `fecha_creacion`, `fecha`).

## Pendiente (post-FASE 11.7)

- [ ] `wrangler secret put GEMINI_API_KEY` — Configurar API key de Google Gemini en Cloudflare
- [ ] Evaluacion de contenido con Gemini real vs template puro
- [ ] Historial de campanas (marketing_campaigns no tiene endpoint LIST)
- [ ] Exportar contenido generado
