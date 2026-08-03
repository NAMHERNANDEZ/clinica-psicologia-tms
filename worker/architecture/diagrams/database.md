# Database Diagram

## Entity Relationship Summary (41 tables)

### Core Clinical
```text
patients ────┬──── clinical_records (expediente)
              ├──── session_notes (SOAP notes)
              ├──── consents
              ├──── appointments
              ├──── tms_patient_profiles ──── tms_protocols
              │                                    │
              │                              ┌─────┴─────┐
              │                              │ tms_sessions│
              │                              └─────┬─────┘
              │                              ┌─────┴─────┐
              │                              │motor_thresholds│
              │                              └─────┬─────┘
              │                              ┌─────┴───────────┐
              │                              │adverse_effects    │
              │                              │clinical_response_tracking│
              │                              │clinical_assessments│
              │                              └─────────────────┘
              │
              └──── patient_timeline_events

therapists ──── appointments ──── patients
              └─── tms_patient_profiles
```

### Compliance & Audit
```text
compliance_rules ────── compliance_alerts ←─── patients
       │                        │
       │     ┌──────────────────┘
       ▼     ▼
compliance_runs ───── audit_logs ←─── users
                        (has correlation_id
                         and request_id)
```

### Document Management
```text
documents ───── patients
(DRAFT → GENERATED → SIGNED → SUPERSEDED → ARCHIVED)
```

### Backup & Quality
```text
backup_runs          quality_metrics
(41 tables)          (clinical KPIs)
```

### Indexes (covers all major queries)
All indexes follow naming convention: `idx_{table}_{columns}`

Key composite indexes:
- `idx_compliance_alerts_status_severity` → SEARCH (not SCAN)
- `idx_audit_module_action` → SEARCH
- `idx_audit_correlation_id` → SEARCH
- `idx_session_notes_patient_date` → SEARCH
- `idx_clinical_records_patient` → SEARCH
- `idx_backup_runs_status_created` → SEARCH
