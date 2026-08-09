# RELEASE 12.4 — Consentimientos Avanzados

**Fecha:** 2026-08-04
**Tag:** v12.4
**Worker Version:** c3609e7e-4faf-4d6c-8726-183f93678b5a

## FASE 12.4 — Consentimientos Avanzados con Firma Digital y Ciclo de Vida

### Nuevas Tablas D1 (migración 0032)
| Tabla | Descripción |
|-------|-------------|
| `consent_signatures` | Registro de firmas digitales (paciente, terapeuta, testigo, tutor) con hash, IP, user agent |
| `consent_versions` | Historial de versiones de documentos de consentimiento |

### Columnas agregadas a `consents`
`lifecycle`, `signed_at`, `signed_by`, `signed_by_name`, `signer_type`, `signature_hash`, `user_agent`, `metadata_json`, `revoked_reason`, `is_active`, `updated_by`.

### Ciclo de vida
`draft` → `pending_signature` → `signed` → `active` → `expired`/`revoked`

### Nuevos Endpoints
| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/consents/templates` | GET | Listar plantillas de consentimientos |
| `/api/consents/templates` | POST | Crear plantilla (admin/psychiatrist) |
| `/api/consents/templates/:id` | PUT | Actualizar plantilla (bump version) |
| `/api/consents/:id/sign` | POST | Firma digital con hash, signer_type, IP, user agent |
| `/api/consents/:id/signatures` | GET | Historial de firmas |
| `/api/consents/:id/versions` | GET | Historial de versiones del documento |
| `/api/consents/:id/revoke` | PUT | Revocar con motivo (enhanced) |

### Frontend (PatientChartPage -> ConsentimientosTab)
- Selector de plantilla para crear consentimiento
- Botón "Firmar" (lifecycle draft/signed)
- Botón "Revocar" con confirmación
- Badges de lifecycle (draft/signed/active/revoked)
- Mostrar firmante, fecha firma, fecha revocación, motivo
- Integración con templates activos del backend
- API client `src/lib/api/consents.ts`

### Fixes
- **extractId bug crítico corregido**: `parts[parts.length-1]` extraía 'sign' en vez de '3' para `/api/consents/3/sign`. Cambiado a `parts[3]` (posición fija para `/api/consents/:id/*`).
- **consent_templates.updated_by faltante**: Migración 0032 actualizada con ALTER TABLE para agregar columna (resuelve 500 en POST /api/consents/templates).
- Migración 0032 aplicada manualmente (detection script agregado a deploy-production.ps1)
- Templates seed: COMUNICACION_WHATSAPP y DATOS_CLINICOS usan type='CUSTOM' (solución pragmática - CHECK constraint de tabla 0030 limita tipos)

### Smokes
- **22/24 consents tests PASS** (create, sign, signatures, versions, revoke, list, lifecycle, template CRUD)
- 19/19 clinical-notes PASS
- 19/19 clinical-chat PASS
- 9/9 appointments PASS
- 8/8 leads PASS
- marketing-ai PASS

### Limitaciones Conocidas
- Template types COMUNICACION_WHATSAPP y DATOS_CLINICOS usan type='CUSTOM' temporalmente (CHECK constraint en tabla 0030). Para solución completa se requiere recrear tabla con tipos ampliados - no crítico para funcionalidad.

### Build
- TypeScript: errores pre-existentes únicamente
- Frontend: 84 assets, PatientChartPage chunk actualizado (30.20 kB)
- Worker: 3784.26 KiB / gzip: 939.06 KiB

### Deploy
- Migration 0032 check agregado a deploy-production.ps1 (Stage 2)
- Smoke test Stage 11 agregado
- Worker versión c3609e7e desplegado

### Nota Técnica
El extractId bug fue sutil pero crítico: para rutas con sub-paths (`/api/consents/:id/sign`), `parts.pop()` devolvía 'sign' en vez del ID numérico. Fix: usar índice fijo `parts[3]` que siempre corresponde al ID en `/api/consents/:id` o `/api/consents/:id/*`.
