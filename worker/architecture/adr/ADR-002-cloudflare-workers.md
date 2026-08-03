# ADR-002: Cloudflare Workers as API Runtime

## Status
Accepted

## Context
The system requires a serverless runtime that can handle HTTP requests, scheduled tasks, and secure credential management. Cloudflare Workers provide the ideal platform given the project's needs: global edge deployment, D1 integration, R2 storage, and Pages frontend hosting.

## Decision
The API backend is a single Cloudflare Worker (`clinica-tms-api`) with all business logic, routing, and data access within the Worker's V8 isolate. The frontend is a React SPA deployed to Cloudflare Pages.

## Consequences
- Pro: Global edge deployment with single-digit millisecond latency
- Pro: Integrated D1 (SQLite), R2 (object storage), KV, and Pages in one platform
- Pro: Zero server management
- Con: Cold start latency (mitigated by keeping bundle small)
- Con: Limited compute time per request (mitigated by efficient queries)

## Alternatives Considered
- VPS with Node.js — rejected due to maintenance overhead and scaling complexity
- AWS Lambda — rejected in favor of Cloudflare's unified platform
- Deno Deploy — rejected; Cloudflare has better D1 integration
