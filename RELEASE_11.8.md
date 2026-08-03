# RELEASE_11.8 — FASE 11.8 Chat IA Clinico

## Metadata
- **Version**: v11.8
- **Git commit**: 2d15b79d5ee520566538cd117b786a2d4681f9c4
- **Git tag**: v11.8
- **Worker**: clinica-psicologia-tms@1.0.0
- **Worker version**: 95288ac5-f01e-455e-870c-9ba3309695f2
- **Date**: 2026-08-03
- **Status**: PRODUCTION READY

## Migrations applied
| Migration | Tables | Status |
|-----------|--------|--------|
| 0020_leads.sql | leads | APPLIED |
| 0021_leads_audit.sql | lead_audit | APPLIED |
| 0023_crm_enhancement.sql | leads (email, lead_notes) | APPLIED |
| 0024_appointments_completion.sql | appointments (lead_id, type, deleted_at), availability | APPLIED |
| 0025_automation.sql | automation_rules, automation_queue, automation_history, automation_audit | APPLIED |
| 0026_marketing_ai.sql | marketing_content, marketing_campaigns, seo_analysis, ai_audit_logs | APPLIED |
| 0027_clinical_chat.sql | clinical_chat_sessions, clinical_chat_messages, clinical_chat_analytics | APPLIED |

**Total tables**: 67 in D1 production

## Smoke tests executed
| Suite | Tests | Status |
|-------|-------|--------|
| smoke-test-leads.js | 8/8 | PASS |
| smoke-test-appointments.js | 9/9 | PASS |
| smoke-test-marketing-ai.js | 25/25 | PASS |
| smoke-test-clinical-chat.js | 19/19 | PASS |
| **TOTAL** | **61/61** | **PASS** |

## Endpoints available (FASE 11.8)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/clinical-chat/message | PUBLIC | Send chat message, get AI response |
| GET | /api/clinical-chat/sessions | Admin | List all chat sessions |
| GET | /api/clinical-chat/sessions/:id/messages | Admin | Get messages for a session |
| GET | /api/clinical-chat/stats | Admin | Chat analytics and statistics |

## Endpoints available (FASE 11.7 Marketing AI)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/marketing/overview | Admin | Marketing KPIs |
| POST | /api/marketing/content/generate | Admin | Generate AI content |
| GET | /api/marketing/content | Admin | List generated content |
| PATCH | /api/marketing/content/:id/status | Admin | Approve/reject content |
| POST | /api/marketing/campaign/generate | Admin | Generate AI campaign |
| POST | /api/marketing/seo/generate | Admin | Generate SEO analysis |

## All production endpoints (cumulative FASE 1-11.8)
| Domain | Endpoints | Status |
|--------|-----------|--------|
| Auth | 5 (register, login, refresh, logout, me) | LIVE |
| Patients | 5 (CRUD) | LIVE |
| Therapists | 5 (CRUD) | LIVE |
| Appointments | 5 (CRUD) | LIVE |
| Reminders | 2 (list, generate) | LIVE |
| Notifications | 2 (list, log) | LIVE |
| Templates | 4 (CRUD) | LIVE |
| Reception | 3 (queue CRUD) | LIVE |
| Alerts | 6 (CRUD, summary, read-all) | LIVE |
| Leads | 8 (CRUD, estado, notes, stats) | LIVE |
| Automation | 1 (events) | LIVE |
| Marketing AI | 6 (overview, content CRUD, campaign, seo) | LIVE |
| Clinical Chat | 4 (message, sessions, messages, stats) | LIVE |
| Dashboard | 1 (overview) | LIVE |
| Treatments | 5 (CRUD) | LIVE |
| Clinical Notes | 4 (CRUD) | LIVE |
| Clinical Records | 5 (CRUD) | LIVE |
| Session Notes (SOAP) | 5 (CRUD) | LIVE |
| Consents | 3 (list, get, create) | LIVE |
| Timeline | 3 (clinic, patient, create) | LIVE |
| Sessions | 3 (complete, get, update) | LIVE |
| TMS Protocols | 6 (CRUD, suggest, deactivate) | LIVE |
| Motor Thresholds | 4 (list, patient, record, delete) | LIVE |
| TMS Profiles | 7 (list, patient, get, create, activate, complete, discontinue) | LIVE |
| TMS Sessions | 4 (create, complete, get, update) | LIVE |
| Clinical Response | 4 (record, curve, patient, session) | LIVE |
| Adverse Effects | 4 (record, stats, patient, resolve) | LIVE |
| TMS Engine | 5 (dashboard, efficiency, patient, analyze, adjust) | LIVE |
| Assessments | 3 (create, by-patient, by-type) | LIVE |
| Digital Twin | 4 (predict, patient, history, confidence) | LIVE |
| Simulation | 5 (simulate, compare, history, dashboard, brain) | LIVE |
| Reports | 4 (generate, treatment, export, history) | LIVE |
| Patient Journey | 6 (reception, therapist, start, complete, patient, discharge) | LIVE |
| COS-L | 5 (today, next-action, patient-states, tasks, alerts) | LIVE |
| Quality Metrics | 6 (list, get, create, delete, summary, dashboard) | LIVE |
| Security Incidents | 5 (list, get, create, resolve, delete) | LIVE |
| Documents | 6 (list, get, create, sign, archive, supersede) | LIVE |
| Backups | 7 (run, latest, list, restore, restore-latest, restore-date, verify, fire-drill, restores) | LIVE |
| Observability | 6 (dashboard, events, metrics, health-history, alerts, export) | LIVE |
| Performance | 6 (dashboard, slow-queries, query-profiles, cache, worker, anomalies) | LIVE |
| Cron Manager | 8 (dashboard, jobs, create, update, delete, run, executions, failures) | LIVE |
| Security | 12 (events, dashboard, block/unblock IP, sessions, revoke, trust, rotate, document-integrity) | LIVE |
| Compliance | 5 (dashboard, alerts, run, report-json, report-csv) | LIVE |
| **TOTAL** | **~170 endpoints** | **LIVE** |

## Frontend pages
| Page | Route | Status |
|------|-------|--------|
| Home | / | LIVE |
| Login | /login | LIVE |
| Register | /register | LIVE |
| Dashboard | /app/dashboard | LIVE |
| Agenda | /app/agenda | LIVE |
| Patients | /app/patients | LIVE |
| Patient Detail | /app/patients/:id | LIVE |
| Treatments | /app/treatments | LIVE |
| TMS Module | /app/tms | LIVE |
| Simulator | /app/simulator | LIVE |
| Digital Twin | /app/twin | LIVE |
| Brain Viewer | /app/brain | LIVE |
| Reports | /app/reports | LIVE |
| Settings | /app/settings | LIVE |
| Admin Dashboard | /admin | LIVE |
| Admin Leads | /admin/leads | LIVE |
| Admin Marketing | /admin/marketing | LIVE |
| Admin Chat IA | /admin/chat | LIVE |
| Visual Brain | /visual/brain | LIVE |
| Visual TMS | /visual/tms | LIVE |
| Visual Twin | /visual/twin | LIVE |
| Visual Hospital | /visual/hospital | LIVE |
| Visual Kiosk | /visual/kiosk | LIVE |
| Public Chat | /chat | LIVE |
| Public Blog | /blog | LIVE |
| Public Contact | /contacto | LIVE |
| Public Services | /servicios | LIVE |
| Public FAQ | /faq | LIVE |
| Public Privacy | /privacidad | LIVE |
| Public Terms | /terminos | LIVE |
| Public About | /nosotros | LIVE |

## Environment variables required
| Variable | Location | Required | Description |
|----------|----------|----------|-------------|
| GEMINI_API_KEY | Cloudflare Secrets | Optional | Google Gemini API key. Without it, services use template fallback. |
| JWT_SECRET | Cloudflare Secrets | Yes | Auth token signing secret |
| ALLOWED_ORIGINS | wrangler.toml | Yes | Comma-separated allowed origins |

## Clinical safety features
- Emergency detection: suicide/self-harm keywords → auto-transfer to Linea de la Vida (800 911 2000)
- Blocked terms: 13 prohibited clinical claims (cura, garantizado, 100%, etc.)
- Warning terms: 13 monitored claims (mejora, beneficio, efectivo, etc.)
- Disclaimer: "valoracion profesional" required in all clinical content
- Dual-tier validation: BLOCKED (score 0) + WARNING (score penalty)
- No real patient data sent to AI (only anonymized context)
- Human approval required before publishing (PENDING_REVIEW → APPROVED → PUBLISHED)

## FASE 11.8 files created/modified
- `worker/src/ai/knowledge/clinical.ts` — Knowledge base (11 entries)
- `worker/src/ai/services/chat-ai.ts` — Chat AI service
- `worker/src/domains/clinical-chat/routes.ts` — 4 API endpoints
- `worker/migrations/0027_clinical_chat.sql` — D1 migration
- `worker/scripts/smoke-test-clinical-chat.js` — 19 smoke tests
- `worker/scripts/deploy-production.ps1` — Updated (Stage 9)
- `worker/scripts/check-remote-migrations.js` — Updated
- `worker/src/index.ts` — Wired routes
- `src/pages/admin/ChatPage.tsx` — Frontend
- `src/lib/api/chat.ts` — API client
- `src/admin/AdminLayout.tsx` — Nav item
- `src/App.tsx` — Route

## Next phase
**FASE 12** — Portal clinico: pacientes, expedientes, documentos, consentimientos, notas clinicas, seguimientos.
