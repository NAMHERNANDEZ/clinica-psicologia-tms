# ADR-007: Security Model

## Status
Accepted

## Context
The system handles sensitive clinical data (PHS/PII) for a medical facility in Mexico. Security must meet COFEPRIS and ISO 27001 requirements while remaining practical to operate.

## Decision
Security is implemented at 6 layers:
1. **Authentication**: JWT HS256 with short-lived access tokens + refresh tokens
2. **Authorization**: RBAC with 30+ granular permissions across 4 roles (admin, therapist, reception, patient)
3. **Transport**: HTTPS enforced via Cloudflare (CSP, HSTS, X-Frame-Options)
4. **Rate Limiting**: 5 requests per 15 minutes per IP+endpoint, automatic reset
5. **Audit**: Every operation logged with before/after data, IP, user agent, correlation_id
6. **Secrets**: JWT_SECRET and REFRESH_SECRET stored in Cloudflare Secrets, never in code

## Consequences
- Pro: Defense-in-depth with 6 independent layers
- Pro: RBAC allows fine-grained access (therapists see their own patients only)
- Pro: Audit trail satisfies COFEPRIS and ISO 27001 requirements
- Con: More complex to onboard new developers (must understand RBAC + permissions)
- Con: Rate limiting can lock out legitimate users (mitigated by admin bypass)

## Alternatives Considered
- OAuth2 with external provider — rejected due to infrastructure overhead
- API keys without RBAC — rejected because granular access is required
- No rate limiting — rejected due to brute-force risk
- Plain text secrets in environment — rejected because Cloudflare Secrets provide better isolation
