@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.access_token"`) do set "B24_TOK=%%A"
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$j=Get-Content '.runtime/b24-oauth.json' | ConvertFrom-Json; $j.client_endpoint"`) do set "B24_EP=%%A"
if "%B24_EP%"=="" set "B24_EP=https://azaleia-peru.bitrix24.es/rest/"

if not exist .runtime md .runtime
curl -s "%B24_EP%methods.json?auth=%B24_TOK%" > .runtime\methods.json

echo === imconnector.* presentes ===
type .runtime\methods.json | find /i "\"imconnector." 

echo.
echo === openlines.* presentes ===
type .runtime\methods.json | find /i "\"imopenlines."

echo.
echo (archivo completo en .runtime\methods.json)
endlocal
