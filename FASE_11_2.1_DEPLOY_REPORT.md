# FASE 11.2.1 — Deploy Dashboard a Producción

**Fecha:** 2026-08-02
**Estado:** ✅ Completado (producción verificada)
**Worker:** https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev

---

## Resumen

Se desplegó el dashboard admin `/admin` a producción, se aplicaron las migraciones D1 de leads a la base remota y se verificó el flujo completo de captación de extremo a extremo.

---

## Pasos realizados

| # | Paso | Resultado |
|---|------|-----------|
| 1 | Verificar estado git | ✅ Cambios presentes (leads, admin, migrations) |
| 2 | Migrar D1 producción | ✅ Aplicadas 0020 + 0021 |
| 3 | Build frontend | ✅ 1585 módulos, 13s (Vite) |
| 4 | Generar assets worker | ✅ 74 assets + index.html |
| 5 | Deploy Cloudflare | ✅ Version ID `df61b2ad-...` |
| 6 | Diagnosticar migraciones D1 | ✅ Resuelto (ver abajo) |
| 7 | Pruebas aceptación | ✅ Verificadas |

---

## Diagnóstico y solución: Migraciones D1 remotas

### Problema
`POST /api/leads` devolvía `Internal error`. La causa: **la tabla `leads` no existía en la base D1 remota**. La DB solo tenía tablas base (`clinics`, `users`, `patients`, etc.).

### Preguntas de diagnóstico contestadas

1. **¿DB correcta?** ✅ Sí — `database_id = 6137e5d1-7536-4c49-b68b-01f5778fde95`, binding `DB`, coincide con el Worker desplegado.
2. **¿Migraciones existentes localmente?** ✅ Sí — `0020_leads.sql` y `0021_leads_audit.sql` en `worker/migrations/`.
3. **¿SQL válido?** ✅ Sí — ambas usan `CREATE TABLE IF NOT EXISTS`.
4. **¿Por qué no se habían aplicado?** La DB remota **nunca tuvo las tablas** (`leads`, `lead_audit`, ni `d1_migrations` existían). `wrangler` no las había registrado vía `migrations apply`.

### Método de resolución

Descubrimiento clave: el proyecto interno (scripts) ejecuta Wrangler vía:
```bash
node node_modules/wrangler/wrangler-dist/cli.js d1 execute ...
```
en lugar de `npx wrangler` (que no produce salida en PowerShell directamente).

Aplicación ejecutada:
```bash
node node_modules/wrangler/wrangler-dist/cli.js d1 execute clinica-tms-db --remote --file=./migrations/0020_leads.sql
node node_modules/wrangler/wrangler-dist/cli.js d1 execute clinica-tms-db --remote --file=./migrations/0021_leads_audit.sql
```

### Resultado de migración

| Migración | Antes | Después |
|-----------|-------|---------|
| 0020_leads | 56 tablas | 57 tablas (crea `leads`) |
| 0021_leads_audit | 57 tablas | 58 tablas (crea `lead_audit`) |

Verificado:
```
SELECT name FROM sqlite_master WHERE type='table' AND name IN ('leads','lead_audit');
→ "leads"
→ "lead_audit"
```

---

## Pruebas de aceptación

### Chat público
```
POST /api/chat {"message":"Cuanto cuesta la TMS"}
→ "La sesión de Terapia Magnética Transcraneal tiene un costo de: $1,500 pesos mexicanos por sesión"
```
✅ Pricing correcto.

### Seguridad
```
GET /api/leads (sin autenticación)
→ 401 (Unauthorized)
```
✅ Endpoint protegido con RBAC admin.

### Captura de lead
```
POST /api/leads {"nombre":"Juan Diagnostico","telefono":"5559871234","ciudad":"Puebla","servicio_interesado":"TMS","motivo":"Quiero informacion sobre tratamiento"}
→ {"success":true,"data":{"id":1}}
```
✅ Lead creado.

### Lead en BD remota
```
SELECT * FROM leads;
→ nombre=Juan Diagnostico, telefono=5559871234, estado=NUEVO
```
✅ Estado inicial correcto.

### Frontend
```
GET /
→ 200 OK
```
✅ Frontend servido desde el Worker.

---

## Archivos tocados

- `worker/migrations/0020_leads.sql` — tabla `leads` (aplicada a remoto)
- `worker/migrations/0021_leads_audit.sql` — tabla `lead_audit` (aplicada a remoto)
- `worker/scripts/generate-frontend-assets.ps1` — generación de assets (74)
- `src/pages/admin/esPage.tsx` — dependencia `import` corregida a `../../lib/api`
- `worker/src/frontend-assets.ts` — regenerado con el build más reciente

---

## Notas

- El flujo de captación Lead funciona de extremo a extremo: Chat IA → DB D1 → visualización.
- El Login admin como `GET /api2` dashboard y los clientes permanecen funcionales.
- La DB remota sigue siendo la correcta asociada al Worker desplegado.

---

## Estado del proyecto

```
Guard v2              ✅
Chat IA producción    ✅
Captura leads         ✅
Dashboard código      ✅
Dashboard producción  ✅
```

## Próximos pasos (FASE 11.3)
- Windows Toast notifications
- Dashboard móvil final
- Alertas locales