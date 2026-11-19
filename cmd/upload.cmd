@echo off
rem Uso: cmd/upload
rem Esegue git add . + commit con messaggio vuoto + push del branch corrente.

git add . || exit /b 1

git diff --cached --quiet
if not errorlevel 1 (
    echo Nessuna modifica da caricare.
    exit /b 0
)

git commit --allow-empty-message -m "" || exit /b 1
git push || exit /b 1
