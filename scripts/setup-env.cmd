@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

:: Siempre copiar .env.azaleia -> .env (forzado)
if exist ".env.azaleia" (
  copy /Y ".env.azaleia" ".env" >nul
  echo [ok] .env actualizado desde .env.azaleia
) else (
  echo [err] No existe .env.azaleia (no se pudo generar .env)
  exit /b 1
)
