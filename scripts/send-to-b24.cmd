@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0\.."

rem === Config locales ===
if "%TEST_PHONE%"=="" set "TEST_PHONE=51918131082"
if "%CONNECTOR%"==""  set "CONNECTOR=wa_cloud_custom"
if "%OPENLINE%"==""   set "OPENLINE=154"

if not exist ".runtime\b24-oauth.json" (
  echo [ERR] Falta .runtime\b24-oauth.json
  exit /b 1
)

for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.client_endpoint"`) do set "B24_EP=%%A"
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.access_token"`) do set "B24_TOK=%%A"

if "%B24_EP%"=="" (
  for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; 'https://'+$j.domain+'/rest/'"`) do set "B24_EP=%%A"
)

set MSGID=wamid.TEST.%DATE:~6,4%%DATE:~3,2%%DATE:~0,2%-%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set MSGID=%MSGID: =0%

echo.
echo === Probando A) chat + message ===
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "MESSAGES[0][chat][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][message][id]=%MSGID%-A" ^
  --data-urlencode "MESSAGES[0][message][text]=hola (A chat+message)" ^
  --data-urlencode "auth=%B24_TOK%"
echo.

echo.
echo === Probando B) user + message ===
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "MESSAGES[0][user][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][user][name]=Christian" ^
  --data-urlencode "MESSAGES[0][message][id]=%MSGID%-B" ^
  --data-urlencode "MESSAGES[0][message][text]=hola (B user+message)" ^
  --data-urlencode "auth=%B24_TOK%"
echo.

echo.
echo === Probando C) chat + user + message ===
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  --data-urlencode "CONNECTOR=%CONNECTOR%" ^
  --data-urlencode "LINE=%OPENLINE%" ^
  --data-urlencode "MESSAGES[0][chat][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][user][id]=%TEST_PHONE%" ^
  --data-urlencode "MESSAGES[0][user][name]=Christian" ^
  --data-urlencode "MESSAGES[0][message][id]=%MSGID%-C" ^
  --data-urlencode "MESSAGES[0][message][text]=hola (C chat+user+message)" ^
  --data-urlencode "auth=%B24_TOK%"
echo.

echo === FIN ===
endlocal
