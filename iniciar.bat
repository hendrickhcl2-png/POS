@echo off
title Fifty Tech POS
color 0A
cd /d "%~dp0"

echo.
echo  ================================
echo   Fifty Tech POS - Iniciando...
echo  ================================
echo.

:: Verificar Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js no esta instalado.
    echo  Descargalo desde: https://nodejs.org
    pause
    exit /b 1
)

:: Verificar git
git -v >nul 2>&1
if %errorlevel% neq 0 goto :iniciar

:: Buscar actualizaciones
echo  Buscando actualizaciones...
git pull origin main > "%~dp0logs\update.log" 2>&1
findstr /C:"Already up to date" "%~dp0logs\update.log" >nul
if %errorlevel% == 0 (
    echo  Sin cambios. El servidor esta al dia.
    goto :iniciar
)

echo  Actualizacion encontrada. Instalando dependencias...
npm install --production
echo  Dependencias actualizadas.

:iniciar
:: Instalar dependencias si no existen
if not exist "node_modules" (
    echo  Instalando dependencias por primera vez...
    npm install
    echo.
)

:: Iniciar o reiniciar con PM2 si esta disponible
pm2 -v >nul 2>&1
if %errorlevel% neq 0 goto :sinpm2

pm2 describe fifty-tech-pos >nul 2>&1
if %errorlevel% == 0 (
    echo  Reiniciando servidor...
    pm2 restart fifty-tech-pos
) else (
    echo  Iniciando servidor...
    pm2 start ecosystem.config.js
)
goto :abrir

:sinpm2
echo  Iniciando servidor sin PM2...
start /b node server/server.js
timeout /t 2 /nobreak >nul

:abrir
echo  Abriendo navegador...
start http://localhost:3000

echo.
echo  Sistema corriendo en http://localhost:3000
echo.
pause
