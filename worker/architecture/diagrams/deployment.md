# Deployment Pipeline

```text
Developer pushes code to main branch
          │
          ▼
┌─────────────────────────────────────────┐
│        GitHub Actions (CI/CD)            │
│                                          │
│  Stage 1: Typecheck (tsc --noEmit)      │──→ FAIL → STOP
│  Stage 2: Environment Validation        │──→ FAIL → STOP
│  Stage 3: Database Validation           │──→ FAIL → STOP
│  Stage 4: Unit Tests (vitest run)      │──→ FAIL → STOP
│  Stage 5: Security Check               │──→ FAIL → STOP
│  Stage 6: Compliance Check             │──→ FAIL → STOP
│  Stage 7: Migration Validation         │──→ FAIL → STOP
│  Stage 8: Build Dry-Run                │──→ FAIL → STOP
│  Stage 9: Deploy (wrangler deploy)     │──→ FAIL → STOP
│  Stage 10: Smoke Test                  │──→ FAIL → STOP
│  Stage 11: Release Tag                 │──→ SUCCESS → DONE
│                                          │
│  Result: Automated tag v1.0.0-deploy-YYYYMMDD-HHMMSS
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│      Cloudflare Worker Deploy           │
│                                          │
│  1. Upload bundled worker code          │
│  2. Apply routes configuration          │
│  3. Activate new version (instant)      │
│  4. Cron jobs updated if changed        │
│  5. Previous version still available    │
│                                          │
│  URL: https://clinica-tms-api           │
│       .terapiamagneticatranscraneal     │
│       .workers.dev                      │
└─────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────┐
│      Post-Deploy Verification           │
│                                          │
│  GET /api/health → expect 200           │
│  GET /api/compliance/dashboard → 200   │
│  GET /api/backups/latest → 200         │
│  POST /api/auth/login → 200            │
│                                          │
│  If any check fails → rollback          │
│  (Cloudflare keeps previous version     │
│   as fallback)                          │
└─────────────────────────────────────────┘
```

## Local Development

```bash
# Clone repo
git clone <repo-url>
cd worker
npm install

# Environment
cp .dev.vars.example .dev.vars
# Edit .dev.vars with real secrets

# Typecheck
npm run typecheck

# Run tests
npm run test

# Local dev server
npm run dev

# Full pipeline
npm run pipeline

# Deploy to Cloudflare
npm run deploy
```

## Remote Database Setup

```bash
# Initialize remote DB with schema
npm run db:init:remote

# Run seed (compliance rules)
npm run seed

# Run migrations
node node_modules/wrangler/wrangler-dist/cli.js d1 execute clinica-tms-db --remote --file=./migrations/0013_performance_indexes.sql

# Check DB info
node node_modules/wrangler/wrangler-dist/cli.js d1 info clinica-tms-db --json
```
