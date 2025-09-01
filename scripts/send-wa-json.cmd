@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

rem === Lee token y endpoint del archivo .runtime/b24-oauth.json ===
for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.access_token"`) do set "B24_TOK=%%T"
for /f "usebackq delims=" %%E in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.client_endpoint"`) do set "B24_EP=%%E"
if "%B24_EP%"=="" set "B24_EP=https://%B24_DOMAIN%/rest/"

rem === Ajusta estos 3 si fuese necesario ===
set "CONNECTOR=wa_cloud_custom"
set "OPENLINE=154"
set "TEST_PHONE=51918131082"

rem === Genera ID y timestamp ===
for /f "usebackq delims=" %%S in (`powershell -NoProfile -Command "[int][double]::Parse((Get-Date).ToUniversalTime().Subtract([datetime]'1970-01-01').TotalSeconds)"`) do set "NOW_TS=%%S"
set "MSGID=wamid.LOCAL.%RANDOM%%RANDOM%"

echo EP=%B24_EP%
echo LINE=%OPENLINE% CONNECTOR=%CONNECTOR% PHONE=%TEST_PHONE%
echo MSGID=%MSGID% NOW_TS=%NOW_TS%
echo.

rem === Construye JSON correcto (mensaje de texto simple) ===
rem Importante:
rem - user.id y chat.id en string
rem - message.id en string
rem - message.text obligatorio
rem - NO mandes date como numero plano si da error; prueba con objeto { "timestamp": NOW_TS } o quítalo
powershell -NoProfile -Command ^
  "$body = @{ CONNECTOR='%CONNECTOR%'; LINE='%OPENLINE%'; MESSAGES=@( @{ user=@{ id='%TEST_PHONE%' }; chat=@{ id='%TEST_PHONE%' }; message=@{ id='%MSGID%'; text='Hola desde JSON (Bitrix)'; } } ) }; $body | ConvertTo-Json -Depth 5 | Out-File -Encoding UTF8 '.runtime\imc_body.json'"

type ".runtime\imc_body.json"
echo.

rem === Enviar con Content-Type: application/json al endpoint directo del método ===
curl -s -X POST "%B24_EP%imconnector.send.messages" ^
  -H "Content-Type: application/json" ^
  -d "@.runtime\imc_body.json"

echo.
echo === FIN ===
endlocal
