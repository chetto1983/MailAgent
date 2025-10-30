@echo off
REM MailAgent Setup Script for Windows
REM This script generates cryptographic secrets and creates a .env file ready for local development

setlocal enabledelayedexpansion

color 0A
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         MailAgent - Local Development Setup                ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js %node version detected

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js !NODE_VERSION! detected
echo.

REM Check if .env already exists
if exist .env (
    echo ⚠️  .env already exists. Backing up to .env.backup
    copy .env .env.backup >nul
)

echo 🔐 Generating cryptographic secrets...
echo.

REM Generate JWT_SECRET (64 bytes = 512 bits)
for /f "tokens=*" %%i in ('node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"') do set JWT_SECRET=%%i
echo ✅ Generated JWT_SECRET ^(512 bits^)

REM Generate AES_SECRET_KEY (32 bytes base64 = 256 bits)
for /f "tokens=*" %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"') do set AES_SECRET_KEY=%%i
echo ✅ Generated AES_SECRET_KEY ^(256 bits^)

echo.
echo 📝 Creating .env file with base configuration...
echo.

REM Create .env file
(
echo # ===== ENVIRONMENT =====
echo NODE_ENV=development
echo LOG_LEVEL=debug
echo.
echo # ===== SERVER =====
echo API_PORT=3000
echo API_HOST=backend
echo.
echo # ===== DATABASE =====
echo DB_HOST=postgres
echo DB_PORT=5432
echo DB_USER=mailuser
echo DB_PASSWORD=mailpass
echo DB_NAME=mailagent
echo.
echo # ===== REDIS =====
echo REDIS_HOST=redis
echo REDIS_PORT=6379
echo.
echo # ===== JWT ^& AUTH =====
echo JWT_SECRET=!JWT_SECRET!
echo JWT_EXPIRATION=24h
echo OTP_EXPIRATION=900000
echo PASSWORD_RESET_EXPIRATION=900000
echo.
echo # ===== ENCRYPTION =====
echo AES_SECRET_KEY=!AES_SECRET_KEY!
echo.
echo # ===== OAUTH2 CREDENTIALS ^(Gmail^) =====
echo GMAIL_CLIENT_ID=your-gmail-client-id
echo GMAIL_CLIENT_SECRET=your-gmail-client-secret
echo.
echo # ===== OAUTH2 CREDENTIALS ^(Microsoft^) =====
echo MICROSOFT_CLIENT_ID=your-microsoft-client-id
echo MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
echo.
echo # ===== AI PROVIDER ^(Mistral^) =====
echo MISTRAL_API_KEY=your-mistral-api-key
echo MISTRAL_MODEL=mistral-large-latest
echo.
echo # ===== EMAIL PROVIDER =====
echo SMTP_HOST=mail-server
echo SMTP_PORT=587
echo SMTP_USER=mailuser
echo SMTP_PASSWORD=mailpass
echo SMTP_FROM_EMAIL=noreply
echo SMTP_FROM_DOMAIN=mailagent.local
echo.
echo # ===== EXTERNAL SERVICES =====
echo STT_PROVIDER=google
echo TTS_PROVIDER=piper
echo GOOGLE_STT_API_KEY=your-google-cloud-key
echo PIPER_LANGUAGE=it_IT
echo.
echo # ===== FRONTEND CONFIG =====
echo FRONTEND_URL=http://localhost:3001
echo FRONTEND_PORT=3001
) > .env

echo ✅ .env file created successfully
echo.
echo 📋 Configuration Summary:
echo   • JWT_SECRET: Generated ^(512 bits^)
echo   • AES_SECRET_KEY: Generated ^(256 bits^)
echo   • Database: postgres:5432 ^(mailuser/mailpass^)
echo   • Redis: redis:6379
echo   • API: http://localhost:3000 ^(development^)
echo   • Frontend: http://localhost:3001 ^(development^)
echo.
echo ⚠️  Next Steps:
echo   1. Update OAuth2 credentials in .env:
echo      - GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET
echo      - MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET
echo.
echo   2. Configure email provider:
echo      - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
echo      - Or use local Mailhog ^(smtp-server^) for testing
echo.
echo   3. Add Mistral API key:
echo      - MISTRAL_API_KEY ^(get from https://console.mistral.ai^)
echo.
echo   4. Start the project:
echo      docker-compose up -d
echo.
echo   5. Check services:
echo      docker-compose ps
echo.
echo   6. View logs:
echo      docker-compose logs -f
echo.
echo ✨ Setup complete! Run 'docker-compose up' to start the project.
echo.

pause
