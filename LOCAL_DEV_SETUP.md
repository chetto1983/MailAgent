# MailAgent - Local Development Setup

## Quick Start Guide

This setup runs **Backend** and **Frontend** locally on your machine while keeping supporting services (Database, Redis, Email) in Docker.

### Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose installed
- Port 3000 (Backend), 3001 (Frontend), 5432 (Database), 6379 (Redis), 1025/8025 (MailHog) available

---

## Step 1: Start Supporting Services (Docker)

Supporting services run in Docker containers:
- **PostgreSQL** - Database (port 5432)
- **Redis** - Cache (port 6379)
- **MailHog** - Email Testing (port 8025)

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Verify services are running:
```bash
docker-compose -f docker-compose.dev.yml ps
```

---

## Step 2: Start Backend (Local - Terminal 1)

**On Windows (PowerShell):**
```bash
$env:NODE_ENV='development'
$env:DB_HOST='localhost'
$env:DB_PORT='5432'
$env:DB_USER='mailuser'
$env:DB_PASSWORD='mailpass'
$env:DB_NAME='mailagent'
$env:REDIS_HOST='localhost'
$env:REDIS_PORT='6379'
$env:API_HOST='localhost'
$env:API_PORT='3000'
$env:SMTP_HOST='localhost'
$env:SMTP_PORT='1025'
$env:SMTP_FROM_EMAIL='noreply'
$env:SMTP_FROM_DOMAIN='mailagent.local'
$env:DATABASE_URL='postgresql://mailuser:mailpass@localhost:5432/mailagent'
$env:JWT_SECRET='932aec0fcb90f774f70cbc147cc92a8b42a548e993364da749328aa935d9aaa8280e5b390b3113a8c448bdfd337369ac643d41d4fdf52cc1797fca1ea24900e4'
$env:AES_SECRET_KEY='6h727qBIKgZA5e13ya8UDckB/ltNuMxPzmQma82JFXo='

cd backend
npm run start:dev
```

**On Mac/Linux:**
```bash
./start-backend-local.sh
```

Expected output:
```
🚀 Application is running on http://localhost:3000
📊 Swagger docs available at http://localhost:3000/api/docs
```

---

## Step 3: Start Frontend (Local - Terminal 2)

**On Windows (PowerShell):**
```bash
$env:NEXT_PUBLIC_API_URL='http://localhost:3000'
cd frontend
npm run dev
```

**On Mac/Linux:**
```bash
./start-frontend-local.sh
```

Expected output:
```
▲ Next.js [version]
- Local:        http://localhost:3001
```

---

## Step 4: Test the Application

### Access the Application
- **Frontend**: http://localhost:3001
- **Backend Swagger**: http://localhost:3000/api/docs
- **MailHog**: http://localhost:8025 (see test emails)

### Test Credentials (Pre-seeded)
```
Email: admin@mailagent.local
Password: TestPassword123!
```

### Complete Login Flow
1. Go to http://localhost:3001/auth/login
2. Enter email and password → Click "Sign In"
3. You'll be prompted for OTP
4. OTP emails go to MailHog → Visit http://localhost:8025
5. Find the email, copy the OTP code
6. Enter OTP on login page → Click "Verify OTP"
7. ✅ You should be logged in!

---

## Useful Commands

### Backend
```bash
cd backend

# Install dependencies
npm install --legacy-peer-deps

# Run development server (with hot reload)
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test

# Setup database
npm run prisma:migrate

# Seed database
npm run prisma:seed
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Docker Services
```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs postgres
docker-compose -f docker-compose.dev.yml logs redis
docker-compose -f docker-compose.dev.yml logs mailhog

# Clean up (remove volumes)
docker-compose -f docker-compose.dev.yml down -v
```

---

## Troubleshooting

### Backend won't connect to database
```bash
# Check DATABASE_URL is set correctly
echo $env:DATABASE_URL  # PowerShell
echo $DATABASE_URL      # Mac/Linux

# Should be: postgresql://mailuser:mailpass@localhost:5432/mailagent
```

### Port already in use
```bash
# Find and kill process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # Mac/Linux
```

### Email not appearing in MailHog
1. Check backend logs for `[EmailService] Email sent to...`
2. Visit http://localhost:8025 (MailHog Web UI)
3. Check SMTP_HOST=localhost and SMTP_PORT=1025 are set

### Database connection error
```bash
# Check database container is running
docker-compose -f docker-compose.dev.yml ps

# Reset database (lose all data!)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d

# Reseed database
cd backend
npm run prisma:seed
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│          Your Local Machine             │
├─────────────────────────────────────────┤
│  Frontend (Next.js)                     │
│  http://localhost:3001    [npm run dev] │
│                           ↓             │
│  Backend (NestJS)                       │
│  http://localhost:3000  [npm run start] │
├─────────────────────────────────────────┤
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴────────────┐
        │                       │
┌──────▼────────┐   ┌──────────▼──────┐
│   Docker      │   │   Docker        │
│   Containers  │   │   Containers    │
├───────────────┤   ├─────────────────┤
│ PostgreSQL    │   │ Redis           │
│ :5432         │   │ :6379           │
│               │   │                 │
│ MailHog       │   │                 │
│ :1025 / :8025 │   │                 │
└───────────────┘   └─────────────────┘
```

---

## Next Steps

✅ Supporting services running
✅ Backend running locally
✅ Frontend running locally
✅ Database initialized and seeded

**Now test the complete authentication flow!**
