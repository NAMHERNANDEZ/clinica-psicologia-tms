# FASE 11.2.2 — HARDENING (Endurecimiento del despliegue)

**Fecha:** 2026-08-02
**Estado:** ✅ Completado
**Objetivo:** Hacer el despliegue a producción confiable, repetible y que falle ante esquemas incompletos.

---

## Contexto

FASE 11.2.1 dejó el flujo de captación funcionando de extremo a extremo. Sin embargo,
el despliegue dependía de pasos manuales (aplicar migraciones D1 por separado) que
podían olvidarse, dejando la base de datos remota incompleta silenciosamente.

Esta fase automatiza esas comprobaciones y falla antes de continuar si algo falta.

---

## Problema encontrado y resuelto

1. **Wrangler no produce salida capturable vía `npx` en PowerShell.**
   - El proyecto ya usaba `node node_modules/wrangler/wrangler-dist/cli.js` (método interno de `scripts/`).
   - Se estandarizó este método en todos los scripts de validación.

2. **`check:db` / `check:remote-migrations` no podían parsear la salida de wrangler.**
   - Wrangler mezcla advertencias de versión con el JSON de resultados.
   - Se añadió limpieza de códigos ANSI + extracción robusta del array JSON.

3. **Re-aplicar todas las migraciones (0008-0019) fallaba** (columnas duplicadas) porque ya estaban aplicadas y el proyecto no usa la tabla `d1_migrations` (tracking manual).
   - El pipeline ahora aplica **solo las migraciones idempotentes del flujo de leads** (`IF NOT EXISTS`): 0020 y 0021.

## Componentes entregados

| Script | Función | Resultado |
|--------|---------|-----------|
| `scripts/check-db.js` | Verifica tablas críticas incluyendo `leads`, `lead_audit` | ✅ PASSED |
| `scripts/check-remote-migrations.js` | Esquema local vs remoto + tablas críticas | ✅ PASSED |
| `scripts/smoke-test-leads.js` | Chat, seguridad, POST lead, health en producción | ✅ PASSED |
| `scripts/deploy-production.ps1` | Pipeline único build→migra→deploy→prueba | ✅ COMPLETADO |
| `scripts/generate-frontend-assets.ps1` | (existente) genera assets del worker | ✅ |

## Pipeline `deploy-production.ps1` — 7 etapas

| Etapa | Comando | Estado |
|-------|---------|--------|
| 1. Typecheck | `npm run typecheck` | ✅ OK |
| 2. Migraciones D1 leads | `cli.js d1 execute --remote --file=0020/0021` | ✅ OK |
| 3. Verificar esquema remoto | `check-remote-migrations.js` | ✅ OK |
| 4. Verificar DB completa | `check-db.js` | ✅ OK |
| 5. Deploy Worker | `cli.js deploy` | ✅ OK |
| 6. Smoke test leads | `smoke-test-leads.js` | ✅ OK |
| 7. Health endpoint | `Invoke-WebRequest /api/health` | ✅ OK |

**Tiempo total: 44.9s** — Todas las etapas `[OK]`.

## Corrección de defectos encontrados

### TypeScript (dominio leads)
- `repository.ts:135` — cast seguro `as unknown as LeadAuditEntry[]`.
- `index.ts:261-263` — lógica duplicada de `requireRole` corregida; ahora `leadAuth` se evalúa una vez y el guard maneja correctamente `Response | null`.

### Pipeline PowerShell
- Scoping: `$script:results` en lugar de `$results` local.
- Parsing del verdicto: `@(...).Count` para que un array vacío evalúe `true` (no `$null`).
- Invocación de wrangler: wrapper `Invoke-Wrangler` que usa `node cli.js` y devuelve exit code (sin `2>&1` que dispara el ErrorActionPreference).

## Uso

```powershell
# Desde worker/: despliegue completo de una vez
powershell -File scripts/deploy-production.ps1
# o vía npm
npm run deploy:production
```

Documentación manual completa: `DEPLOY_CHECKLIST.md` (en la raíz del repo).

## Notas / riesgos residuales

- La tabla `d1_migrations` no existe en la DB remota; el tracking de migraciones es manual.
  Se recomienda evaluar `wrangler d1 migrations apply` + tabla estándar en una fase futura.
- El pipeline asume que el frontend ya fue construido (`npm run build` + generar assets).
  Esto se dejó explícito en los comentarios del script y en el DEPLOY_CHECKLIST,
  porque el build depende de `VITE_API_URL`.

## Estado del proyecto

```
Guard v2               ✅
Chat IA producción     ✅
Captura leads          ✅
Dashboard código       ✅
Dashboard producción   ✅
Pipeline de deploy     ✅ (FASE 11.2.2)
```

## Próximos pasos
- FASE 11.3: Windows Toast notifications
- (Opcional) Añadir tracking de migraciones con tabla `d1_migrations`.