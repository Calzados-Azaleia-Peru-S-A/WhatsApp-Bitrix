@echo off
setlocal EnableExtensions

rem === Lee token/endpoint del JSON (OJO: doble % porque es un .cmd) ===
for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.access_token"`) do set "B24_TOK=%%T"
for /f "usebackq delims=" %%E in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.client_endpoint"`) do set "B24_EP=%%E"
if "%B24_EP%"=="" set "B24_EP=https://azaleia-peru.bitrix24.es/rest/"

rem === Ajusta TU dominio de bridge ===
set "APP_BASE=https://TU-DOMINIO-NGROK.ngrok-free.app"

rem === Línea y nombre del conector ===
set "OPENLINE=154"
set "CONNECTOR=wa_cloud_custom"

echo [1] Vincular el TILE (placement) para que aparezca en Contact Center
curl -s -X POST "%B24_EP%placement.bind" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "PLACEMENT=OPENLINES_CONNECTOR" ^
  --data-urlencode "HANDLER=%APP_BASE%/b24/connector-ui" ^
  --data-urlencode "TITLE=WA Cloud Custom" ^
  --data-urlencode "auth=%B24_TOK%"
echo.

echo [2] Activar el conector para la línea (si ya está, no pasa nada)
curl -s -X POST "%B24_EP%imconnector.activate" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "ACTIVE=Y" ^
  --data-urlencode "auth=%B24_TOK%"
echo.

echo [3] Estado del conector
curl -s -X POST "%B24_EP%imconnector.status" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "auth=%B24_TOK%"
echo.
endlocal
