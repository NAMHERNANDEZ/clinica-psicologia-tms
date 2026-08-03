# pipeline.ps1 — Pipeline de despliegue completo (Fase 5)
# Ejecutar desde la carpeta worker/
# Cada etapa bloquea el despliegue si falla.
# Uso: .\scripts\pipeline.ps1 [-SkipDeploy] [-SkipTests] [-Env "production"]

param(
  [switch]$SkipDeploy,
  [switch]$SkipTests,
  [string]$Env = "production"
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date
$results = @()  # @{ stage, status, duration }

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
    Write-Host "  $([char]0x2705) $name completado ($($duration.TotalSeconds.ToString('0.0'))s)" -ForegroundColor Green
    $results += @{ stage = $name; status = "PASS"; duration = $duration.TotalSeconds.ToString('0.0') }
  } catch {
    $duration = (Get-Date) - $t
    Write-Host "  $([char]0x274C) $name FALLIDO: $_" -ForegroundColor Red
    $results += @{ stage = $name; status = "FAIL"; duration = $duration.TotalSeconds.ToString('0.0') }
    exit 1
  }
}

# ==========================================
# STAGE 1: TypeScript Typecheck
# ==========================================
Run-Stage 1 "TypeScript Typecheck" {
  node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run typecheck
  if ($LASTEXITCODE -ne 0) { throw "TypeScript errors found" }
}

# ==========================================
# STAGE 2: Environment Validation
# ==========================================
Run-Stage 2 "Environment Validation" {
  node scripts/check-env.js
  if ($LASTEXITCODE -ne 0) { throw "Environment validation failed" }
}

# ==========================================
# STAGE 3: Database Validation
# ==========================================
Run-Stage 3 "Database Validation" {
  node scripts/check-db.js
  if ($LASTEXITCODE -ne 0) { throw "Database validation failed" }
}

# ==========================================
# STAGE 4: Unit Tests
# ==========================================
if (-not $SkipTests) {
  Run-Stage 4 "Unit Tests" {
    node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run test
    if ($LASTEXITCODE -ne 0) { throw "Tests failed" }
  }
} else {
  Write-Host "`n[4] Unit Tests (SKIPPED)" -ForegroundColor Yellow
  $results += @{ stage = "Unit Tests"; status = "SKIP"; duration = "0.0" }
}

# ==========================================
# STAGE 5: Security Check
# ==========================================
Run-Stage 5 "Security Check" {
  node scripts/security-check.js
  if ($LASTEXITCODE -ne 0) { throw "Security check failed" }
}

# ==========================================
# STAGE 6: Compliance Check
# ==========================================
Run-Stage 6 "Compliance Check" {
  node scripts/compliance-check.js
  if ($LASTEXITCODE -ne 0) { throw "Compliance check failed" }
}

# ==========================================
# STAGE 7: Migration Validation
# ==========================================
Run-Stage 7 "Migration Validation" {
  node scripts/migration-check.js
  if ($LASTEXITCODE -ne 0) { throw "Migration validation failed" }
}

# ==========================================
# STAGE 8: Build (dry-run)
# ==========================================
Run-Stage 8 "Build (dry-run)" {
  node ".\node_modules\wrangler\wrangler-dist\cli.js" deploy --dry-run 2>&1
  if ($LASTEXITCODE -ne 0) { throw "Build failed" }
}

# ==========================================
# STAGE 9: Deploy
# ==========================================
if (-not $SkipDeploy) {
  Run-Stage 9 "Deploy" {
    $env:CLOUDFLARE_ENV = $Env
    node ".\node_modules\wrangler\wrangler-dist\cli.js" deploy --env $Env 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Deploy failed" }
  }
} else {
  Write-Host "`n[9] Deploy (SKIPPED)" -ForegroundColor Yellow
  $results += @{ stage = "Deploy"; status = "SKIP"; duration = "0.0" }
}

# ==========================================
# STAGE 10: Smoke Test
# ==========================================
Run-Stage 10 "Smoke Test" {
  Start-Sleep -Seconds 3
  $baseUrl = "https://clinica-tms-api.terapiamagneticatranscraneal.workers.dev"

  # Health check
  $health = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing -TimeoutSec 15
  $healthData = $health.Content | ConvertFrom-Json
  if ($healthData.data.status -ne "ok") { throw "Health check failed: $($healthData.data.status)" }
  Write-Host "  Health: OK (db: $($healthData.data.db), latency: $($healthData.data.dbLatency)ms)" -ForegroundColor Green

  # Login test
  $loginBody = @{ email = "admin@clinica.com"; password = "Admin123!" } | ConvertTo-Json
  $login = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15
  $token = ($login.Content | ConvertFrom-Json).data.accessToken
  if (-not $token) { throw "Login failed: no token" }
  Write-Host "  Auth: OK (token recibido)" -ForegroundColor Green

  # Dashboard
  $headers = @{ Authorization = "Bearer $token" }
  $dash = Invoke-WebRequest -Uri "$baseUrl/api/compliance/dashboard" -Headers $headers -UseBasicParsing -TimeoutSec 15
  $dashData = $dash.Content | ConvertFrom-Json
  if (-not $dashData.success) { throw "Dashboard endpoint failed" }
  Write-Host "  Dashboard: OK (score: $($dashData.data.overallScore))" -ForegroundColor Green

  # Backups endpoint
  $backups = Invoke-WebRequest -Uri "$baseUrl/api/backups/latest" -Headers $headers -UseBasicParsing -TimeoutSec 15
  $backupsData = $backups.Content | ConvertFrom-Json
  if (-not $backupsData.success) { throw "Backups endpoint failed" }
  Write-Host "  Backups: OK" -ForegroundColor Green

  Write-Host "  $([char]0x2705) Smoke test PASSED" -ForegroundColor Green
}

# ==========================================
# STAGE 11: Release (git tag)
# ==========================================
Run-Stage 11 "Release Tag" {
  $version = (Get-Content package.json | ConvertFrom-Json).version
  $tag = "v$version"
  $now = Get-Date -Format "yyyy-MM-dd-HHmm"
  $existing = git tag -l "$tag-*" 2>$null
  $count = ($existing | Measure-Object).Length
  $releaseTag = "$tag-build$count-$now"

  git tag -a $releaseTag -m "Pipeline deploy $releaseTag" 2>$null
  if ($LASTEXITCODE -ne 0) { throw "Failed to create git tag" }

  git push origin $releaseTag 2>$null
  Write-Host "  Tag: $releaseTag" -ForegroundColor Green
}

# ==========================================
# SUMMARY
# ==========================================
$totalDuration = (Get-Date) - $startTime
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " PIPELINE SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
foreach ($r in $results) {
  $icon = if ($r.status -eq "PASS") { "$([char]0x2705)" } elseif ($r.status -eq "SKIP") { "$([char]0x23ED)" } else { "$([char]0x274C)" }
  Write-Host " $icon $($r.stage.PadRight(25)) $($r.status.PadRight(6)) $($r.duration)s" -ForegroundColor $(if ($r.status -eq "PASS") { "Green" } elseif ($r.status -eq "SKIP") { "Yellow" } else { "Red" })
}
Write-Host "----------------------------------------" -ForegroundColor Gray
$allPassed = ($results | Where-Object { $_.status -eq "FAIL" } | Measure-Object).Length -eq 0
if ($allPassed) {
  Write-Host " $([char]0x2705) PIPELINE COMPLETADO en $($totalDuration.TotalSeconds.ToString('0.0'))s" -ForegroundColor Green
  Write-Host "  URL: https://clinica-tms-api.terapiamagneticatranscraneal.workers.dev" -ForegroundColor White
} else {
  Write-Host " $([char]0x274C) PIPELINE FALLIDO en $($totalDuration.TotalSeconds.ToString('0.0'))s" -ForegroundColor Red
  exit 1
}
Write-Host "========================================`n" -ForegroundColor Cyan
