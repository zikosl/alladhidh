@echo off
setlocal

REM === Change this path ===
set "PROJECT_DIR=C:\Users\X\Documents\folder"

echo Moving to project folder...
cd /d "%PROJECT_DIR%" || (
    echo ERROR: Folder not found
    pause
    exit /b 1
)

echo Pulling latest code...
git pull || (
    echo ERROR: git pull failed
    pause
    exit /b 1
)

echo Stopping containers...
docker compose --env-file .env.production -f docker-compose.prod.yml down || (
    echo ERROR: docker compose down failed
    pause
    exit /b 1
)

echo Rebuilding and starting containers...
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build || (
    echo ERROR: docker compose up failed
    pause
    exit /b 1
)

echo ==================================
echo Update completed successfully
echo ==================================

pause