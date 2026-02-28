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
Write-Host "[1/3] Instalando PM2..." -ForegroundColor Yellow
npm install -g pm2
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al instalar PM2. Asegurate de tener Node.js instalado." -ForegroundColor Red
    exit 1
}

# ── 2. Crear carpeta de logs ─────────────────────────────────
Write-Host "[2/3] Creando carpeta de logs..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$projectDir\logs" -Force | Out-Null

# ── 3. Arrancar el servidor con PM2 ─────────────────────────
Write-Host "[3/3] Iniciando servidor..." -ForegroundColor Yellow
Set-Location $projectDir
pm2 start ecosystem.config.js
pm2 save

# ── Resumen ──────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   Instalacion completada exitosamente      " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Servidor:       http://localhost:3000" -ForegroundColor White
Write-Host "  Logs:           $projectDir\logs\" -ForegroundColor White
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "  pm2 status           -> ver estado del servidor"
Write-Host "  pm2 logs             -> ver logs en tiempo real"
Write-Host "  pm2 restart fifty-tech-pos  -> reiniciar manualmente"
Write-Host ""
