@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Скачиваю последнюю версию мода... ===
git pull
if errorlevel 1 (
  echo.
  echo Не удалось обновить. Проверьте, что установлен Git и есть интернет.
  pause
  exit /b 1
)
echo.
echo === Собираю и запускаю Minecraft... ===
call gradlew.bat runClient
pause
