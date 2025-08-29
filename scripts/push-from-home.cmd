@echo off
setlocal
cd /d "%~dp0\.."
git add .
git commit -m "sync: %DATE% %TIME% bootstrap update"
git push
[ok] cambios subidos a origin/main
endlocal
