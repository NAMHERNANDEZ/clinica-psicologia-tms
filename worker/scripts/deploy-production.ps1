# deploy-production.ps1 — Pipeline único de despliegue a producción (FASE 11.2.2)
# Ejecuta: build -> deploy worker -> migraciones D1 -> smoke tests -> reporte
# Uso (desde worker/): .\scripts\deploy-production.ps1
# Requiere haber hecho `npm run build` en la raíz (frontend) y
# haber generado frontend-assets. Uso asistido:
#
#   Deploy recomendado desde la raíz del repo:
#   1. $env:VITE_API_URL="https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev"; npm run build
#   2. powershell -File worker/scripts/generate-frontend-assets.ps1 -DistPath "dist"
#   3. powershell -File worker/scripts/deploy-production.ps1

param(
  [string]$WorkerUrl = "https://clinica-psicologia-tms.terapiamagneticatranscraneal.workers.dev"
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date
$script:results = @()

function Write-Stage($num, $name) {
  Write-Host "`n========================================" -ForegroundColor Cyan
  Write-Host " [$num] $name" -ForegroundColor Cyan
  Write-Host "========================================" -ForegroundColor Cyan
}

function Run-Stage($num, $name, $scriptBlock) {
  Write-Stage $num $name
  $t = Get-Date
  try {
    & $scriptBlock
    $duration = (Get-Date) - $t
    Write-Host "  $([char]0x2705) $name OK ($($duration.TotalSeconds.ToString('0.0'))s)" -ForegroundColor Green
    $script:results += @{ stage = $name; status = "PASS"; duration = $duration.TotalSeconds.ToString('0.0') }
  } catch {
    $duration = (Get-Date) - $t
    Write-Host "  $([char]0x274C) $name FALLIDO: $_" -ForegroundColor Red
    $script:results += @{ stage = $name; status = "FAIL"; duration = $duration.TotalSeconds.ToString('0.0') }
    exit 1
  }
}

$WRANGLER_JS = "node_modules/wrangler/wrangler-dist/cli.js"

function Invoke-Wrangler {
  $null = & node $WRANGLER_JS @args
  return $LASTEXITCODE
}

# STAGE 1: Typecheck
Run-Stage 1 "Typecheck" {
  node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run typecheck
  if ($LASTEXITCODE -ne 0) { throw "TypeScript errors" }
}

# STAGE 2: Migraciones D1 remotas (solo pendientes del flujo leads, no re-aplicar todo)
Run-Stage 2 "Migraciones D1 leads" {
  # El proyecto no usa d1_migrations (tracking manual). Solo aplica migraciones
  # idempotentes del flujo de captación (leads). Usan CREATE TABLE IF NOT EXISTS,
  # por lo que re-ejecutarlas es seguro.
  $leadMigrations = @(
    "./migrations/0020_leads.sql",
    "./migrations/0021_leads_audit.sql"
  )
  foreach ($file in $leadMigrations) {
    if (-not (Test-Path $file)) { throw "Migración no encontrada: $file" }
    Write-Host "  Aplicando $(Split-Path $file -Leaf)..."
    $code = Invoke-Wrangler d1 execute clinica-tms-db --remote --file=$file
    if ($code -ne 0) { throw "Fallo aplicando $file (exit $code)" }
  }

  # FASE 11.3: 0023 usa ALTER TABLE (no idempotente). Solo se aplica si la columna
  # email aún no existe (evita fallo en redeploys).
  $hasEmail = $false
  $pragma = node $WRANGLER_JS d1 execute clinica-tms-db --remote --command "SELECT name FROM pragma_table_info('leads') WHERE name='email'" --json 2>$null | Out-String
  $hasEmail = $pragma -match '"name"\s*:\s*"email"'
  if (-not $hasEmail) {
    Write-Host "  Aplicando 0023_crm_enhancement.sql (email/lead_notes)..."
    $code = Invoke-Wrangler d1 execute clinica-tms-db --remote --file=./migrations/0023_crm_enhancement.sql
    if ($code -ne 0) { throw "Fallo aplicando 0023 (exit $code)" }
  } else {
    Write-Host "  0023 ya aplicado (email presente), se omite."
  }

  # FASE 11.4: 0024 usa ALTER TABLE (lead_id, type, deleted_at) + CREATE TABLE availability
  $hasLeadId = $false
  $pragma2 = node $WRANGLER_JS d1 execute clinica-tms-db --remote --command "SELECT name FROM pragma_table_info('appointments') WHERE name='lead_id'" --json 2>$null | Out-String
  $hasLeadId = $pragma2 -match '"name"\s*:\s*"lead_id"'
  if (-not $hasLeadId) {
    Write-Host "  Aplicando 0024_appointments_completion.sql (lead_id/type/availability)..."
    $code = Invoke-Wrangler d1 execute clinica-tms-db --remote --file=./migrations/0024_appointments_completion.sql
    if ($code -ne 0) { throw "Fallo aplicando 0024 (exit $code)" }
  } else {
   Write-Host "  0024 ya aplicado (lead_id presente), se omite."
   }

   # FASE 11.7: 0026 usa CREATE TABLE IF NOT EXISTS (idempotente)
   $hasMarketing = $false
   $chk = node $WRANGLER_JS d1 execute clinica-tms-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='marketing_content'" --json 2>$null | Out-String
   if ($chk -match 'marketing_content') {
     $hasMarketing = $true
   }
   if (-not $hasMarketing) {
     Write-Host "  Aplicando 0026_marketing_ai.sql (marketing_content/campaigns/seo/ai_audit_logs)..."
     $code = Invoke-Wrangler d1 execute clinica-tms-db --remote --file=./migrations/0026_marketing_ai.sql
     if ($code -ne 0) { throw "Fallo aplicando 0026 (exit $code)" }
   } else {
     Write-Host "  0026 ya aplicado (marketing_content presente), se omite."
   }

   # FASE 11.8: 0027 usa CREATE TABLE IF NOT EXISTS (idempotente)
   $hasChat = $false
   $chkChat = node $WRANGLER_JS d1 execute clinica-tms-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='clinical_chat_sessions'" --json 2>$null | Out-String
   if ($chkChat -match 'clinical_chat_sessions') {
     $hasChat = $true
   }
   if (-not $hasChat) {
     Write-Host "  Aplicando 0027_clinical_chat.sql (chat_sessions/messages/analytics)..."
     $code = Invoke-Wrangler d1 execute clinica-tms-db --remote --file=./migrations/0027_clinical_chat.sql
     if ($code -ne 0) { throw "Fallo aplicando 0027 (exit $code)" }
   } else {
     Write-Host "  0027 ya aplicado (clinical_chat_sessions presente), se omite."
   }

   # FASE 12.3: 0031 usa CREATE TABLE IF NOT EXISTS + columnas nuevas (tablas nuevas idempotentes)
   $hasNoteTemplates = $false
   $chkTpl = node $WRANGLER_JS d1 execute clinica-tms-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='note_templates'" --json 2>$null | Out-String
   if ($chkTpl -match 'note_templates') {
     $hasNoteTemplates = $true
   }
   if (-not $hasNoteTemplates) {
     Write-Host "  Aplicando 0031_clinical_notes_professional.sql (note_templates/versions/audit/signatures)..."
     $code = Invoke-Wrangler d1 execute clinica-tms-db --remote --file=./migrations/0031_clinical_notes_professional.sql
     if ($code -ne 0) { throw "Fallo aplicando 0031 (exit $code)" }
   } else {
     Write-Host "  0031 ya aplicado (note_templates presente), se omite."
   }

   Write-Host "  Migraciones de leads aplicadas."
 }

# STAGE 3: Verificar esquema remoto (tablas críticas)
Run-Stage 3 "Verificar esquema remoto" {
  node scripts/check-remote-migrations.js
  if ($LASTEXITCODE -ne 0) { throw "Esquema remoto incompleto" }
}

# STAGE 4: Verificar DB completa
Run-Stage 4 "Verificar DB completa" {
  node scripts/check-db.js
  if ($LASTEXITCODE -ne 0) { throw "DB incompleta" }
}

# STAGE 5: Deploy Worker
Run-Stage 5 "Deploy Worker" {
  $code = Invoke-Wrangler deploy
  if ($code -ne 0) { throw "Deploy falló" }
}

# STAGE 6: Smoke test leads (producción)
Run-Stage 6 "Smoke test leads" {
  Start-Sleep -Seconds 5
  node scripts/smoke-test-leads.js
  if ($LASTEXITCODE -ne 0) { throw "Smoke test falló" }
}

# STAGE 7: Health endpoint
Run-Stage 7 "Health endpoint" {
  $health = Invoke-WebRequest -Uri "$WorkerUrl/api/health" -UseBasicParsing -TimeoutSec 20
  if ($health.StatusCode -ne 200) { throw "Health no 200" }
  Write-Host "  Health OK ($($health.StatusCode))"
}

# STAGE 8: Smoke test Marketing AI (FASE 11.7)
Run-Stage 8 "Smoke test marketing AI" {
  Start-Sleep -Seconds 5
  node scripts/smoke-test-marketing-ai.js
  if ($LASTEXITCODE -ne 0) { throw "Smoke test marketing AI falló" }
}

# STAGE 9: Smoke test Clinical Chat AI (FASE 11.8)
Run-Stage 9 "Smoke test clinical chat" {
  Start-Sleep -Seconds 5
  node scripts/smoke-test-clinical-chat.js
  if ($LASTEXITCODE -ne 0) { throw "Smoke test clinical chat falló" }
}

# STAGE 10: Smoke test Clinical Notes (FASE 12.3)
Run-Stage 10 "Smoke test clinical notes" {
  Start-Sleep -Seconds 5
  node scripts/smoke-test-clinical-notes.js
  if ($LASTEXITCODE -ne 0) { throw "Smoke test clinical notes falló" }
}

# SUMMARY
$totalDuration = (Get-Date) - $startTime
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " DEPLOY PRODUCTION SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
foreach ($r in $script:results) {
  $icon = if ($r.status -eq "PASS") { "[OK]" } else { "[FAIL]" }
  Write-Host " $icon $($r.stage.PadRight(28)) $($r.duration)s" -ForegroundColor $(if ($r.status -eq "PASS") { "Green" } else { "Red" })
}
Write-Host "----------------------------------------" -ForegroundColor Gray
$allPassed = (@($script:results | Where-Object { $_.status -eq "FAIL" }).Count) -eq 0
if ($allPassed) {
  Write-Host " [OK] DEPLOY PRODUCTION COMPLETADO en $($totalDuration.TotalSeconds.ToString('0.0'))s" -ForegroundColor Green
  Write-Host "   URL: $WorkerUrl" -ForegroundColor White
} else {
  Write-Host " [FAIL] DEPLOY PRODUCTION FALLIDO" -ForegroundColor Red
  exit 1
}
Write-Host "========================================`n" -ForegroundColor Cyan