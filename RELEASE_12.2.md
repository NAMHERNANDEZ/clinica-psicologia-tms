# RELEASE 12.2 — Expediente Clinico Unificado (PatientChartPage)

**Fecha:** 2026-08-03
**Tag:** v12.2
**Worker Version:** a2e13e19-5d68-4d57-8e9e-bc8d1ed4378b

## FASE 12.2 — Vista Unificada del Expediente

### Nuevos Endpoints
| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/api/clinical-notes/:id` | PUT | Actualizar nota clinica (note, note_type, risk_level, status). Incrementa version automaticamente. |
| `/api/consents/:id/revoke` | PUT | Revocar consentimiento. Requiere `clinical:write`. |

### Frontend
- **PatientChartPage** (`/app/expediente/:patientId`): Vista unificada del expediente clinico con 10 tabs:
  1. **Datos** — Demograficos, contacto, contacto de emergencia, seguro medico
  2. **Diagnosticos** — CIE-10, diagnostico clinico, registros clinicos
  3. **Tratamientos** — Lista de tratamientos activos/completados
  4. **Notas clinicas** — Notas de progreso, evolucion, sicologia, psiquiatria
  5. **TMS** — Perfiles TMS, sesiones TMS, respuesta clinica, efectos adversos
  6. **Medicamentos** — Medicamentos activos, alergias, signos vitales
  7. **Escalas** — Evaluaciones clinicas, escalas psicometricas
  8. **Documentos** — Documentos del paciente
  9. **Consentimientos** — Consentimientos firmados, revocados
  10. **Timeline** — Linea temporal de eventos clinicos

- Fetch en paralelo via `Promise.allSettled` (12+ endpoints)
- Sin entidades nuevas — consume endpoints existentes
- Route: `/app/expediente/:patientId`

### Integracion
- Ruta agregada en `App.tsx`
- PacientesPage y PatientDetailPage vinculan a `/app/expediente/:id`
- Sin nuevos modulos, sin nuevas tablas D1

### Smokes
- 19/19 clinical-chat PASS
- 8/8 leads PASS
- 9/9 appointments PASS
- Endpoints PUT verificados (rate limit previene re-test inmediato)

### Build
- TypeScript: 92 errores pre-existentes (safeArray, BrainRenderer, etc.), 0 nuevos
- Frontend: 84 assets, 19.62 kB PatientChartPage chunk
- Worker: 3748.69 KiB / gzip: 933.30 KiB
