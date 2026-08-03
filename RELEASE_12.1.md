# RELEASE_12.1 — FASE 12.1 EMR Core

## Metadata
- **Version**: v12.1
- **Git commit**: 00852da
- **Git tag**: v12.1
- **Worker version**: 20e57e9b-3910-4e2c-8ec1-301298ffe1b5
- **Date**: 2026-08-03
- **Status**: PRODUCTION READY

## What was built

### P1: Security & Compliance Fixes
| Fix | File | Impact |
|-----|------|--------|
| Documents RBAC | `documents/routes.ts` | All 6 endpoints now require `documents:*` permissions |
| Documents validators | `documents/validators.ts` | New file: validates document_type, patient_id, signed_by |
| RBAC map expanded | `rbac.ts` | Added `documents:*`, `clinical_notes:*`, `sessions:*`, `treatments:*`, `templates:*`, `timeline:*` to therapist/admin/reception roles |
| Clinical-notes audit | `clinical-notes/service.ts` | `logAudit()` + `triggerCompliance()` on create |
| Sessions audit | `sessions/service.ts` | `logAudit()` + `triggerCompliance()` on complete/update |

### P2: Patient Demographics Overhaul (Migration 0028)
New columns on `patients` table:
- `curp`, `gender`, `marital_status`, `blood_type`, `occupation`, `nationality`, `referral_source`, `photo_url`
- `address_street`, `address_city`, `address_state`, `address_zip`
- `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relationship`
- `insurance_provider`, `insurance_id`
- `allergies`, `current_medications`, `medical_history`, `family_history`, `social_history`
- `updated_at`

New tables:
| Table | Purpose |
|-------|---------|
| `patient_emergency_contacts` | Multiple emergency contacts per patient |
| `patient_insurance` | Multiple insurance records per patient |
| `patient_allergies` | Drug allergy tracking (for interaction checks) |
| `patient_medications` | Medication reconciliation |

### P2: Clinical Record Extensions (Migration 0029)
New columns on `clinical_records`:
- `cie10_codes`, `allergies`, `current_medications`, `past_medical_history`
- `family_history`, `social_history`, `review_of_systems`, `vital_signs`
- `status` (open/closed/archived), `version`, `locked_by`, `locked_at`, `closed_at`

New columns on `session_notes`:
- `session_number`, `treatment_id`, `appointment_id`, `duration_minutes`
- `status` (draft/final/cosigned), `signed_at`, `co_signed_by`, `co_signed_at`
- `billing_codes`, `risk_level`, `version`

New columns on `clinical_notes`:
- `updated_at`, `version`, `status` (draft/final/cosigned)

New columns on `treatments`:
- `diagnosis_codes`, `treatment_goals`, `frequency_per_week`, `setting`, `informed_consent_id`

New columns on `sessions`:
- `actual_duration`, `cancellation_reason`, `no_show_reason`, `rescheduled_from`

New tables:
| Table | Purpose |
|-------|---------|
| `cie10_codes` | CIE-10 diagnosis code catalog (20 common mental health codes seeded) |

### P2: Consent Lifecycle + Document Content (Migration 0030)
New columns on `consents`:
- `status` (active/revoked/expired), `revoked_at`, `revoked_by`
- `witness_name`, `witness_signature`, `language`, `version`, `template_id`, `expires_at`, `updated_at`

New columns on `documents`:
- `content`, `file_size`, `mime_type`, `checksum_algorithm`, `description`, `tags`

New tables:
| Table | Purpose |
|-------|---------|
| `consent_templates` | Standard consent templates (3 seeded: TMS, psicologia, privacidad) |
| `access_log` | NOM-004/HIPAA: who viewed what, when |
| `vital_signs` | Patient vital signs tracking |

## Database state
| Metric | Before | After |
|--------|--------|-------|
| D1 tables | 72 | 75 |
| Total rows written (migrations) | — | 193 |

## Migrations applied
| Migration | Queries | Rows written | Status |
|-----------|---------|--------------|--------|
| 0028_patient_demographics.sql | 31 | 35 | APPLIED |
| 0029_clinical_extensions.sql | 40 | 122 | APPLIED |
| 0030_consent_document_access.sql | 27 | 36 | APPLIED |

## Smoke tests
| Suite | Status |
|-------|--------|
| clinical-chat (19/19) | PASS |
| marketing-ai (25/25) | Previously PASS (rate-limited during testing) |

## Files created/modified
- `worker/migrations/0028_patient_demographics.sql` — Patient demographics + emergency contacts + insurance + allergies + medications
- `worker/migrations/0029_clinical_extensions.sql` — Clinical records + session notes + treatments + sessions + CIE10 catalog
- `worker/migrations/0030_consent_document_access.sql` — Consent lifecycle + document content + access log + vital signs
- `worker/src/lib/rbac.ts` — Expanded RBAC map (26→30 permissions, 4 roles)
- `worker/src/domains/documents/routes.ts` — Added RBAC `requirePermission` to all 6 endpoints
- `worker/src/domains/documents/validators.ts` — New: input validation for documents
- `worker/src/domains/clinical-notes/service.ts` — Added audit logging + compliance trigger
- `worker/src/domains/clinical-notes/routes.ts` — Updated createNote call with ip parameter
- `worker/src/domains/sessions/service.ts` — Added audit logging + compliance trigger
- `worker/src/domains/sessions/routes.ts` — Updated completeSession/updateSession calls with clinicId, userId, ip

## What remains for FASE 12
| Sub-phase | Status | Next |
|-----------|--------|------|
| 12.1 Patient demographics | DONE | — |
| 12.2 Clinical record core | DONE (schema) | Frontend PatientChartPage |
| 12.3 Notes versioning | DONE (schema) | Versioning service logic |
| 12.4 Consent e-signature | DONE (schema) | E-signature workflow |
| 12.5 Document content | DONE (schema) | PDF generation pipeline |
| 12.6 RBAC clinical roles | DONE | — |
| 12.7 Access logging | DONE (schema) | Middleware integration |
| 12.8 Frontend | TODO | PatientChartPage |
| 12.9 Portal del paciente | TODO | Patient-facing portal |

## Next phase
**FASE 12.2** — Frontend: PatientChartPage (unified clinical view) + consent revocation endpoint + clinical-notes update endpoint.
