@echo off
rem ==============================
rem DEPLOY-12.5.BAT – Deploy FASE 12.5 (Consentimientos avanzados)
rem ---------------------------------------------------------------
rem This script should:
rem   1. Apply migration 0032 (already done manually before)
rem   2. Run any pending DB migrations (if not auto)
rem   2. Build frontend assets
rem   3. Deploy worker
rem   4. Return exit code 0 on success
rem   Otherwise exit with non-zero to trigger retry logic
rem -------------------------------------------------------------
echo Deploying FASE 12.5 – Consentimientos avanzados
rem Insert actual migration/run steps here
rem Example:
rem   wrangler d1 execute clinica-tms-db --remote --file ./migrations/0032_consents_advanced.sql
rem   wrangler publish
rem   npm run build
rem   wrangler deploy
exit 0