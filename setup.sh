#!/bin/bash

# MailAgent Setup Script
# This script generates cryptographic secrets and creates a .env file ready for local development

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         MailAgent - Local Development Setup                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Create .env file if it doesn't exist
if [ -f .env ]; then
    echo "⚠️  .env already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

echo "🔐 Generating cryptographic secrets..."
echo ""

# Generate JWT_SECRET (64 bytes = 512 bits)
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
echo "✅ Generated JWT_SECRET (512 bits)"

# Generate AES_SECRET_KEY (32 bytes base64 = 256 bits)
AES_SECRET_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo "✅ Generated AES_SECRET_KEY (256 bits)"

echo ""
echo "📝 Creating .env file with base configuration..."
echo ""

# Create .env with all variables
cat > .env << EOF
# ===== ENVIRONMENT =====
NODE_ENV=development
LOG_LEVEL=debug

# ===== SERVER =====
API_PORT=3000
API_HOST=backend

# ===== DATABASE =====
DB_HOST=postgres
DB_PORT=5432
DB_USER=mailuser
DB_PASSWORD=mailpass
DB_NAME=mailagent

# ===== REDIS =====
REDIS_HOST=redis
REDIS_PORT=6379

# ===== JWT & AUTH =====
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=24h
OTP_EXPIRATION=900000
PASSWORD_RESET_EXPIRATION=900000

# ===== ENCRYPTION =====
AES_SECRET_KEY=${AES_SECRET_KEY}

# ===== OAUTH2 CREDENTIALS (Gmail) =====
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret

# ===== OAUTH2 CREDENTIALS (Microsoft) =====
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# ===== AI PROVIDER (Mistral) =====
MISTRAL_API_KEY=your-mistral-api-key
MISTRAL_MODEL=mistral-large-latest

# ===== EMAIL PROVIDER =====
SMTP_HOST=mail-server
SMTP_PORT=587
SMTP_USER=mailuser
SMTP_PASSWORD=mailpass
SMTP_FROM_EMAIL=noreply
SMTP_FROM_DOMAIN=mailagent.local

# ===== EXTERNAL SERVICES =====
STT_PROVIDER=google
TTS_PROVIDER=piper
GOOGLE_STT_API_KEY=your-google-cloud-key
PIPER_LANGUAGE=it_IT

# ===== FRONTEND CONFIG =====
FRONTEND_URL=http://localhost:3001
FRONTEND_PORT=3001

# Generated on: $(date)
EOF

echo "✅ .env file created successfully"
echo ""
echo "📋 Configuration Summary:"
echo "  • JWT_SECRET: Generated (512 bits)"
echo "  • AES_SECRET_KEY: Generated (256 bits)"
echo "  • Database: postgres:5432 (mailuser/mailpass)"
echo "  • Redis: redis:6379"
echo "  • API: http://localhost:3000 (development)"
echo "  • Frontend: http://localhost:3001 (development)"
echo ""
echo "⚠️  Next Steps:"
echo "  1. Update OAuth2 credentials in .env:"
echo "     - GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET"
echo "     - MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET"
echo ""
echo "  2. Configure email provider:"
echo "     - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD"
echo "     - Or use local Mailhog (smtp-server) for testing"
echo ""
echo "  3. Add Mistral API key:"
echo "     - MISTRAL_API_KEY (get from https://console.mistral.ai)"
echo ""
echo "  4. Start the project:"
echo "     docker-compose up -d"
echo ""
echo "  5. Check services:"
echo "     docker-compose ps"
echo ""
echo "  6. View logs:"
echo "     docker-compose logs -f"
echo ""
echo "✨ Setup complete! Run 'docker-compose up' to start the project."
