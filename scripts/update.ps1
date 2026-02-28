# ============================================================
#  Fifty Tech POS — Script de actualización automática
#  Corre todos los días a las 9:00am vía Task Scheduler
# ============================================================

$projectDir = Split-Path -Parent $PSScriptRoot
$logFile    = "$projectDir\logs\update.log"

# Crear carpeta de logs si no existe
if (-not (Test-Path "$projectDir\logs")) {
    New-Item -ItemType Directory -Path "$projectDir\logs" | Out-Null
}

function Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Add-Content -Path $logFile -Value $line
    Write-Host $line
}

Log "====== Iniciando actualización ======"
Set-Location $projectDir

# 1. Obtener cambios de GitHub
Log "Ejecutando git pull..."
$gitOutput = git pull origin main 2>&1
Log "Git: $gitOutput"

# 2. Solo reinstalar y reiniciar si hubo cambios reales
if ($gitOutput -match "Already up to date") {
    Log "Sin cambios. El servidor sigue corriendo sin interrupciones."
} else {
    Log "Cambios detectados. Instalando dependencias..."
    $npmOutput = npm install --production 2>&1
    Log "NPM: $npmOutput"

    Log "Reiniciando servidor con PM2..."
    $pm2Output = pm2 restart fifty-tech-pos 2>&1
    Log "PM2: $pm2Output"

    Log "Actualización aplicada correctamente."
}

Log "====== Fin de actualización ======"
Add-Content -Path $logFile -Value ""
