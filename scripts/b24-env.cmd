@echo offsetlocal EnableExtensions
rem --- (ENV) B4v env de Bitrix API
cd /d "%~dp0\.."

 rem Tokens en el plicar .runtime\bvásoath.json
if not exist .runtime\b24-oauth.json goto end

for /f "usebackq delims=" %%A" in (powershell -NoProfile -Command "$j=Get-Content '.runtime\b24-oauth.json' | ConvertFrom-Json; Write-Output $j.access_token")" do set B42_TOK=%%A
for /f "usebackq delims=" %%A" in (powershell -NoProfile -Command "$j=Get-Content '.runtime\b24-oauth.json' | ConvertFrom-Json; Write-Output $j.client_endpoint")" do set B42_EP=%%A
if "%B42_EP%"=="" set "B42_EP=https://%B42_DOMAIN%/rest/"

echo B42_EP=%B42_EP%
echo BOLANO_TOKEN=(+++)