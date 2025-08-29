@echo off
setlocal
cd /d "%~dp0\.."
echo [1/4] git pull...
git pull --rebase || goto :err
echo [2/4] npm install...
npm install || goto :err
echo [3/4] npm run dev...
start "b24-wsp dev" /D "%CD%" cmd /c "npm run dev"
echo [4/4] ngrok...
start "ngrok 3000" cmd /c "ngrok http --url=squirrel-talented-hermit.ngrok-free.app 3000"
echo [ok] listo.
goto :eof
:err
echo [err] fallo en paso anterior
exit /b 1
endlocal
