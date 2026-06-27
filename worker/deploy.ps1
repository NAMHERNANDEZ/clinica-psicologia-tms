# deploy.ps1 — Deploy HARDENED a Cloudflare
# Ejecutar desde la carpeta worker/

$ErrorActionPreference = "Stop"
$maxRetries = 1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " NEUROCIENCIA CLINICA — HARDENED DEPLOY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# --- 0. Typecheck ---
Write-Host "[1/6] Typecheck..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host "❌ TypeScript errors. Abort." -ForegroundColor Red; exit 1 }
Write-Host "  ✅ TypeScript OK" -ForegroundColor Green

# --- 1. check:env ---
Write-Host "[2/6] check:env..." -ForegroundColor Yellow
node scripts/check-env.js
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Env validation failed. Abort." -ForegroundColor Red; exit 1 }

# --- 2. check:db ---
Write-Host "[3/6] check:db..." -ForegroundColor Yellow
node scripts/check-db.js
if ($LASTEXITCODE -ne 0) { Write-Host "❌ DB validation failed. Abort." -ForegroundColor Red; exit 1 }

# --- 3. Deploy with retry ---
Write-Host "[4/6] Deploying worker..." -ForegroundColor Yellow
$deployed = $false
for ($i = 0; $i -le $maxRetries; $i++) {
  if ($i -gt 0) { Write-Host "  Retry $i/$maxRetries..." -ForegroundColor Yellow }
  cmd /c "npx wrangler deploy" 2>&1
  if ($LASTEXITCODE -eq 0) { $deployed = $true; break }
}
if (-not $deployed) {
  Write-Host "❌ Deploy failed after $maxRetries retries. Abort." -ForegroundColor Red
  exit 1
}
Write-Host "  ✅ Deploy OK" -ForegroundColor Green

# --- 4. Health check ---
Write-Host "[5/6] Health check..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$workerUrl = (npx wrangler deploy --dry-run 2>&1 | Select-String "https://").Matches.Value
if (-not $workerUrl) {
  # Extraer URL del deploy anterior
  $workerUrl = "https://clinica-tms-api.terapiamagneticatranscraneal.workers.dev"
}
try {
  $health = Invoke-RestMethod -Uri "$workerUrl/api/health" -TimeoutSec 10
  if ($health.status -eq "ok") {
    Write-Host "  ✅ Health: OK (db: $($health.db), latency: $($health.dbLatency)ms)" -ForegroundColor Green
  } else {
    Write-Host "  ⚠️ Health: $($health.status)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "  ⚠️ Health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

# --- 5. Summary ---
Write-Host ""
Write-Host "[6/6] Deploy summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  URL:  https://clinica-tms-api.terapiamagneticatranscraneal.workers.dev" -ForegroundColor White
Write-Host "  API:  /api/health, /api/auth/*, /api/patients, /api/therapists, /api/appointments" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Deploy completado" -ForegroundColor Green
