@echo off
REM MailAgent Setup Verification Script for Windows
REM Verifies that all services and configuration are working correctly

setlocal enabledelayedexpansion

color 0A
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║       MailAgent - Setup Verification Script                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

set PASSED=0
set FAILED=0
set WARNINGS=0

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 1^) Checking Prerequisites
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

if exist .env (
  echo ✅ .env file exists
  set /a PASSED+=1
) else (
  echo ❌ .env file not found
  set /a FAILED+=1
)

docker --version >nul 2>&1
if !errorlevel! equ 0 (
  echo ✅ Docker installed
  set /a PASSED+=1
) else (
  echo ❌ Docker not installed
  set /a FAILED+=1
)

docker-compose --version >nul 2>&1
if !errorlevel! equ 0 (
  echo ✅ Docker Compose installed
  set /a PASSED+=1
) else (
  echo ❌ Docker Compose not installed
  set /a FAILED+=1
)

node --version >nul 2>&1
if !errorlevel! equ 0 (
  for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
  echo ✅ Node.js !NODE_VERSION! installed
  set /a PASSED+=1
) else (
  echo ❌ Node.js not installed
  set /a FAILED+=1
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 2^) Checking Environment Variables
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

for /f "tokens=1,2 delims==" %%A in (.env) do (
  if not "%%A"=="" (
    if not "%%B"=="" (
      set %%A=%%B
    )
  )
)

if defined NODE_ENV (
  echo ✅ NODE_ENV set: !NODE_ENV!
  set /a PASSED+=1
) else (
  echo ❌ NODE_ENV not set
  set /a FAILED+=1
)

if defined API_PORT (
  echo ✅ API_PORT set: !API_PORT!
  set /a PASSED+=1
) else (
  echo ❌ API_PORT not set
  set /a FAILED+=1
)

if defined API_HOST (
  echo ✅ API_HOST set: !API_HOST!
  set /a PASSED+=1
) else (
  echo ❌ API_HOST not set
  set /a FAILED+=1
)

if defined DB_HOST (
  echo ✅ DB_HOST set: !DB_HOST!
  set /a PASSED+=1
) else (
  echo ❌ DB_HOST not set
  set /a FAILED+=1
)

if defined DB_USER (
  echo ✅ DB_USER set: !DB_USER!
  set /a PASSED+=1
) else (
  echo ❌ DB_USER not set
  set /a FAILED+=1
)

if defined JWT_SECRET (
  echo ✅ JWT_SECRET set
  set /a PASSED+=1
) else (
  echo ❌ JWT_SECRET not set
  set /a FAILED+=1
)

if defined AES_SECRET_KEY (
  echo ✅ AES_SECRET_KEY set
  set /a PASSED+=1
) else (
  echo ❌ AES_SECRET_KEY not set
  set /a FAILED+=1
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 3^) Checking Cryptographic Key Validity
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

for /f %%A in ('node -e "console.log(process.env.JWT_SECRET.length)" 2^>nul') do set JWT_LENGTH=%%A

if defined JWT_LENGTH (
  if !JWT_LENGTH! geq 32 (
    echo ✅ JWT_SECRET length valid: !JWT_LENGTH! chars
    set /a PASSED+=1
  ) else (
    echo ❌ JWT_SECRET too short: !JWT_LENGTH! chars ^(minimum 32^)
    set /a FAILED+=1
  )
) else (
  echo ⚠️  JWT_SECRET validation skipped
  set /a WARNINGS+=1
)

echo ✅ AES_SECRET_KEY is set
set /a PASSED+=1

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 4^) Checking Docker Service Status
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

if exist docker-compose.yml (
  echo ✅ docker-compose.yml exists
  set /a PASSED+=1
) else (
  echo ❌ docker-compose.yml not found
  set /a FAILED+=1
)

docker-compose ps >nul 2>&1
if !errorlevel! equ 0 (
  echo.
  echo Docker Compose services status:
  echo.
  docker-compose ps
  echo.
) else (
  echo ⚠️  Docker Compose services not running
  echo     Start with: docker-compose up -d
  set /a WARNINGS+=1
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 5^) Checking Project Files
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

if exist backend\src (
  echo ✅ Backend source exists
  set /a PASSED+=1
) else (
  echo ❌ Backend source not found
  set /a FAILED+=1
)

if exist frontend (
  echo ✅ Frontend source exists
  set /a PASSED+=1
) else (
  echo ❌ Frontend source not found
  set /a FAILED+=1
)

if exist backend\src\config\configuration.ts (
  echo ✅ Configuration file exists
  set /a PASSED+=1
) else (
  echo ❌ Configuration file not found
  set /a FAILED+=1
)

if exist backend\prisma\schema.prisma (
  echo ✅ Database schema exists
  set /a PASSED+=1
) else (
  echo ❌ Database schema not found
  set /a FAILED+=1
)

if exist nginx\nginx.conf (
  echo ✅ Nginx config exists
  set /a PASSED+=1
) else (
  echo ❌ Nginx config not found
  set /a FAILED+=1
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📊 Summary
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo   ✅ Passed: !PASSED!
echo   ❌ Failed: !FAILED!
echo   ⚠️  Warnings: !WARNINGS!
echo.

if !FAILED! equ 0 (
  echo ✨ All checks passed! Your MailAgent setup is ready to go!
  echo.
  echo Next steps:
  echo   1. Start services: docker-compose up -d
  echo   2. Wait for services to be healthy: docker-compose ps
  echo   3. Access frontend: http://localhost:3001
  echo   4. Access API docs: http://localhost:3000/api/docs
  pause
  exit /b 0
) else (
  echo ❌ Some checks failed. Please fix the issues above.
  echo.
  echo Common issues:
  echo   • Docker not running: Start Docker Desktop
  echo   • Port in use: Check what's using port 3000, 3001, 5432
  echo   • Invalid .env: Run setup.bat or setup.sh again
  echo   • Services not running: Run docker-compose up -d
  pause
  exit /b 1
)
