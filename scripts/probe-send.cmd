@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0\.."

rem ====== CONFIG BÁSICA (ajusta si quieres) ======
if "%OPENLINE%"=="" set "OPENLINE=154"
if "%TEST_PHONE%"=="" set "TEST_PHONE=51918131082"
if "%CONNECTOR%"=="" set "CONNECTOR=wa_cloud_custom"

rem ====== Carga token y endpoint desde .runtime\b24-oauth.json ======
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.access_token"`) do set "B24_TOK=%%A"
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.client_endpoint"`) do set "B24_EP=%%A"
if "%B24_EP%"=="" set "B24_EP=https://azaleia-peru.bitrix24.es/rest/"

if "%B24_TOK%"=="" (
  echo [ERROR] No hay access_token en .runtime\b24-oauth.json
  exit /b 1
)

if not exist .runtime md .runtime
set "LOG=.runtime\sendlog.txt"
del /q "%LOG%" 2>nul

echo ===== PROBE START %DATE% %TIME% =====>>"%LOG%"
echo EP=%B24_EP% >>"%LOG%"
echo CONNECTOR=%CONNECTOR% LINE=%OPENLINE% PHONE=%TEST_PHONE% >>"%LOG%"
echo.>>"%LOG%"

rem ====== Helper timestamp ======
for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "[int][double]::Parse((Get-Date).ToUniversalTime().Subtract([datetime]'1970-01-01').TotalSeconds)"`) do set "NOW_TS=%%S"

rem === Caso 1: message[type]=message + text (chat.id) =====
set "MSGID=wamid.P1.%RANDOM%%RANDOM%"
echo === CASE1 chat+message[type=message]+text  MSGID=%MSGID%  ===>>"%LOG%"
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "MESSAGES[0][chat][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][message][id]=%MSGID%" ^
  --data-urlencode "MESSAGES[0][message][type]=message" ^
  --data-urlencode "MESSAGES[0][message][text]=Hola CASE1" ^
  --data-urlencode "auth=%B24_TOK%" >>"%LOG%"
echo.>>"%LOG%"
echo.>>"%LOG%"

rem === Caso 2: user.id en vez de chat.id =====
set "MSGID=wamid.P2.%RANDOM%%RANDOM%"
echo === CASE2 user+message[type=message]+text  MSGID=%MSGID%  ===>>"%LOG%"
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "MESSAGES[0][user][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][message][id]=%MSGID%" ^
  --data-urlencode "MESSAGES[0][message][type]=message" ^
  --data-urlencode "MESSAGES[0][message][text]=Hola CASE2" ^
  --data-urlencode "auth=%B24_TOK%" >>"%LOG%"
echo.>>"%LOG%"
echo.>>"%LOG%"

rem === Caso 3: chat+user juntos =====
set "MSGID=wamid.P3.%RANDOM%%RANDOM%"
echo === CASE3 chat+user juntos  MSGID=%MSGID%  ===>>"%LOG%"
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "MESSAGES[0][chat][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][user][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][message][id]=%MSGID%" ^
  --data-urlencode "MESSAGES[0][message][type]=message" ^
  --data-urlencode "MESSAGES[0][message][text]=Hola CASE3" ^
  --data-urlencode "auth=%B24_TOK%" >>"%LOG%"
echo.>>"%LOG%"
echo.>>"%LOG%"

rem === Caso 4: agregar date[timestamp] =====
set "MSGID=wamid.P4.%RANDOM%%RANDOM%"
echo === CASE4 chat + date[timestamp]  MSGID=%MSGID%  ===>>"%LOG%"
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "MESSAGES[0][chat][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][message][id]=%MSGID%" ^
  --data-urlencode "MESSAGES[0][message][type]=message" ^
  --data-urlencode "MESSAGES[0][message][date][timestamp]=%NOW_TS%" ^
  --data-urlencode "MESSAGES[0][message][text]=Hola CASE4" ^
  --data-urlencode "auth=%B24_TOK%" >>"%LOG%"
echo.>>"%LOG%"
echo.>>"%LOG%"

rem === Caso 5: estructura “messages” (plural) dentro de item (algunos forks lo exigen) =====
set "MSGID=wamid.P5.%RANDOM%%RANDOM%"
echo === CASE5 item.messages[0] (compat forks)  MSGID=%MSGID%  ===>>"%LOG%"
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "MESSAGES[0][chat][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][messages][0][id]=%MSGID%" ^
  --data-urlencode "MESSAGES[0][messages][0][type]=message" ^
  --data-urlencode "MESSAGES[0][messages][0][text]=Hola CASE5" ^
  --data-urlencode "auth=%B24_TOK%" >>"%LOG%"
echo.>>"%LOG%"
echo.>>"%LOG%"

rem === Caso 6: incluir connector_message para marcar origen =====
set "MSGID=wamid.P6.%RANDOM%%RANDOM%"
echo === CASE6 connector_message + chat  MSGID=%MSGID%  ===>>"%LOG%"
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "MESSAGES[0][chat][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][message][id]=%MSGID%" ^
  --data-urlencode "MESSAGES[0][message][type]=message" ^
  --data-urlencode "MESSAGES[0][message][text]=Hola CASE6" ^
  --data-urlencode "MESSAGES[0][connector_message][origin]=bot" ^
  --data-urlencode "auth=%B24_TOK%" >>"%LOG%"
echo.>>"%LOG%"
echo ===== PROBE END =====>>"%LOG%"

echo.
echo Hecho. Revisa ".runtime\sendlog.txt"
endlocal
