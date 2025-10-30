#!/bin/bash

# Set environment variables for local development
export NODE_ENV=development
export LOG_LEVEL=debug
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=mailuser
export DB_PASSWORD=mailpass
export DB_NAME=mailagent
export REDIS_HOST=localhost
export REDIS_PORT=6379
export API_HOST=localhost
export API_PORT=3000
export JWT_SECRET=932aec0fcb90f774f70cbc147cc92a8b42a548e993364da749328aa935d9aaa8280e5b390b3113a8c448bdfd337369ac643d41d4fdf52cc1797fca1ea24900e4
export AES_SECRET_KEY=6h727qBIKgZA5e13ya8UDckB/ltNuMxPzmQma82JFXo=
export JWT_EXPIRATION=24h
export SMTP_HOST=localhost
export SMTP_PORT=1025
export SMTP_USER=
export SMTP_PASSWORD=
export SMTP_FROM_EMAIL=noreply
export SMTP_FROM_DOMAIN=mailagent.local
export DATABASE_URL="postgresql://mailuser:mailpass@localhost:5432/mailagent"

cd "$(dirname "$0")/backend"

echo "🚀 Starting MailAgent Backend (Local Development)"
echo "📊 Database: localhost:5432/mailagent"
echo "📧 Email (MailHog): localhost:1025"
echo "📍 API: http://localhost:3000"
echo ""

npm run start:dev
