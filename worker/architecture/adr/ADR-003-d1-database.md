# ADR-003: D1 Database (SQLite on Edge)

## Status
Accepted

## Context
The system requires a relational database to store clinical data, compliance records, audit logs, and document metadata. The database must be globally distributed, serverless-compatible, and support scheduled queries.

## Decision
Cloudflare D1 (serverless SQLite) is used as the primary database. Schema is defined in `schema.sql` and migrated via numbered SQL files in `migrations/`.

## Consequences
- Pro: ACID transactions, standard SQL, no server management
- Pro: Scales to thousands of queries per second at the edge
- Pro: D1 bindings provide typed access from Workers
- Con: Limited to 10MB database size (acceptable for current scope)
- Con: No native connection pooling (mitigated by Worker's stateless model)
- Con: Schema changes require migration files (standard practice)

## Alternatives Considered
- PostgreSQL via Supabase — rejected due to latency (not edge-local)
- PlanetScale — rejected for same latency reason
- Cloudflare PostgreSQL (not available at time of decision)
