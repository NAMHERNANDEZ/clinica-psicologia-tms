# FASE 11.3 — CRM COMPLETION

**Fecha:** 2026-08-02
**Estado:** ✅ Completado y desplegado a producción
**Decisión:** No se cambiaron los estados existentes (NUEVO→CONTACTADO→CITA_CONFIRMADA→ATENDIDO→CERRADO). Se construyó sobre la base en producción.

---

## Resumen

La auditoría mostró que el CRM ya tenía captura de leads (chat), lista y cambio de estado operativos en producción. Esta fase lo convirtió en un CRM completo (hardening/completion) sin migraciones destructivas ni re-diseño.

---

## 1. Modelo de datos

### Migración `worker/migrations/0023_crm_enhancement.sql`

| Cambio | Detalle |
|--------|---------|
| `leads.email` | Nueva columna (contacto, opcional) |
| `leads.deleted_at` | Soft delete (conserva historial) |
| `lead_notes` | Nueva tabla: `id, clinic_id, lead_id, note, usuario_id, usuario, fecha` |

- NO se tocó el CHECK de `estado` (flujo existente intacto).
- NO se tocó `lead_audit`.

### Tablas críticas (verificadas en remoto)
`leads`, `lead_audit`, `lead_notes` — todas presentes.

---

## 2. Backend (Worker)

Archivos modificados del dominio `worker/src/domains/leads/`:

| Archivo | Cambio |
|---------|--------|
| `repository.ts` | email en insert/select, `updateLead`, `softDeleteLead`, `createLeadNote`/`listLeadNotes`, stats filtra `deleted_at` |
| `service.ts` | `updateLead`, `softDeleteLead`, `addLeadNote`, `getLeadNotes` |
| `validators.ts` | Email valid (create+update), `validateLeadUpdate`, `validateNote` |
| `routes.ts` | Handlers: `handleUpdateLead` (PATCH), `handleDeleteLead` (DELETE soft), `handleAddLeadNote` (POST notes) |

### Endpoints nuevos
```
PATCH  /api/leads/:id              → editar nombre/telefono/email/ciudad/servicio/motivo
DELETE /api/leads/:id              → soft delete (lead_audit registra "eliminación")
POST   /api/leads/:id/notes        → agregar nota de seguimiento
GET    /api/leads/:id              → ahora devuelve { ...lead, audit, notes }
GET    /api/leads?buscar=&origen=&estado=  → búsqueda + filtros
```

Todos los endpoints CRM requieren RBAC `admin` (a excepción de `POST /api/leads` público para captura).

---

## 3. Frontend (`src/pages/admin/LeadsPage.tsx` + `src/lib/api.ts`)

- **Búsqueda** por nombre / teléfono / email / ciudad (debounce 300ms).
- **Filtros**: estado (chips), origen (select: chat/direct/manual).
- **Detalle de lead**: datos completos (incluye email nuevos), acciones de estado.
- **Edición**: formulario `EditForm` con PATCH.
- **Notas**: listado + formulario "Agregar nota".
- **Auditoría**: distingue cambio de estado / nota / edición / eliminación.
- **Eliminar** (soft) con confirmación.
- `src/lib/api.ts`: tipos `LeadNote` expandidos, `leads.list(params)`, `.update()`, `.remove()`, `.addNote()`.

---

## 4. Pipeline y scripts

- `deploy-production.ps1`: aplica 0023 con guarda de idempotencia (solo si la columna `email` no existe — se evita fallo en redeploys).
- `check-remote-migrations.js`: críticas incluyen `lead_notes`, migración 0023 en lista.
- `check-db.js`: tabla `lead_notes` añadida a requeridas.
- `smoke-test-leads.js`: cubre chat, seguridad, create, login admin, GET detalle, PATCH, POST nota, nota persistida, PUT estado, DELETE soft, y 404 post-delete.

---

## 5. Resultado del deploy (pipeline 7 etapas)

| Etapa | Estado |
|-------|--------|
| Typecheck | ✅ OK |
| Migraciones D1 (0020, 0021, 0023) | ✅ OK |
| Verificar esquema remoto | ✅ OK |
| Verificar DB completa | ✅ OK |
| Deploy Worker | ✅ OK |
| Smoke test leads | ✅ 12/12 PASS |
| Health endpoint | ✅ OK |

**Tiempo: 56.7s — DEPLOY PRODUCTION COMPLETADO.**

### Smoke test en producción (12 comprobaciones)
```
✅ Chat público (pricing TMS)
✅ Seguridad GET /api/leads sin auth → 401
✅ POST /api/leads → 201
✅ Health → 200
✅ Login admin →
✅ GET /api/leads/:id → 200 (audit + notes)
✅ PATCH /api/leads/:id → 200
✅ POST /api/leads/:id/notes → 201
✅ Nota persistida en detalle (1)
✅ PUT /api/leads/:id/estado → 200
✅ DELETE /api/leads/:id soft → 200
✅ Lead eliminado ya no visible → 404
```

---

## 6. Notas

- Los errores de `tsc` del frontend (brain/, cos/, `safeArray`, ClinicalAssessments) son **pre-existentes** y ajenos a FASE 11.3; `vite build` no los bloquea (solo `tsc` del worker bloquea, y ese PASA).
- Perfil comercial conserva historial: audit registra toda acción (cambio de estado, nota, edición, eliminación).
- Listo para **FASE 11.4 Agenda**: un lead es ahora un objeto manejado con notas y seguimiento.

## Próximos pasos
- **FASE 11.4** Agenda: conectar CRM con citas (calendario, recordatorio, consulta).