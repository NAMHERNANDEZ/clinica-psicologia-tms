# ADR-001: Repository Pattern

## Status
Accepted

## Context
The system needs a clean separation between business logic and data access. Without a repository layer, services would directly access D1 with SQL strings scattered across the codebase, making testing, maintenance, and schema changes difficult.

## Decision
All data access is encapsulated in Repository classes (`PatientRepository`, `ComplianceRepository`, `DocumentRepository`, etc.). Services depend on repositories, never on raw D1 queries.

## Consequences
- Pro: Easy to test services with mock repositories
- Pro: Schema changes only affect Repository, not Service or Route code
- Pro: Consistent query patterns across the codebase
- Con: Slight additional abstraction layer (mitigated by simple repository pattern)

## Alternatives Considered
- Active Record pattern (each model handles its own queries) — rejected for separation of concerns
- ORM — rejected because D1 does not have an ORM, and raw SQL provides better control
- Direct DB access in routes — rejected because it violates separation of concerns
