@echo off
REM Set environment variables for local development
set NEXT_PUBLIC_API_URL=http://localhost:3000

echo.
echo 🚀 Starting MailAgent Frontend (Local Development)
echo 📍 Frontend: http://localhost:3001
echo 🔗 API URL: http://localhost:3000
echo.

cd frontend
call npm run dev
