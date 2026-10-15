# Crea en el escritorio un acceso directo "Fifty Tech POS" que abre el sistema
# en una ventana propia de Edge (modo app: sin barra de direcciones ni pestañas).
#
# Uso (desde la carpeta del proyecto):
#   powershell -ExecutionPolicy Bypass -File scripts\crear-acceso-directo.ps1
#
# En otra PC de la red, apuntando al servidor:
#   powershell -ExecutionPolicy Bypass -File scripts\crear-acceso-directo.ps1 -Url http://192.168.1.10:3000

param(
    [string]$Url = "http://localhost:3000",
    [string]$Nombre = "Fifty Tech POS"
)

$edge = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $edge) {
    Write-Host "No se encontró Microsoft Edge." -ForegroundColor Red
    exit 1
}

$icono = Join-Path $PSScriptRoot "..\public\images\fifty-tech.ico" | Resolve-Path -ErrorAction SilentlyContinue
$destino = Join-Path ([Environment]::GetFolderPath("Desktop")) "$Nombre.lnk"

$shell = New-Object -ComObject WScript.Shell
$acceso = $shell.CreateShortcut($destino)
$acceso.TargetPath = $edge
$acceso.Arguments = "--app=$Url --start-maximized"
$acceso.Description = $Nombre
if ($icono) { $acceso.IconLocation = "$icono,0" }
$acceso.Save()

Write-Host "Acceso directo creado en: $destino" -ForegroundColor Green
Write-Host "Abre: $Url"
