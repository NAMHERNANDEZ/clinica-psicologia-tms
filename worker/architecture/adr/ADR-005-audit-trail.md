# ADR-005: Audit Trail with Correlation IDs

## Status
Accepted

## Context
Every clinical operation must be traceable for audits, compliance reviews, and debugging. The system generates a `correlation_id` per pipeline (create → compliance → alert → resolve) and logs every event in `audit_logs` with this ID, allowing operators to trace the complete lifecycle of any operation.

## Decision
- Every request generates a unique `request_id` (8 random hex bytes)
- Compliance pipelines generate a `correlation_id` shared across all events
- `audit_logs` stores: before_data, after_data, old_value, new_value, ip, user_agent, request_id, session_id, correlation_id, result
- The scheduled cron (02:00) also generates a correlation_id for its pipeline

## Consequences
- Pro: Complete traceability for any clinical operation
- Pro: Compliance auditors can follow a patient's entire compliance journey
- Pro: Debugging production issues is straightforward (filter by correlation_id)
- Con: `audit_logs` table grows with every operation (mitigated by partitioning/archiving strategy in the future)

## Alternatives Considered
- Event sourcing — rejected due to complexity overhead for current scope
- Structured logging only (no DB persistence) — rejected because audit trail needs to survive log rotation
- Correlation IDs only for compliance — rejected because all operations benefit from tracing
