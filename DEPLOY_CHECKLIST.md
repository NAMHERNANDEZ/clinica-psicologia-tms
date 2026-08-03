# DEPLOY CHECKLIST — CLINICA_AI producción

Manual de despliegue repetible. Prioridad: no olvidar ningún paso y fallar antes si
algo está incompleto (no continuar sobre una base de datos incompleta).

---

## Comando único (recomendado)

Desde `worker/` tras haber construido el frontend:

```powershell
# 1. En la raíz del repo (construye el frontend)
$env:VITE_API_URL="https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev"
npm run build

# 2. Genera los assets del worker (desde la raíz)
powershell -File worker/scripts/generate-frontend-assets.ps1 -DistPath "dist"

# 3. Desde worker/ ejecuta el pipeline completo
cd worker
powershell -File scripts/deploy-production.ps1
```

`deploy-production.ps1` ejecuta automáticamente (y falla ante el primer error):

```
1. Typecheck
2. Migraciones D1 remotas (aplica todos los .sql de migrations/)
3. Verificar esquema remoto  (check-remote-migrations.js — tablas críticas)
4. Verificar DB completa      (check-db.js — REQUIRED_TABLES incluye leads, lead_audit)
5. Deploy Worker             (wrangler deploy)
6. Smoke test leads          (smoke-test-leads.js — chat, seguridad, POST lead, health)
7. Health endpoint
```

---

## Checklist manual (si no usas el pipeline)

```
□ Build frontend              (npm run build con VITE_API_URL)
□ Generar assets worker       (generate-frontend-assets.ps1)
□ Migraciones D1 remotas      (node .../cli.js d1 execute --remote --file=./migrations/0020_leads.sql)
□ Verificar número de tablas  (esperado 60; leads + lead_audit presentes)
□ Probar POST /api/leads      (HTTP 201, {"success":true,"data":{"id":N}})
□ Probar chat público         (HTTP 200, pricing TMS $1,500)
□ Probar seguridad            (GET /api/leads sin auth -> 401/403)
□ Probar Dashboard /admin     (requiere login admin)
□ Generar reporte             (FASE_XX_Y_DEPLOY_REPORT.md)
```

---

## Comandos individuales

### Migraciones D1 (producción)
```powershell
# Antes: ver tabla remota
node node_modules/wrangler/wrangler-dist/cli.js d1 execute clinica-tms-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"

# Verificar tablas críticas
node node_modules/wrangler/wrangler-dist/cli.js d1 execute clinica-tms-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('leads','lead_audit')"

# Aplicar migración específica
node node_modules/wrangler/wrangler-dist/cli.js d1 execute clinica-tms-db --remote --file=./migrations/0020_leads.sql
node node_modules/wrangler/wrangler-dist/cli.js d1 execute clinica-tms-db --remote --file=./migrations/0021_leads_audit.sql
```

> **Importante:** NUNCA usar `npx wrangler` directamente en PowerShell para
> consultas/execución. Emite advertencias de versión mezcladas que rompen el parseo
> JSON y no siempre devuelve salida capturable. Usar
> `node node_modules/wrangler/wrangler-dist/cli.js` (mismo método que `scripts/`).

### Deploy Worker
```powershell
cd worker
node node_modules/wrangler/wrangler-dist/cli.js deploy
```

---

## Verificación post-deploy

| Comprobación | Comando | Esperado |
|-------------|---------|----------|
| Health | `Invoke-RestMethod <URL>/api/health` | success=true |
| Chat | `POST <URL>/api/chat {"message":"Cuanto cuesta la TMS"}` | $1,500 |
| Seguridad | `GET <URL>/api/leads` sin auth | 401/403 |
| Crear lead | `POST <URL>/api/leads {...}` | success=true, id |
| DB (leads) | query D1 remota | tabla leads contiene el registro |

URL: `https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev`