@echo off
rem ======================================================
rem DEPLOY-12.6.BAT – Deploy FASE 12.6 Seguimiento clínico
rem ---------------------------------------------------------------
rem This script should:
rem   1. Apply any pending migrations for phase 12.6
rem   2. Build frontend assets
rem   3. Deploy worker
rem   4. Return exit code 0 on success
rem -------------------------------------------------------------
echo Deploying FASE 12.6 – Seguimiento clínico
rem Insert actual migration/run steps here
rem Example:
rem   wrangler d1 execute clinica-tms-db --remote --file ./migrations/0033_followup.sql
rem   npm run build
rem   wrangler publish
exit 0