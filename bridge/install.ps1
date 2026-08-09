# Instala OpenCode Bridge para que arranque automaticamente con Windows
# Uso (PowerShell, como usuario normal):
#   powershell -ExecutionPolicy Bypass -File bridge\install.ps1
# Tambien crea un acceso directo en Inicio > Programas > Inicio.

$ErrorActionPreference = 'Stop'
$bridge = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = (Get-Command node.exe -ErrorAction Stop).Source
$startup = [Environment]::GetFolderPath('Startup')

# 1) Acceso directo en la carpeta de inicio
$lnk = Join-Path $startup 'OpenCodeBridge.lnk'
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = $node
$sc.Arguments = "`"$bridge\bridge.cjs`""
$sc.WorkingDirectory = $bridge
$sc.WindowStyle = 7  # minimizado
$sc.Description = 'OpenCode Bridge - cola local hacia OpenCode v2'
$sc.Save()
Write-Output "Acceso directo creado: $lnk"

# 2) Tarea programada (fallback, si la carpeta de inicio fallara)
#    Requiere permisos de administrador; si no se puede, el acceso directo de
#    Startup (paso 1) ya garantiza el arranque automatico.
$taskName = 'OpenCodeBridge'
try {
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Output "Tarea programada ya existe: $taskName"
    } else {
        $action = New-ScheduledTaskAction -Execute $node -Argument "`"$bridge\bridge.cjs`"" -WorkingDirectory $bridge
        $trigger = New-ScheduledTaskTrigger -AtLogOn
        $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 0) -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1)
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'OpenCode Bridge' | Out-Null
        Write-Output "Tarea programada creada: $taskName"
    }
} catch {
    Write-Output "AVISO: No se pudo crear la tarea programada (se necesita administrador). El acceso directo de Startup es suficiente: $startup"
}

# 3) Iniciar ahora (si no esta corriendo)
$running = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $node }
if (-not $running) {
    Start-Process -FilePath $node -ArgumentList "`"$bridge\bridge.cjs`"" -WorkingDirectory $bridge -WindowStyle Minimized
    Write-Output 'Bridge iniciado en segundo plano.'
} else {
    Write-Output 'Ya hay procesos node; verificando lock del bridge...'
}
Write-Output 'Instalacion completa.'

