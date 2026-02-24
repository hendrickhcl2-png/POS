@echo off
title Fifty Tech POS
color 0A

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

:: Instalar dependencias si no existen
if not exist "node_modules" (
    echo  Instalando dependencias por primera vez...
    npm install
    echo.
)

:: Iniciar servidor en segundo plano
echo  Iniciando servidor...
start /b node server/server.js

:: Esperar a que el servidor arranque
timeout /t 2 /nobreak >nul

:: Abrir el navegador
echo  Abriendo navegador...
start http://localhost:3000

echo.
echo  El sistema esta corriendo en http://localhost:3000
echo  Cierra esta ventana para apagar el servidor.
echo.
pause
