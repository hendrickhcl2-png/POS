# ============================================================
#  Fifty Tech POS — Instalación inicial en Windows
#  Ejecutar UNA SOLA VEZ como Administrador
# ============================================================

$projectDir = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   Fifty Tech POS — Configuracion Windows  " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Instalar PM2 globalmente ──────────────────────────────
Write-Host "[1/5] Instalando PM2..." -ForegroundColor Yellow
npm install -g pm2
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al instalar PM2. Asegurate de tener Node.js instalado." -ForegroundColor Red
    exit 1
}

# ── 2. Crear carpeta de logs ─────────────────────────────────
Write-Host "[2/5] Creando carpeta de logs..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null

# ── 3. Arrancar el servidor con PM2 ─────────────────────────
Write-Host "[3/5] Iniciando servidor..." -ForegroundColor Yellow
Set-Location $projectDir
pm2 start ecosystem.config.js
pm2 save

# ── 4. Tarea de inicio automático al encender Windows ────────
Write-Host "[4/5] Configurando inicio automatico con Windows..." -ForegroundColor Yellow

$startAction   = New-ScheduledTaskAction `
    -Execute "pm2.cmd" `
    -Argument "resurrect" `
    -WorkingDirectory $projectDir

$startTrigger  = New-ScheduledTaskTrigger -AtStartup
$startSettings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
    -StartWhenAvailable $true

Register-ScheduledTask `
    -TaskName "FiftyTech POS - Inicio" `
    -Action   $startAction `
    -Trigger  $startTrigger `
    -Settings $startSettings `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host "   Tarea creada: el servidor arranca solo al encender la PC." -ForegroundColor Green

# ── 5. Tarea de actualización diaria a las 9:00am ────────────
Write-Host "[5/5] Configurando actualizacion automatica a las 9:00am..." -ForegroundColor Yellow

$updateScript  = "$projectDir\scripts\update.ps1"
$updateAction  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -NonInteractive -File `"$updateScript`"" `
    -WorkingDirectory $projectDir

$updateTrigger = New-ScheduledTaskTrigger -Daily -At "09:00"
$updateSettings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 10) `
    -StartWhenAvailable $true

Register-ScheduledTask `
    -TaskName "FiftyTech POS - Actualizacion" `
    -Action   $updateAction `
    -Trigger  $updateTrigger `
    -Settings $updateSettings `
    -RunLevel Highest `
    -Force | Out-Null

Write-Host "   Tarea creada: actualizacion todos los dias a las 9:00am." -ForegroundColor Green

# ── Resumen ──────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   Instalacion completada exitosamente      " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Servidor:       http://localhost:3000" -ForegroundColor White
Write-Host "  Actualizacion:  todos los dias a las 9:00am" -ForegroundColor White
Write-Host "  Logs:           $projectDir\logs\" -ForegroundColor White
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "  pm2 status           -> ver estado del servidor"
Write-Host "  pm2 logs             -> ver logs en tiempo real"
Write-Host "  pm2 restart fifty-tech-pos  -> reiniciar manualmente"
Write-Host ""
