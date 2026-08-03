# API Endpoints Reference

## Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Health Monitor (8 levels) |

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login and get JWT |
| POST | `/api/auth/refresh` | No | Refresh JWT token |
| POST | `/api/auth/logout` | Yes | Invalidate refresh token |
| GET | `/api/auth/me` | Yes | Get current user |

## Patients

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/patients` | Yes | List patients |
| POST | `/api/patients` | Yes | Create patient |
| GET | `/api/patients/:id` | Yes | Get patient details |
| PUT | `/api/patients/:id` | Yes | Update patient |
| DELETE | `/api/patients/:id` | Yes | Delete patient |

## Therapists

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/therapists` | Yes | List therapists |
| POST | `/api/therapists` | Yes | Create therapist |
| GET | `/api/therapists/:id` | Yes | Get therapist details |
| PUT | `/api/therapists/:id` | Yes | Update therapist |
| DELETE | `/api/therapists/:id` | Yes | Delete therapist |

## Appointments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/appointments` | Yes | List appointments |
| POST | `/api/appointments` | Yes | Create appointment |
| PUT | `/api/appointments/:id` | Yes | Update appointment |
| DELETE | `/api/appointments/:id` | Yes | Delete appointment |

## Clinical Records (Expediente)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/clinical-records` | Yes | List records |
| POST | `/api/clinical-records` | Yes | Create record |
| GET | `/api/clinical-records/:id` | Yes | Get record |
| PUT | `/api/clinical-records/:id` | Yes | Update record |
| DELETE | `/api/clinical-records/:id` | Yes | Delete record |

## Session Notes (SOAP)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/session-notes` | Yes | List notes |
| POST | `/api/session-notes` | Yes | Create note |
| GET | `/api/session-notes/:id` | Yes | Get note |
| PUT | `/api/session-notes/:id` | Yes | Update note |
| DELETE | `/api/session-notes/:id` | Yes | Delete note |

## Documents ( Lifecycle Management)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/documents` | Yes | List documents |
| POST | `/api/documents` | Yes | Create document (DRAFT) |
| GET | `/api/documents/:id` | Yes | Get document |
| PUT | `/api/documents/:id/sign` | Yes | Sign document (GENERATED→SIGNED) |
| PUT | `/api/documents/:id/archive` | Yes | Archive document |
| POST | `/api/documents/:id/supersede` | Yes | Create new version (supersede old) |

## Compliance Engine

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/compliance/dashboard` | Yes | Executive dashboard (per-norma scores) |
| GET | `/api/compliance/alerts` | Yes | List compliance alerts |
| POST | `/api/compliance/run` | Yes | Manually trigger compliance run |
| GET | `/api/compliance/report` | Yes | Compliance report (JSON or CSV) |

## Backups

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/backups/run` | Yes | Manually run backup |
| GET | `/api/backups/latest` | Yes | Get latest backup status |
| GET | `/api/backups` | Yes | List backup runs |

## Quality Metrics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/quality-metrics` | Yes | List metrics |
| POST | `/api/quality-metrics` | Yes | Create metric |
| GET | `/api/quality-metrics/summary` | Yes | Summary view |
| GET | `/api/quality-metrics/dashboard` | Yes | Quality dashboard |
| DELETE | `/api/quality-metrics/:id` | Yes (admin) | Delete metric |

## Reminders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reminders` | Yes | List reminders |
| POST | `/api/reminders/generate` | Yes (admin) | Generate reminders |

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | Yes | List notifications |
| POST | `/api/notifications/log` | Yes | Log notification |

## Templates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/templates` | Yes | List templates |
| POST | `/api/templates` | Yes (admin) | Create template |
| PUT | `/api/templates/:id` | Yes (admin) | Update template |
| DELETE | `/api/templates/:id` | Yes (admin) | Delete template |

## Reception Queue

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reception/queue` | Yes | Get reception queue |
| POST | `/api/reception/queue` | Yes | Add to queue |
| PUT | `/api/reception/queue/:id` | Yes | Update queue status |

## Alerts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/alerts` | Yes | List alerts |
| POST | `/api/alerts` | Yes | Create alert |
| GET | `/api/alerts/summary` | Yes | Alert summary |
| PUT | `/api/alerts/read-all` | Yes | Mark all read |
| PUT | `/api/alerts/:id/read` | Yes | Mark alert read |
| DELETE | `/api/alerts/:id` | Yes | Delete alert |

## Internal Alerts (Security)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/security-incidents` | Yes | List security incidents |
| POST | `/api/security-incidents` | Yes (admin) | Create incident |
| PUT | `/api/security-incidents/:id/resolve` | Yes (admin) | Resolve incident |
| DELETE | `/api/security-incidents/:id` | Yes (admin) | Delete incident |

## Treatment Plans

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/treatments` | Yes | List treatments |
| POST | `/api/treatments` | Yes (therapist+) | Create treatment |
| PUT | `/api/treatments/:id` | Yes (therapist+) | Update treatment |
| DELETE | `/api/treatments/:id` | Yes (admin) | Delete treatment |

## TMS Engine

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tms/engine/dashboard` | Yes | TMS dashboard |
| GET | `/api/tms/engine/efficiency` | Yes | Protocol efficiency |
| GET | `/api/tms/engine/patient/:id` | Yes | Patient TMS stats |
| GET | `/api/tms/engine/analyze/:id` | Yes | Response analysis |
| GET | `/api/tms/engine/adjust/:id` | Yes | Adjustment suggestions |

## Clinical Assessments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/assessments` | Yes | Create assessment |
| GET | `/api/assessments/patient/:id` | Yes | Patient assessments |
| GET | `/api/assessments/patient/:id/:type` | Yes | Assessments by type |

## TMS Protocols

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tms/protocols` | Yes | List protocols |
| POST | `/api/tms/protocols` | Yes (admin/therapist) | Create protocol |
| POST | `/api/tms/protocols/suggest` | Yes | Get protocol suggestion |
| GET | `/api/tms/protocols/:id` | Yes | Get protocol |
| PUT | `/api/tms/protocols/:id` | Yes (admin/therapist) | Update protocol |
| PUT | `/api/tms/protocols/:id/deactivate` | Yes (admin) | Deactivate protocol |

## Digital Twin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/tms/digital-twin/predict` | Yes | Create prediction |
| GET | `/api/tms/digital-twin/patient/:id` | Yes | Patient predictions |
| GET | `/api/tms/digital-twin/history/:id` | Yes | Prediction history |
| GET | `/api/tms/digital-twin/confidence/:id` | Yes | Confidence evaluation |

## Simulation

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/tms/simulation/simulate` | Yes | Run simulation |
| POST | `/api/tms/simulation/compare` | Yes | Compare protocols |
| GET | `/api/tms/simulation/history/:id` | Yes | Comparison history |
| GET | `/api/tms/simulation/dashboard` | Yes | Simulation dashboard |
| GET | `/api/tms/simulation/brain/:id` | Yes | Brain state |

## Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/tms/reports/generate` | Yes | Generate report |
| GET | `/api/tms/reports/treatment/:id` | Yes | Treatment summary |
| GET | `/api/tms/reports/export/:id` | Yes | Export CSV |
| GET | `/api/tms/reports/history/:id` | Yes | Report history |

## Patient Journey

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/journey/reception` | Yes | Reception view |
| GET | `/api/journey/therapist` | Yes | Therapist view |
| POST | `/api/journey/start-treatment` | Yes | Start treatment |
| POST | `/api/journey/complete-session` | Yes | Complete session |
| GET | `/api/journey/patient/:id` | Yes | Patient journey |
| POST | `/api/journey/discharge/:id` | Yes (admin) | Discharge patient |

## COS (Clinical Operating System Layer)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cos/today` | Yes | Today's overview |
| GET | `/api/cos/next-action` | Yes | Next action |
| GET | `/api/cos/patient-states` | Yes | Patient states |
| GET | `/api/cos/tasks` | Yes | Active tasks |
| GET | `/api/cos/alerts` | Yes | System alerts |
