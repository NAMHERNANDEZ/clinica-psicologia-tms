# FASE_11_4_AGENDA_REPORT.md
## Fase 11.4 — Agenda Completion
**Fecha:** 2026-08-01
**Estado:** ✅ COMPLETADA

## Resumen
Conectar el CRM (FASE 11.3) con el sistema de citas: lead→paciente promotion, soft delete, filtros en agenda.

## Archivos modificados/creados
- `worker/migrations/0024_appointments_completion.sql` — lead_id, type, deleted_at, availability
- `worker/src/domains/appointments/service.ts` — createFromLead con dedup por teléfono
- `worker/src/domains/appointments/repository.ts` — softDelete, lead_id/type
- `worker/src/domains/patients/repository.ts` — findPatientByPhone
- `worker/src/domains/therapists/repository.ts` — findFirstActiveTherapist
- `worker/src/types.ts` — Appointment type actualizado
- `src/lib/api.ts` — Appointment interface + create params
- `src/pages/admin/LeadsPage.tsx` — "Crear cita" inline
- `src/pages/app/AgendaPage.tsx` — safeArray, filtros tipo/estado
- `worker/scripts/smoke-test-appointments.js` — 9 tests
- `worker/scripts/deploy-production.ps1` — 0024 guarded migration
- `worker/scripts/check-remote-migrations.js` — availability
- `worker/scripts/check-db.js` — availability table

## Resultados
- **Worker typecheck:** PASS
- **Frontend build:** OK (VITE_API_URL set)
- **Deploy production:** 7/7 stages PASS
- **Smoke appointments:** 9/9 PASS

## Notas técnicas
- 0024 usa ALTER TABLE (no idempotente) → guardado con `pragma_table_info` check
- appointments.list retorna `{data: {appointments: []}}` — frontend `safeArray` maneja ambos formatos
- Lead→Paciente: si patient_id ya existe, usa el existente; si no, crea uno nuevo desde los datos del lead
- Therapist fallback: resuelve `findFirstActiveTherapist()` si no se especifica
