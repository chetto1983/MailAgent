@echo off
REM Set environment variables for local development
set NODE_ENV=development
set LOG_LEVEL=debug
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=mailuser
set DB_PASSWORD=mailpass
set DB_NAME=mailagent
set REDIS_HOST=localhost
set REDIS_PORT=6379
set API_HOST=localhost
set API_PORT=3000
set JWT_SECRET=932aec0fcb90f774f70cbc147cc92a8b42a548e993364da749328aa935d9aaa8280e5b390b3113a8c448bdfd337369ac643d41d4fdf52cc1797fca1ea24900e4
set AES_SECRET_KEY=6h727qBIKgZA5e13ya8UDckB/ltNuMxPzmQma82JFXo=
set JWT_EXPIRATION=24h
set SMTP_HOST=localhost
set SMTP_PORT=1025
set SMTP_FROM_EMAIL=noreply
set SMTP_FROM_DOMAIN=mailagent.local
set DATABASE_URL=postgresql://mailuser:mailpass@localhost:5432/mailagent

echo.
echo 🚀 Starting MailAgent Backend (Local Development)
echo 📊 Database: localhost:5432/mailagent
echo 📧 Email (MailHog): localhost:1025
echo 📍 API: http://localhost:3000
echo.

cd backend
call npm run start:dev
