# CLINICA TMS — Architecture Guide

## 1. Visión General

Clinica TMS es una plataforma de gestión clínica para neuromodulación TMS que opera como un **Cloudflare Worker** con **D1** como base de datos relacional y **Cloudflare Pages** como frontend.

### Objetivo
Sistema de gestión clínica automatizado con trazabilidad completa, compliance normativo (NOM-004/COFEPRIS/ISO 9001/ISO 27001), alertas automáticas, dashboard ejecutivo y recuperación ante fallos.

### Arquitectura
```
React (Cloudflare Pages)  →  Cloudflare Worker  →  D1 Database
       │                         │
       │                         ├── R2 (backups, documents)
       │                         ├── KV (cache)
       │                         ├── Logs (Cloudflare)
       │                         └── CI/CD (GitHub Actions)
       │
       └── JWT Authentication ──→ RBAC ──→ Endpoints
```

### Principios de Diseño
1. **Repository Pattern**: toda acceso a datos pasa por un Repository.
2. **Service Layer**: la lógica de negocio live en Services, nunca en Routes.
3. **Separation of Concerns**: auth, clinical, compliance, documents son módulos independientes.
4. **Audit Trail**: cada operación relevante se registra en `audit_logs`.
5. **Correlation IDs**: cada petición genera un CID que agrupa todos los eventos relacionados.
6. **TypeScript strict**: cero errores TS en producción.
7. **Health Monitor**: 8 niveles de verificación de subsistemas.

## 2. Diagrama de Arquitectura

```text
┌──────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                      │
│  (React SPA — Frontend estático)                         │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────────────────┐
│              Cloudflare Worker (API)                      │
│                                                          │
│  ┌─────────┐  ┌──────────┐  ┌──────────────┐           │
│  │  Auth   │  │   RBAC   │  │ CORS + Rate  │           │
│  │  JWT    │  │  Permission  │  │  Limit      │           │
│  └────┬────┘  └─────┬─────┘  └──────┬───────┘           │
│       │              │               │                    │
│       ▼              ▼               ▼                    │
│  ┌─────────────────────────────────────────────┐          │
│  │           Route Dispatcher                   │          │
│  │  /api/health, /api/auth/*, /api/patients/*,  │          │
│  │  /api/compliance/*, /api/documents/*, ...    │          │
│  └──────────────────┬──────────────────────────┘          │
│                     │                                      │
│       ┌─────────────┼─────────────┐                       │
│       ▼             ▼             ▼                       │
│  ┌────────┐  ┌───────────┐  ┌────────────┐               │
│  │Clinical│  │ Compliance│  │ Documents  │               │
│  │Service │  │  Engine   │  │ Management │               │
│  └────┬───┘  └─────┬─────┘  └─────┬──────┘               │
│       │            │              │                       │
│       ▼            ▼              ▼                       │
│  ┌─────────────────────────────────────────────┐          │
│  │              Repository Layer                │          │
│  │  (CRUD operations, queries, D1 access)       │          │
│  └──────────────────────┬──────────────────────┘          │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────┐          │
│  │              D1 Database (SQLite)            │          │
│  │  41 tables: patients, clinical_records,     │          │
│  │  compliance_alerts, audit_logs, etc.        │          │
│  └─────────────────────────────────────────────┘          │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │ Cron Jobs  │  │  Health Mon. │  │ Performance   │   │
│  │ 0 */1 * * *│  │  GET /health│  │ Slow request  │   │
│  │ 0 2 * * *  │  │  8 levels   │  │ logging       │   │
│  │ 0 3 * * *  │  │              │  │               │   │
│  └────────────┘  └──────────────┘  └───────────────┘   │
└──────────────────────────────────────────────────────────┘
```

## 3. Estructura del Proyecto

```text
worker/
├── src/
│   ├── index.ts                    # Entry point, route dispatcher, scheduled handlers
│   ├── types.ts                    # Shared types (Env, User, Patient, etc.)
│   ├── lib/
│   │   ├── auth.ts                 # JWT creation/verification, base64url
│   │   ├── cors.ts                 # CORS configuration
│   │   ├── rate-limit.ts           # Rate limiting by IP + endpoint
│   │   ├── audit.ts                # logAudit() helper
│   │   ├── whatsapp.ts             # WhatsApp URL + template rendering
│   │   ├── rbac.ts                 # Permission types + hasPermission()
│   │   └── transaction.ts          # D1 batch transaction helper
│   ├── middleware/
│   │   ├── authenticate.ts         # JWT authentication middleware
│   │   └── require-role.ts         # RBAC authorization middleware
│   ├── routes/
│   │   └── compliance.ts           # Compliance dashboard, reports, alerts
│   ├── domains/
│   │   ├── auth/
│   │   │   ├── routes.ts           # register, login, refresh, logout
│   │   │   └── validators.ts       # LoginInput, RegisterInput
│   │   ├── patients/
│   │   │   ├── routes.ts           # CRUD patients
│   │   │   └── validators.ts
│   │   ├── therapists/
│   │   │   ├── routes.ts           # CRUD therapists
│   │   │   └── validators.ts
│   │   ├── appointments/
│   │   │   ├── routes.ts
│   │   │   └── validators.ts
│   │   ├── clinical-records/
│   │   │   ├── routes.ts           # Expediente clínico
│   │   │   └── validators.ts
│   │   ├── session-notes/
│   │   │   ├── routes.ts           # SOAP notes
│   │   │   └── validators.ts
│   │   ├── consents/
│   │   │   ├── routes.ts
│   │   │   └── validators.ts
│   │   ├── documents/
│   │   │   ├── routes.ts           # Document lifecycle
│   │   │   ├── repository.ts       # DocumentRepository
│   │   │   ├── service.ts          # DocumentService
│   │   │   └── types.ts
│   │   ├── backups/
│   │   │   ├── routes.ts
│   │   │   ├── repository.ts        # BackupRepository
│   │   │   ├── service.ts          # BackupService (export, hash, R2)
│   │   │   └── types.ts
│   │   ├── compliance/
│   │   │   ├── types.ts            # ComplianceRule, ComplianceAlert, etc.
│   │   │   ├── repository/
│   │   │   │   └── compliance-repository.ts  # ComplianceRepository
│   │   │   ├── service.ts           # ComplianceService
│   │   │   ├── audit.ts             # logComplianceEvent
│   │   │   ├── automation.ts        # executeAllRules, triggerCompliance
│   │   │   ├── engine/
│   │   │   │   └── rule-executor.ts # Rule engine with CHECK_EXISTS, CHECK_DATE, etc.
│   │   │   ├── alerts/
│   │   │   │   └── alert-manager.ts # Alert creation, dedup, resolution
│   │   │   ├── dashboard/
│   │   │   │   ├── metrics.ts      # calculateDashboardMetrics
│   │   │   │   └── types.ts
│   │   │   └── reports/
│   │   │       └── report-generator.ts
│   │   ├── health/
│   │   │   ├── routes.ts           # GET /api/health (8-level check)
│   │   │   ├── service.ts          # HealthService
│   │   │   ├── repository.ts       # HealthRepository interface
│   │   │   └── types.ts            # HealthCheckResult, HealthSummary
│   │   ├── quality-metrics/
│   │   │   ├── routes.ts
│   │   │   ├── repository.ts
│   │   │   └── service.ts
│   │   ├── reminders/
│   │   │   ├── routes.ts
│   │   │   ├── service.ts
│   │   │   └── lib/
│   │   │       └── whatsapp.ts
│   │   ├── reception/
│   │   │   ├── routes.ts
│   │   │   └── repository.ts
│   │   ├── reports/
│   │   │   ├── routes.ts
│   │   │   └── service.ts
│   │   ├── tms-engine/
│   │   │   └── routes.ts
│   │   ├── tms-sessions/
│   │   │   └── routes.ts
│   │   ├── tms-profiles/
│   │   │   └── routes.ts
│   │   ├── tms-protocols/
│   │   │   └── routes.ts
│   │   ├── motor-thresholds/
│   │   │   └── routes.ts
│   │   ├── clinical-response/
│   │   │   └── routes.ts
│   │   ├── adverse-effects/
│   │   │   └── routes.ts
│   │   ├── clinical-assessments/
│   │   │   └── routes.ts
│   │   ├── notifications/
│   │   │   └── routes.ts
│   │   ├── templates/
│   │   │   └── routes.ts
│   │   ├── timeline/
│   │   │   └── routes.ts
│   │   ├── security-incidents/
│   │   │   └── routes.ts
│   │   ├── digital-twin/
│   │   │   └── routes.ts
│   │   ├── simulation/
│   │   │   └── routes.ts
│   │   ├── patient-journey/
│   │   │   └── routes.ts
│   │   ├── cos/
│   │   │   └── routes.ts
│   │   ├── tms-alert-rules/
│   │   │   └── routes.ts
│   │   ├── tms-engine-rules/
│   │   │   └── routes.ts
│   │   └── ...
│   └── health/
│       ├── types.ts
│       ├── repository.ts
│       ├── service.ts
│       └── routes.ts
├── migrations/
│   ├── 0008_compliance.sql
│   ├── 0009_rule_versioning.sql
│   ├── 0010_audit_trail.sql
│   ├── 0011_document_management.sql
│   ├── 0012_backup_runs.sql
│   └── 0013_performance_indexes.sql
├── schema.sql                      # Full database schema
├── seed.sql                        # Initial data (compliance rules, etc.)
├── wrangler.toml                   # Worker configuration
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── deploy.ps1                      # Legacy deploy script
├── scripts/
│   ├── check-env.js                # Pre-deploy: validate environment
│   ├── check-db.js                 # Pre-deploy: validate database
│   ├── security-check.js           # Pre-deploy: security validation
│   ├── compliance-check.js         # Pre-deploy: compliance validation
│   ├── migration-check.js          # Pre-deploy: migration sync check
│   └── pipeline.ps1                # Full 11-stage deploy pipeline
├── test/
│   ├── compliance.test.ts          # 24 compliance + score tests
│   ├── backup.test.ts              # 11 backup + key gen tests
│   ├── document.test.ts            # 11 document lifecycle + transition tests
│   ├── auth.test.ts                # 10 auth tests
│   └── rbac.test.ts                # 6 RBAC tests (3 pre-existing failures)
└── architecture/                   # This directory
```

## 4. Flujo de una Petición

### 4.1 Request Cycle

```text
HTTP Request (GET /api/patients/42)
        │
        ▼
┌─────────────────────────────────┐
│  1. CORS Validation             │  → Origin check
│  2. Rate Limiting               │  → 5 reqs/15min per IP+endpoint
│  3. OPTIONS preflight           │  → 204 No Content
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  4. Authentication              │  → JWT via Authorization header
│     authenticate(env, request)  │  → Returns User or null
│     requireAuth(user)           │  → 401 if missing/invalid
│     requireRole(user)           │  → 403 if insufficient permissions
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  5. Route Dispatcher            │  → Matches path + method
│     e.g., GET /api/patients/\d+│  → handleGetPatient()
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  6. Service Layer               │  → Business logic
│     PatientService.getPatient() │  → Validates, transforms
│                                 │  → Calls Repository
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  7. Repository Layer            │  → Data access
│     PatientRepository.findById()│  → D1 queries
│                                 │  → Returns plain objects
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  8. D1 Database                 │  → SQLite via Cloudflare D1
│     SELECT * FROM patients      │  → Uses covering indexes
│     WHERE id = ?                │  → SEARCH (not SCAN)
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  9. Audit Trail (async)         │  → logAudit() records operation
│     module: 'patients'          │  → action: 'read'
│     entity: 'patients'          │  → correlation_id links trace
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 10. Compliance Hook (async)     │  → executeAllRules() for patient
│     NOM + COFEPRIS + ISO rules │  → Creates alerts if violations
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 11. Response                    │  → JSON with requestId
│     { success: true, data: {...}}│  → CORS headers set
└─────────────────────────────────┘
```

### 4.2 Multi-Step Transaction Example (Document Sign)

```text
PUT /api/documents/42/sign
        │
        ▼
┌─────────────────────────────────┐
│  authenticate() → User          │
│  requireAuth() → Passed         │
│  requireRole() → Therapist/Admin│
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  DocumentService.signDocument() │
│                                 │
│  BEGIN TRANSACTION              │
│  ├─ 1. SELECT existing doc     │
│  ├─ 2. UPDATE status → SIGNED  │
│  ├─ 3. INSERT audit_logs       │
│  └─ 4. COMMIT                  │
│                                 │
│  If any step fails → ROLLBACK  │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  Response: { success: true }   │
│  Audit: doc-sign-42            │
│  Correlation ID links all      │
│  events for this operation     │
└─────────────────────────────────┘
```

## 5. Base de Datos

### 5.1 Estadísticas

| Métrica | Valor |
|---------|-------|
| Tablas | 41 |
| Migraciones | 13 |
| Índices | ~85 |
| Cumplimiento con schema.sql | Sí |

### 5.2 Tablas Principales

| Tabla | Propósito |
|-------|-----------|
| `users` | Autenticación + RBAC |
| `patients` | Registro de pacientes |
| `therapists` | Terapeutas |
| `appointments` | Citas médicas |
| `clinical_records` | Expediente clínico digital |
| `session_notes` | Notas SOAP |
| `consents` | Consentimientos informados |
| `documents` | Gestión documental (lifecycle) |
| `compliance_rules` | Reglas de cumplimiento normativo |
| `compliance_alerts` | Alertas generadas por reglas |
| `compliance_runs` | Historial de ejecución de compliance |
| `backup_runs` | Historial de backups |
| `audit_logs` | Trazabilidad completa (auditoría) |
| `quality_metrics` | KPIs clínicos |
| `reminders_queue` | Cola de recordatorios |
| `reception_queue` | Cola de recepción |
| `tms_protocols` | Protocolos TMS |
| `tms_sessions` | Sesiones de neuromodulación |
| `tms_patient_profiles` | Perfiles de paciente para TMS |
| `motor_thresholds` | Umbrales motores por paciente |
| `adverse_effects` | Seguimiento de efectos adversos |
| `patient_timeline_events` | Línea de tiempo clínica |
| `stimulation_parameters` | Parámetros de estimulación |
| `twin_predictions` | Predicciones del digital twin |
| `simulation_comparisons` | Comparaciones de protocolos |
| ... | (ver schema.sql para lista completa) |

### 5.3 Convenciones de Índices

```text
Formato: idx_{table}_{columns}
Ejemplo: idx_compliance_alerts_status_severity
```

Índices cubiertos (covering indexes) para consultas frecuentes:
- `audit_logs(module, action)`, `audit_logs(correlation_id)`, `audit_logs(request_id)`
- `compliance_alerts(status, severity)`, `compliance_alerts(status, category, severity)`
- `documents(status)`, `documents(patient_id, document_type)`
- `session_notes(patient_id, session_date)`
- `clinical_records(patient_id)`
- `backup_runs(status, created_at)`
- `appointments(patient_id, date)`, `appointments(clinic_id, date)`
- `tms_patient_profiles(patient_id)`, `tms_sessions(profile_id)`

Migraciones: `migrations/` + `schema.sql`

## 6. Seguridad

### 6.1 Autenticación (JWT)

| Componente | Detalle |
|------------|---------|
| Algoritmo | HS256 |
| Access Token | Expira en tiempo corto |
| Refresh Token | Almacenado en DB + cookie |
| Secret | `JWT_SECRET` (Cloudflare Secret) |
| Refresh Secret | `REFRESH_SECRET` (Cloudflare Secret) |

### 6.2 Autorización (RBAC)

Roles: `admin` | `therapist` | `reception` | `patient`

Permissions: 30+ permisos granularizados:
- `patients:read`, `patients:write`, `patients:delete`
- `therapists:read`, `therapists:write`, `therapists:delete`
- `appointments:read`, `appointments:write`, `appointments:delete`
- `clinical_notes:read`, `clinical_notes:write`, `clinical_notes:delete`
- `sessions:read`, `sessions:write`
- `templates:read`, `templates:write`, `templates:delete`
- `treatments:read`, `treatments:write`, `treatments:delete`
- `timeline:read`, `timeline:write`
- `cos:read`
- `admin:access`
- (más 15 permisos adicionales)

### 6.3 Rate Limiting

- 5 intentos por 15 minutos por IP + endpoint
- Reset vía `DELETE FROM rate_limits`
- Headers de respuesta: `X-RateLimit-Remaining`

### 6.4 Headers de Seguridad

| Header | Valor |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` |

### 6.5 CORS

Orígenes permitidos configurables via `ALLOWED_ORIGINS`:
- `http://localhost:5173` (dev)
- `https://neurocienciaclinica.mx` (producción)
- `https://clinica-tms-api.terapiamagneticatranscraneal.workers.dev`

### 6.6 Auditoría

Cada operación relevante se registra en `audit_logs`:
- `module`: el dominio ('patients', 'documents', 'compliance', etc.)
- `action`: la operación ('create', 'update', 'delete', 'sign', etc.)
- `entity`: la tabla afectada
- `before_data` / `after_data`: diff de cambios
- `ip`: IP del cliente
- `result`: `SUCCESS`/`FAILURE`/`WARNING`
- `correlation_id`: enlaza todos los eventos de una operación compuesta

### 6.7 Secrets

Gestionados via Cloudflare Secrets:
- `JWT_SECRET`
- `REFRESH_SECRET`
- Verificados en pre-deploy por `check:env`

## 7. Compliance Engine

### 7.1 Motor de Reglas

El compliance engine ejecuta automáticamente reglas normativas contra datos de pacientes.

**Check Types soportados:**
- `CHECK_EXISTS` — Verifica que exista un registro
- `CHECK_DATE` — Verifica fecha dentro de rango
- `CHECK_BOOL` — Verifica campo booleano
- `CHECK_REQUIRED` — Verifica campo no vacío
- `CHECK_MIN` — Verifica valor mínimo
- `CHECK_MAX` — Verifica valor máximo
- `CHECK_EQUALS` — Verifica igualdad
- `CHECK_NOT_EMPTY` — Verifica array no vacío

### 7.2 Reglas por Normativa

| Normativa | Categoría | Ejemplos de Reglas |
|-----------|-----------|-------------------|
| NOM-004 | NOM | Consentimiento informado, expediente completo, notas SOAP completas |
| COFEPRIS | COFEPRIS | Aviso de privacidad firmado, consentimiento de datos |
| ISO 9001 | ISO9001 | Métricas de calidad, planes de tratamiento definidos |
| ISO 27001 | ISO27001 | Auditoría activa, controles de acceso, revisión de seguridad |

Configuración: `effective_from`, `effective_to`, `version`, `enabled`
Actualmente: **18 reglas v1.0** todas habilitadas

### 7.3 Alertas

```text
Regla evaluada → PASSED: si existe alerta OPEN matching → CLOSE alert
Regla evaluada → FAILED: si no existe alerta OPEN matching → CREATE alert (severity según regla)
```

Severities: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`
Statuses: `OPEN` | `REVIEWED` | `RESOLVED`

Dedup: busca `rule_code + patient_id + status=OPEN` antes de crear nueva alerta.

### 7.4 Score Calculation

```
score = max(0, 100 - (critical * 30) - (high * 15) - (open * 5))
```

- 0 alertas → 100
- 1 CRITICAL → 70
- 1 HIGH → 85
- 3 OPEN → 85

### 7.5 Dashboard per-Norma

El dashboard muestra:
- Score general
- Score por normativa (NOM, COFEPRIS, ISO 9001, ISO 27001)
- Alertas abiertas por severidad
- Métricas operativas (crónes exitosos, pacientes pendientes, próximos a vencer)

### 7.6 Cron Jobs

| Cron | Frecuencia | Función |
|------|-----------|---------|
| `0 * * * *` | Cada hora | Recordatorios de citas |
| `0 2 * * *` | Diario 02:00 | Evaluación de compliance completa (todos los pacientes) |
| `0 3 * * *` | Diario 03:00 | Backup automático de base de datos |

## 8. Document Management

### Lifecycle

```text
DRAFT ← CREATED
  │
  ▼
GENERATED ← TEMPLATE RENDERED
  │
  ▼
SIGNED ← SIGNATURE CAPTURED
  │
  ▼
SUPERSEDED ← NEW VERSION CREATED (previous → SUPERSEDED)
  │
  ▼
ARCHIVED ← FINAL STATE
```

### Document Types

CONSENTIMIENTO_INFORMADO, AVISO_PRIVACIDAD, EXPEDIENTE, NOTA_CLINICA, EVALUACION, PLAN_TRATAMIENTO, FORMATO_ADMISION, RECETA, REFERENCIA, CONTRATO.

### Storage

- **Sin R2**: metadatos en DB (hash, filename, storage_key como placeholder)
- **Con R2**: archivo subido a bucket `clinica-tms-backups` (bucket debe habilitarse vía Cloudflare Dashboard)
- SHA-256 hash verificado contra backup_runs para integridad

## 9. Automatizaciones

| Proceso | Trigger | Descripción |
|---------|---------|-------------|
| Recordatorios | Cron `0 * * * *` | Genera notificaciones para citas próximas |
| Compliance Eval | Cron `0 2 * * *` | Ejecuta todas las reglas para todos los pacientes |
| Backup | Cron `0 3 * * *` | Exporta D1, calcula SHA-256, registra backup_run |
| Alert Auto-Resolve | Compliance cron | Cierra alertas cuya regla vuelve a pasar |
| Audit Logging | Todas las operaciones | Registra cada acción relevante |
| Correlation IDs | Pipeline de compliance | Agrupa ALERT_CREATED → RULE_PASSED → ALERT_RESOLVED → COMPLIANCE_RUN |
| Health Monitor | `/api/health` | Verifica 8 subsistemas en tiempo real |
| Slow Request Log | `withCors()` middleware | Registra peticiones >500ms |

## 10. Health Monitor

El endpoint `GET /api/health` implementa 8 niveles:

| Nivel | Subsistema | Verifica |
|-------|-----------|----------|
| 1 | API | Worker responde |
| 2 | Database | D1 conectado, latencia medida |
| 3 | Security | JWT_SECRET, REFRESH_SECRET, ALLOWED_ORIGINS configurados |
| 4 | Compliance | Reglas cargadas, alertas funcionando, cron ejecutándose |
| 5 | Clinical | clinical_records, session_notes, consents accesibles |
| 6 | Documents | Tabla documents accesible |
| 7 | Backups | backup_runs accesible, último backup registrado |
| 8 | Cloudflare | D1 disponible, R2 configurado (o metadata-only) |

Respuesta:
- `HEALTHY`: todos los subsistemas OK
- `DEGRADED`: algún subsistema en warning (R2 no configurado, etc.)
- `UNHEALTHY`: algún subsistema en error (BD caída, etc.)

## 11. Pipeline de Despliegue

### Local (pipeline.ps1)

1. TypeScript Typecheck (`tsc --noEmit`)
2. Environment Validation (`check:env.js`)
3. Database Validation (`check:db.js`)
4. Unit Tests (`vitest run`)
5. Security Check (`security-check.js`)
6. Compliance Check (`compliance-check.js`)
7. Migration Validation (`migration-check.js`)
8. Build Dry-Run (`wrangler deploy --dry-run`)
9. Deploy (`wrangler deploy`)
10. Smoke Test (health + auth + dashboard + backups)
11. Release Tag (git tag + push)

### CI/CD (.github/workflows/deploy.yml)

- Dispara en push a `main`/`master` o `workflow_dispatch`
- Cache de npm
- 11 etapas con reporte en PR summary
- Tags automáticos con timestamp
- Despliegue solo en branches principales
- Smoke test post-deploy

### Gates
```
TypeScript ──→ ✅ ──→ Tests ──→ ✅ ──→ Security ──→ ✅ ──→ Compliance ──→ ✅ ──→ Deploy
```
Cualquier stage fallido bloquea el despliegue.

## 12. Observabilidad

### 12.1 Logs
- **Console**: logs estructurados con `[requestId]` y `[module]: [message]` format
- **Audit**: cada operación relevante persistida en `audit_logs`
- **Slow Requests**: peticiones >500ms generan log de warning
- **Cloudflare Logs**: captura automática de salida console

### 12.2 Auditoría
- `audit_logs` tabla con: before_data, after_data, old_value, new_value, ip, user_agent, request_id, session_id, correlation_id, result
- Correlation IDs agrupan eventos de un pipeline completo
- Cada operación en Services llama `logAudit()` para trazabilidad

### 12.3 Performance
- Middleware `withCors()` mide latencia de cada handler
- Peticiones >500ms loggeadas como SLOW_REQUEST
- DB latency medida en /api/health response

### 12.4 Metrics (Dashboard)
- Endpoints: `/api/compliance/dashboard`
- Score per-norma (NOM, COFEPRIS, ISO 9001, ISO 27001)
- Métricas operativas (crónes, backups, alertas, pacientes pendientes)

### 12.5 Health Monitor
- Endpoint: `/api/health`
- 8 niveles de verificación
- Responde 200 (HEALTHY/DEGRADED) o 503 (UNHEALTHY)

## 13. Disaster Recovery (DR)

### 13.1 Objetivos RPO/RTO
| Métrica | Valor |
|---------|-------|
| **RPO (Recovery Point Objective)** | Máximo 24 horas de datos (backups diarios a las 03:00) |
| **RTO (Recovery Time Objective)** | Máximo 4 horas para restauración completa |
| **Backup Frequency** | Diaria (automática) + manual bajo demanda |
| **Integrity Check** | SHA-256 verificado en cada backup y cada restore |
| **Fire Drill** | Simulación mensual de restauración completa (rollback automático) |

### 13.2 Estrategia de Backup
- **Automático**: `0 3 * * *` — exporta DB completa, calcula SHA-256, sube a R2
- **Verificación**: checksum se verifica post-Upload y pre-Restore
- **Retención**: últimos 20 backups completos listados en `backup_runs`
- **Metadatos**: si R2 no está habilitado, se almacenan metadatos (hash, tamaño, estado)

### 13.3 Restauración
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/backups/restore?id=<N>` | POST | Restaurar desde backup específico por ID |
| `/api/backups/restore/latest` | POST | Restaurar desde el último backup completado |
| `/api/backups/restore/by-date` | POST | Restaurar desde backup anterior a fecha dada |
| `/api/backups/verify?id=<N>` | POST | Verificar integridad SHA-256 de un backup |
| `/api/backups/fire-drill` | POST | Simular restauración completa (rollback automático) |
| `/api/backups/restores` | GET | Listar historial de restauraciones |

### 13.4 Proceso de Restauración
1. Download backup JSON de R2 (o fallback a metadata)
2. Verificar SHA-256 checksum — si falla, abortar inmediatamente
3. Parsear JSON y ejecutar `INSERT OR REPLACE` por tabla en batch atómico
4. Registrar intento de restauración en `restore_attempts` con auditoría
5. Reportar: tablas restauradas, filas restauradas, checksum verificado

### 13.5 Fire Drill (Simulación de Desastre)
1. Encontrar último backup completado más reciente
2. Descargar de R2 y verificar SHA-256
3. Contar tablas y filas en el backup
4. **NO persistir el restore** — verificar solo integridad
5. Registrar resultado en auditoría con notas: "Fire drill: data not persisted"
6. Si checksum falla → fallo inmediato, alerta al administrador

### 13.6 Monitoreo de DR
- **Health Monitor 8-level** incluye checks de backup y restore
- **Dashboard**: último backup, última restauración, DR readiness
- **Alertas automáticas**: backup fallido, checksum mismatch, restore fallido
- **Audit Trail**: toda operación de backup/restore/verify/fire-drill registrada

## 14. Versionado

### Migraciones

```text
Para agregar una nueva tabla o índice:

1. Crear archivo: migrations/NNNN_description.sql
   (NNNN: 4 dígitos consecutivos, NNNN > última migración)

2. Agregar definición a schema.sql

3. Ejecutar en remoto:
   npx wrangler d1 execute clinica-tms-db --remote --file="./migrations/NNNN_description.sql"
```

### Rollback

Para revertir una migración:
```sql
DROP INDEX IF EXISTS idx_nuevo;
DROP TABLE IF EXISTS nueva_tabla;
```

Crear una migración descendentiva en `migrations/`.

### Deploy

```bash
# Local
npm run pipeline

# CI (GitHub)
Push a main/automático

# Manual (production)
node node_modules/wrangler/wrangler-dist/cli.js deploy --env production
```

**Importante**: nunca desplegar con errores de TypeScript. El pipeline los bloquea.

## 15. Extender el Sistema

### Agregar un Nuevo Módulo

Estructura mínima:

```text
src/domains/tu-modulo/
├── types.ts          # Interfaces del módulo
├── repository.ts     # TuModuloRepository (CRUD + queries)
├── service.ts        # TuModuloService (lógica de negocio)
├── validators.ts     # Validadores de input
└── routes.ts         # Handlers HTTP (exportar cada handler)
```

Luego en `index.ts`:
```ts
// FASE N: TU MÓDULO
import { handleXxx } from './domains/tu-modulo/routes';
// ...
if (path === '/api/tu-modulo' && method === 'GET') return withCors(() => handleXxx(env, request, user!, corsHeaders, requestId), corsHeaders, requestId);
```

### Agregar una Nueva Regla de Compliance

1. Crear la regla en seed.sql:
```sql
INSERT INTO compliance_rules (id, code, name, category, severity, check_type, enabled, version)
VALUES ('XX-001', 'XX-001', 'Nombre descriptivo', 'COFEPRIS', 'MEDIUM', 'CHECK_EXISTS', 1, 'v1.0');
```

2. Crear el check handler en el engine (si es check_type nuevo):
   - `src/compliance/engine/checks/` con el nuevo tipo

3. La regla se ejecuta automáticamente en el cron `0 2 * * *`.

### Agregar una Nueva Tabla

1. Crear migración SQL en `migrations/`
2. Agregar CREATE TABLE a `schema.sql`
3. Crear Repository + Service + Routes en `src/domains/`
4. Agregar índices si hay queries frecuentes
5. Agregar al Health Monitor si es relevante

## 16. Roadmap

### ✅ Completado

- Autenticación JWT + RBAC
- Expediente clínico digital
- Notas SOAP
- Consentimientos
- Auditoría con correlation IDs
- Compliance Engine (NOM/COFEPRIS/ISO)
- Alertas automáticas
- Dashboard ejecutivo per-norma
- Document management (lifecycle)
- Backups automáticos (03:00 cron)
- Health Monitor (8 niveles)
- Performance indices (37 índices)
- Transaction batching (D1 batch)
- CI/CD pipeline completo (11 stages)
- TypeScript 0 errores
- Test suite (68/71 pass)
- **Disaster Recovery**: restore por ID/fecha, checksum verificación, fire drill, RPO/RTO documentado

### Plan Futuro

- Multi-clínica (tenants)
- Alta disponibilidad (multi-region)
- BI/Analytics dashboard
- IA clínica (predictive models)
- Firma electrónica avanzada
- Integración PAC/HCE
- Observabilidad avanzada (APM, tracing distribuido)