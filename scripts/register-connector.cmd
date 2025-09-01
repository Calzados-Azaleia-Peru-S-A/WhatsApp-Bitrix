@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem === Ubicación del proyecto (carpeta del script) ===
set "SCRIPT_DIR=%~dp0"
rem Si el script está en .\scripts\, subimos un nivel al root:
for %%# in ("%SCRIPT_DIR%..") do set "PROJ_DIR=%%~f#"
set "JSON_PATH=%PROJ_DIR%\.runtime\b24-oauth.json"

if not exist "%JSON_PATH%" (
  echo [ERROR] No encuentro %JSON_PATH%
  echo Ejecuta primero tu app y abre el tile (para que ONAPPINSTALL cree el token).
  goto :eof
)

rem === Cargar token y endpoint desde el JSON ===
for /f "usebackq delims=" %%T in (`powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$j=Get-Content '%JSON_PATH%' | ConvertFrom-Json; $j.access_token"`) do set "B24_TOK=%%T"

for /f "usebackq delims=" %%E in (`powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$j=Get-Content '%JSON_PATH%' | ConvertFrom-Json; $j.client_endpoint"`) do set "B24_EP=%%E"

if not defined B24_TOK (
  echo [ERROR] No pude leer access_token del JSON.
  goto :eof
)
if not defined B24_EP (
  echo [ERROR] No pude leer client_endpoint del JSON.
  goto :eof
)

rem Mostrar lo que cargamos (token enmascarado)
set "MASKED_TOK=!B24_TOK:~0,8!********"
echo [OK] client_endpoint: !B24_EP!
echo [OK] access_token:    !MASKED_TOK!

set "LINE=154"
set "CONN=local"
set "NAME=WhatsApp Azaleia (Local)"

echo.
echo === UNREGISTER (ignora si falla) ===
curl -S -s -X POST "!B24_EP!imconnector.unregister" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "LINE=!LINE!" ^
  --data-urlencode "CONNECTOR=!CONN!" ^
  --data-urlencode "auth=!B24_TOK!"
echo.

echo === REGISTER ===
curl -S -s -X POST "!B24_EP!imconnector.register" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "LINE=!LINE!" ^
  --data-urlencode "CONNECTOR=!CONN!" ^
  --data-urlencode "NAME=!NAME!" ^
  --data-urlencode "auth=!B24_TOK!"
echo.

echo === ACTIVATE ===
curl -S -s -X POST "!B24_EP!imconnector.activate" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "LINE=!LINE!" ^
  --data-urlencode "CONNECTOR=!CONN!" ^
  --data-urlencode "ACTIVE=Y" ^
  --data-urlencode "auth=!B24_TOK!"
echo.

echo === STATUS (debe salir CONFIGURED:true y STATUS:true) ===
curl -S -s -X POST "!B24_EP!imconnector.status" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "LINE=!LINE!" ^
  --data-urlencode "CONNECTOR=!CONN!" ^
  --data-urlencode "auth=!B24_TOK!"
echo.

endlocal
