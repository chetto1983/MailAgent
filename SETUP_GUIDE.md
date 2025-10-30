# MailAgent - Complete Setup Guide

This comprehensive guide walks you through the entire process of setting up MailAgent from scratch to running it locally.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Setup](#step-by-step-setup)
3. [Verification](#verification)
4. [Accessing the Application](#accessing-the-application)
5. [Database Seeding](#database-seeding)
6. [Configuration System](#configuration-system)
7. [Troubleshooting](#troubleshooting)
8. [Next Steps](#next-steps)

---

## Prerequisites

Before starting, ensure you have:

- **Docker Desktop** (includes Docker & Docker Compose)
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - For Linux: [Install Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/)

- **Node.js 18+**
  - [Download Node.js](https://nodejs.org/)
  - Verify: `node --version` should show v18 or higher

- **Git** (optional, for version control)
  - [Download Git](https://git-scm.com/)

### Verify Prerequisites:
```bash
docker --version        # Should show Docker version
docker-compose --version # Should show Docker Compose version
node --version          # Should show v18 or higher
```

---

## Step-by-Step Setup

### 1. Generate Environment Configuration

The first and most important step is generating a secure `.env` file with cryptographic secrets.

#### On Windows:
```bash
setup.bat
```

#### On macOS/Linux:
```bash
chmod +x setup.sh
./setup.sh
```

**What this does:**
- ✅ Generates a secure JWT_SECRET (512 bits)
- ✅ Generates a secure AES_SECRET_KEY (256 bits)
- ✅ Creates `.env` with all base configuration
- ✅ Backs up any existing `.env` to `.env.backup`

**Example output:**
```
✅ Generated JWT_SECRET (512 bits)
✅ Generated AES_SECRET_KEY (256 bits)
✅ .env file created successfully

📋 Configuration Summary:
  • JWT_SECRET: Generated (512 bits)
  • AES_SECRET_KEY: Generated (256 bits)
  • Database: postgres:5432 (mailuser/mailpass)
  • Redis: redis:6379
  • API: http://localhost:3000 (development)
  • Frontend: http://localhost:3001 (development)
```

**Important**: Keep your `.env` file safe and never commit it to version control!

### 2. Review Configuration (Optional)

The generated `.env` includes default values for local development. For testing purposes, you can skip external services:

```env
# These can stay as placeholders for local testing:
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
MISTRAL_API_KEY=your-mistral-api-key
SMTP_HOST=mail-server
```

### 3. Start Docker Services

Once you have your `.env` file, start all services:

```bash
docker-compose up -d
```

This will:
1. Build Docker images (first time only)
2. Start PostgreSQL with pgvector
3. Start Redis
4. Run database migrations
5. Start NestJS backend
6. Start Next.js frontend
7. Start Nginx reverse proxy

**First startup takes 2-3 minutes.** Docker needs to download base images and run migrations.

### 4. Verify Services Are Running

```bash
docker-compose ps
```

**Expected output:**
```
NAME                COMMAND                  STATUS
postgres            postgres                 Up (healthy)
redis               redis-server             Up (healthy)
backend             node dist/main           Up
frontend           next start                Up
nginx              nginx -g daemon off      Up
```

If a service shows `Exit` or `Exited`, check the logs:
```bash
docker-compose logs service-name
```

### 5. Wait for Backend to Be Ready

The backend needs to:
1. Connect to PostgreSQL
2. Run database migrations
3. Seed test data
4. Start the API server

Check the logs:
```bash
docker-compose logs -f backend
```

**Wait for this message:**
```
[Nest] 123  - 01/15/2025, 10:30:00 AM     LOG [Bootstrap] 🚀 Application is running on http://backend:3000
```

---

## Verification

Run the verification script to ensure everything is set up correctly:

### On Windows:
```bash
verify-setup.bat
```

### On macOS/Linux:
```bash
chmod +x verify-setup.sh
./verify-setup.sh
```

This checks:
- ✅ Prerequisites (Docker, Node.js)
- ✅ Environment variables in `.env`
- ✅ Cryptographic key validity
- ✅ Docker services running
- ✅ Service connectivity
- ✅ Project files exist

**Expected result:**
```
📊 Summary
  ✅ Passed: 25
  ❌ Failed: 0
  ⚠️  Warnings: 0

✨ All checks passed! Your MailAgent setup is ready to go!
```

---

## Accessing the Application

Once everything is running, you can access:

### Frontend
- **URL**: http://localhost:3001
- **Purpose**: User interface for email assistant
- **First time**: You'll see the landing page with login/register options

### Backend API Documentation
- **URL**: http://localhost:3000/api/docs
- **Purpose**: Swagger documentation of all API endpoints
- **Use**: Test API endpoints directly from the browser

### Database (PostgreSQL)
- **Host**: localhost
- **Port**: 5432
- **User**: mailuser
- **Password**: mailpass
- **Database**: mailagent

### Redis Cache
- **Host**: localhost
- **Port**: 6379
- **Purpose**: Session storage, caching, job queues

---

## Database Seeding

The database is automatically seeded when the backend starts. This creates:

### Test Accounts:

**Admin Account:**
- Email: `admin@mailagent.local`
- Password: `TestPassword123!`
- Role: Administrator
- MFA: Enabled

**Regular User Account:**
- Email: `test@mailagent.local`
- Password: `UserPassword123!`
- Role: User
- MFA: Enabled

### Sample Data:
- Default tenant
- 4 sample conversation messages
- Email configuration (disabled for local testing)

### Seeding Output:
```
🌱 Seeding database with test data...

✅ Created default tenant: Default Tenant
✅ Created admin user: admin@mailagent.local
✅ Created regular user: test@mailagent.local
✅ Created sample conversation

🎉 Database seeding completed successfully!
```

### Re-seed the Database:

If you want to reset the database to initial state:

```bash
docker-compose down -v
docker-compose up -d
```

This deletes the PostgreSQL volume and creates a fresh database with new seeds.

---

## Configuration System

MailAgent uses a **centralized configuration system** that automatically builds derived variables from base components.

### Base Variables (in `.env`)

These are the **only variables you need to set manually**:

```env
# Environment
NODE_ENV=development
LOG_LEVEL=debug

# Server
API_PORT=3000
API_HOST=backend

# Database components
DB_HOST=postgres
DB_PORT=5432
DB_USER=mailuser
DB_PASSWORD=mailpass
DB_NAME=mailagent

# Redis components
REDIS_HOST=redis
REDIS_PORT=6379

# Secrets
JWT_SECRET=<generated-512-bits>
AES_SECRET_KEY=<generated-256-bits>

# External services
GMAIL_CLIENT_ID=...
MISTRAL_API_KEY=...
SMTP_HOST=...
```

### Derived Variables (Built Automatically)

These are **automatically constructed** by `backend/src/config/configuration.ts`:

```typescript
// From: http://${API_HOST}:${API_PORT}
API_URL = "http://backend:3000"

// From: postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
DATABASE_URL = "postgresql://mailuser:mailpass@postgres:5432/mailagent"

// From: redis://${REDIS_HOST}:${REDIS_PORT}
REDIS_URL = "redis://redis:6379"

// From: ${API_URL}/auth/gmail/callback
GMAIL_REDIRECT_URI = "http://backend:3000/auth/gmail/callback"

// From: ${API_URL}/auth/microsoft/callback
MICROSOFT_REDIRECT_URI = "http://backend:3000/auth/microsoft/callback"

// From: ${SMTP_FROM_EMAIL}@${SMTP_FROM_DOMAIN}
SMTP_FROM = "noreply@mailagent.local"

// CORS Origins (multi-origin support)
CORS_ORIGINS = [
  "http://backend:3000",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://localhost",
  "https://localhost:443"
]
```

### Why This Matters:

1. **Single Source of Truth**: All URLs derive from base components
2. **Easy Environment Switch**: Change only base variables for different deployments
3. **Type Safe**: Full TypeScript support in services
4. **Validated**: Encryption keys validated on startup

### Example: Switching to Production

To deploy to production, just change the base variables:

```env
NODE_ENV=production
API_HOST=mailagent.example.com
DB_HOST=prod-db.example.com
DB_USER=prod_user
DB_PASSWORD=very-secure-password
JWT_SECRET=your-production-secret-minimum-64-chars
AES_SECRET_KEY=your-production-base64-key
```

All derived URLs automatically update:
- `API_URL` → `http://mailagent.example.com:3000`
- `DATABASE_URL` → `postgresql://prod_user:***@prod-db.example.com:5432/mailagent`
- `GMAIL_REDIRECT_URI` → `http://mailagent.example.com:3000/auth/gmail/callback`

See [CONFIGURATION.md](CONFIGURATION.md) for more details.

---

## Troubleshooting

### Port Already in Use

If you get "port is already in use" error:

```bash
# Check what's using the port (macOS/Linux)
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Kill the process
kill -9 <PID>
```

**Or modify docker-compose.yml:**
```yaml
backend:
  ports:
    - "3010:3000"  # Use 3010 instead of 3000
```

### PostgreSQL Connection Refused

**Error:**
```
error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Wait 5-10 seconds for startup, then:
docker-compose logs postgres

# If still failing, restart:
docker-compose restart postgres
```

### Backend Shows "Database Connection Error"

**Solution:**
```bash
# Wait for PostgreSQL to be healthy
docker-compose ps postgres  # Should show "healthy"

# Check migrations ran
docker-compose logs backend | grep -i migration

# Restart backend
docker-compose restart backend
```

### Frontend Shows Blank Page

**Solution:**
```bash
# Clear browser cache: Ctrl+Shift+Delete (Windows/Linux) or Cmd+Shift+Delete (Mac)
# Hard refresh: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)

# Check frontend logs
docker-compose logs frontend

# Check if frontend is running
curl http://localhost:3001
```

### AES_SECRET_KEY Invalid

**Error:**
```
Error: Invalid AES_SECRET_KEY configuration
```

**Solution:**
```bash
# Delete old .env
rm .env

# Regenerate with setup script
./setup.sh  # or setup.bat on Windows

# Restart
docker-compose down
docker-compose up -d
```

### Redis Connection Error

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Check Redis is running
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Wait 5 seconds and try again
```

### OTP Not Received

For testing, OTP codes are printed in the logs:

```bash
docker-compose logs backend | grep -i otp
```

You'll see something like:
```
Generated OTP: 123456 (expires in 15 minutes)
```

Use this code to complete the MFA flow.

---

## Common Commands

### View Logs

```bash
# View all services
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# View recent logs only
docker-compose logs --tail=50 backend

# Follow logs in real-time
docker-compose logs -f
```

### Database Operations

```bash
# Open PostgreSQL shell
docker-compose exec postgres psql -U mailuser -d mailagent

# View tables
\dt

# Run a query
SELECT * FROM users;

# Exit
\q
```

### Redis Operations

```bash
# Open Redis CLI
docker-compose exec redis redis-cli

# View all keys
KEYS *

# Get a specific key
GET key-name

# Exit
exit
```

### Rebuild Services

```bash
# Rebuild images (after code changes)
docker-compose build

# Start without cache
docker-compose build --no-cache

# Start updated services
docker-compose up -d
```

### Stop Services

```bash
# Stop all services (keep data)
docker-compose stop

# Start again
docker-compose start

# Stop and remove containers (keep volumes)
docker-compose down

# Stop and remove everything
docker-compose down -v
```

---

## Next Steps

### 1. Create Your First User Account

1. Visit http://localhost:3001/auth/register
2. Enter email: `myemail@example.com`
3. Enter password (min 8 chars)
4. Click "Send OTP"
5. Check logs for OTP code: `docker-compose logs backend | grep OTP`
6. Enter OTP code
7. Account created!

### 2. Login and Explore

1. Visit http://localhost:3001/auth/login
2. Use your credentials
3. Enter OTP again
4. Access dashboard at http://localhost:3001/dashboard

### 3. Explore API Documentation

1. Visit http://localhost:3000/api/docs
2. Test endpoints directly in Swagger UI
3. Try endpoints like:
   - GET `/api/health` - Check system health
   - POST `/api/auth/register` - Create account
   - GET `/api/users/me` - Get current user

### 4. Configure External Services (Optional)

For full functionality, configure:

- **Gmail Integration**: Add `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`
- **Microsoft Integration**: Add `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`
- **Mistral AI**: Add `MISTRAL_API_KEY` from https://console.mistral.ai
- **Email Server**: Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`

Update `.env` and restart:
```bash
docker-compose down
docker-compose up -d
```

### 5. Review Code Structure

- **Backend API**: `backend/src/modules/` contains:
  - `auth/` - Authentication and OTP
  - `email/` - Email integration
  - `ai/` - Mistral AI integration
  - `users/` - User management
  - `tenants/` - Multi-tenant support

- **Frontend**: `frontend/pages/` contains:
  - `auth/` - Login, register, password reset
  - `dashboard/` - Main application

- **Configuration**: `backend/src/config/configuration.ts` - Centralized config system

---

## Documentation Files

- **[QUICK_START.md](QUICK_START.md)** - Quick start guide (5-10 minutes)
- **[CONFIGURATION.md](CONFIGURATION.md)** - Detailed configuration system
- **[PRIVACY.md](PRIVACY.md)** - GDPR privacy policy
- **[README.md](README.md)** - Full project documentation

---

## Security Checklist

Before deploying to production:

- ✅ Generate new JWT_SECRET (minimum 64 characters)
- ✅ Generate new AES_SECRET_KEY (32 bytes, base64 encoded)
- ✅ Change database password to something secure
- ✅ Set `NODE_ENV=production`
- ✅ Configure real SMTP server credentials
- ✅ Set up SSL certificates (Nginx already configured for HTTPS)
- ✅ Configure OAuth credentials (Gmail, Microsoft)
- ✅ Review CORS origins for your domain
- ✅ Set strong password policies
- ✅ Enable all security headers

See [README.md](README.md#security-features) for security features.

---

## Support

If you encounter issues:

1. **Check logs**: `docker-compose logs -f`
2. **Run verification**: `./verify-setup.sh` or `verify-setup.bat`
3. **Check documentation**: See relevant `.md` files
4. **Review troubleshooting**: See section above

---

## Summary

You've now:
- ✅ Generated secure cryptographic keys
- ✅ Created environment configuration
- ✅ Started Docker services
- ✅ Verified the setup
- ✅ Seeded test data
- ✅ Accessed the application

**You're ready to develop with MailAgent!** 🚀

---

**Last updated**: January 2025
**Project**: MailAgent - AI-powered Multi-tenant Email Assistant
