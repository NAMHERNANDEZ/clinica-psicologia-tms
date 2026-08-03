# ADR-006: Health Monitor (8-Level)

## Status
Accepted

## Context
Production systems need continuous health verification. A simple `/health` ping was insufficient — operators needed visibility into database connectivity, compliance engine status, backup recency, security configuration, and Cloudflare service availability from a single endpoint.

## Decision
`GET /api/health` implements 8 verification levels:
1. API liveness
2. D1 database connectivity + latency
3. Security configuration (JWT_SECRET, REFRESH_SECRET, ALLOWED_ORIGINS)
4. Compliance engine (rules loaded, alerts working, cron executing)
5. Clinical modules (records, notes, consents accessible)
6. Document management
7. Backup status (last run, recency)
8. Cloudflare platform (D1, R2 availability)

Overall status: HEALTHY / DEGRADED / UNHEALTHY.
All levels return `200` except DEGRADED and UNHEALTHY.

## Consequences
- Pro: Single endpoint gives complete system overview
- Pro: Integrates with monitoring tools (Datadog, New Relic, etc.)
- Pro: Can be called by external uptime monitors
- Con: `/health` is now more complex (acceptable trade-off)

## Alternatives Considered
- Separate health endpoints per subsystem — rejected because operators want one URL
- Binary up/down check — rejected because DEGRADED status provides useful partial information
- External monitoring only — rejected because internal health provides faster feedback
