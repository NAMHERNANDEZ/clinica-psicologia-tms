# RELEASE 12.3 — Notas Clinicas Profesionales

**Fecha:** 2026-08-03
**Tag:** v12.3
**Worker Version:** 3f412d7a-ddf5-4775-b37f-4da8457a4f46

## FASE 12.3 — Notas Clinicas Profesionales con Plantillas, Versionado y Firmas

### Nuevas Tablas D1 (migraciones 0031 / 0031b / 0031c)
| Tabla | Descripcion |
|-------|-------------|
| `note_templates` | Plantillas SOAP, DAP, BIRP, LIBRE (seed) |
| `note_versions` | Historial de versiones de cada nota |
| `note_signatures` | Registro de firmas (sign/cosign) |
| `note_audit` | Trazabilidad de eventos (crear, editar, bloquear, firmar, etc.) |

### Columnas agregadas a `clinical_notes`
`template_type`, `fields_json`, `structure_version`, `is_locked`, `locked_at`, `locked_by`, `signed_at`, `signed_by`, `cosigned_by`, `cosigned_at`, `signature_hash`, `risk_level`.

### Nuevos / Modificados Endpoints
| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/clinical-notes/templates` | GET | Listar plantillas |
| `/api/clinical-notes/:id` | PUT | Actualizar nota con versionado automatico |
| `/api/clinical-notes/:id/lock` | POST | Bloquear nota (is_locked=1) |
| `/api/clinical-notes/:id/unlock` | POST | Desbloquear nota |
| `/api/clinical-notes/:id/sign` | POST | Firmar nota (status='final', signature_hash) |
| `/api/clinical-notes/:id/cosign` | POST | Cofirmar (solo psychiatrist/admin) |
| `/api/clinical-notes/:id/versions` | GET | Historial de versiones |
| `/api/clinical-notes/:id/audit` | GET | Registro de auditoria |

### RBAC
- Nuevo rol `psychiatrist` agregado a `types.ts` + `lib/rbac.ts` con permiso `note_templates:read/write`.

### Frontend (PatientChartPage -> NotasTab)
- Selector de plantilla (SOAP/DAP/BIRP/Libre)
- Nivel de riesgo (risk_level)
- Campos estructurados JSON por plantilla
- Crear nota, firmar, cofirmar, ver versiones
- Badges de estado/template/version/riesgo
- Fix: extraccion de notas con clave `'notes'` (antes siempre vacias)
- Nuevo API client `src/lib/api/clinical-notes.ts`

### Fixes
- Colision de imports en `index.ts` resuelta (`handleUpdateSessionNote` vs `handleUpdateNote`)
- `extractNoteId` helper para sub-rutas (`/:id/sign`, etc.)
- Bug de binding de parametros en `updateNote` (parametro extra)
- CHECK constraint `status='locked'` invalido removido (lock usa `is_locked`)
- Firmar sobre nota bloqueada habilitado (firmar ES el paso de cierre)
- Fix seed Libre: CHECK requiere `'LIBRE'` mayuscula

### Smokes
- 19/19 clinical-notes PASS
- 19/19 clinical-chat PASS
- 9/9 appointments PASS
- 8/8 leads PASS
- marketing-ai PASS

### Build
- TypeScript: solo errores pre-existentes (FASE 1-7), 0 nuevos
- Frontend: 84 assets, PatientChartPage chunk
- Worker: 3770.77 KiB / gzip: 937.22 KiB

### Nota
- `smoke-test-dashboard` y `smoke-test-automation` presentan fallos PRE-EXISTENTES fuera del alcance de esta fase: endpoint `/api/dashboard/overview` importado pero nunca registrado en rutas; y CHECK constraint de `channel` en el motor de automatizacion. No fueron tocados por FASE 12.3.
