@echo off
rem =====================================================
rem  OpenCode Bridge - worker persistente
rem  Se lanza en background (sin ventana) via instalador
rem =====================================================
cd /d "%~dp0"
start /min "" "C:\Program Files\nodejs\node.exe" "%~dp0bridge.cjs"
exit /b 0
