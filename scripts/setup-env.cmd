@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."
if exist ".env.azaleia" (
  copy /Y ".env.azaleia" ".env" >nul
  echo [ok] .env actualizado desde .env.azaleia
  endlocal & exit /b 0
) else (
  echo [err] No existe .env.azaleia
  endlocal & exit /b 1
)
