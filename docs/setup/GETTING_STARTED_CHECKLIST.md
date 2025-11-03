# MailAgent - Getting Started Checklist

Complete this checklist to get MailAgent up and running.

## Pre-Setup Checklist

- [ ] **Install Docker Desktop**
  - https://www.docker.com/products/docker-desktop
  - For Linux: Install Docker and Docker Compose separately

- [ ] **Install Node.js 18+**
  - https://nodejs.org/
  - Verify: `node --version` (should be v18+)

- [ ] **Clone or Download MailAgent**
  - Have the project directory ready
  - Navigate to the project directory

- [ ] **Internet Connection**
  - Docker will download base images (~1-2 GB)
  - Backend will download npm dependencies

---

## Setup Phase

- [ ] **Step 1: Generate Environment Configuration**

  On Windows:
  ```bash
  setup.bat
  ```

  On macOS/Linux:
  ```bash
  chmod +x setup.sh
  ./setup.sh
  ```

  **Verify**: `.env` file created and contains:
  - `JWT_SECRET=...` (long string)
  - `AES_SECRET_KEY=...` (base64 string)

- [ ] **Step 2: Keep Your `.env` Safe**
  - [ ] Don't commit `.env` to git
  - [ ] Add `.env` to `.gitignore`
  - [ ] Make a backup of `.env` if important

- [ ] **Step 3: Start Docker Services**
  ```bash
  docker-compose up -d
  ```

  **Verify**: Services are running
  ```bash
  docker-compose ps
  ```

  All services should show "Up" status (wait 1-2 minutes for first startup)

- [ ] **Step 4: Wait for Database Seeding**

  Check backend logs:
  ```bash
  docker-compose logs -f backend
  ```

  **Wait for**:
  ```
  ✅ Created default tenant: Default Tenant
  ✅ Created admin user: admin@mailagent.local
  🎉 Database seeding completed successfully!
  🚀 Application is running on http://backend:3000
  ```

- [ ] **Step 5: Verify Everything Works**
  ```bash
  verify-setup.bat
  # or
  ./verify-setup.sh
  ```

  **Expect**: All checks passed ✅

---

## First-Time Access Checklist

- [ ] **Open Frontend in Browser**
  - URL: http://localhost:3001
  - Should see: Landing page with login/register options

- [ ] **Check API Documentation**
  - URL: http://localhost:3000/api/docs
  - Should see: Swagger UI with all endpoints

- [ ] **Check Backend Health**
  ```bash
  curl http://localhost:3000/api/health
  ```

  **Expect**:
  ```json
  {
    "status": "ok",
    "database": "connected",
    "redis": "connected"
  }
  ```

---

## Testing Phase

- [ ] **Test Login with Pre-Seeded Admin Account**

  1. Go to: http://localhost:3001/auth/login
  2. Email: `admin@mailagent.local`
  3. Password: `TestPassword123!`
  4. Get OTP from logs: `docker-compose logs backend | grep OTP`
  5. Enter OTP code
  6. Should see: Dashboard with welcome message

- [ ] **Test Login with Regular User Account**

  1. Go to: http://localhost:3001/auth/login
  2. Email: `test@mailagent.local`
  3. Password: `UserPassword123!`
  4. Get OTP from logs
  5. Enter OTP code
  6. Should see: Dashboard

- [ ] **Explore API Endpoints**

  1. Visit: http://localhost:3000/api/docs
  2. Try GET `/api/health` - should return health status
  3. Try GET `/api/users/me` - requires authentication token

---

## Configuration Review Checklist (Optional)

- [ ] **Review `.env` Structure**

  Open `.env` and verify:
  - `NODE_ENV=development` ✓
  - `API_HOST=backend` ✓
  - `API_PORT=3000` ✓
  - `DB_HOST=postgres` ✓
  - `JWT_SECRET=<long-string>` ✓
  - `AES_SECRET_KEY=<base64>` ✓

- [ ] **Understand Auto-Generated URLs**

  These are built automatically:
  - `DATABASE_URL` ← from DB_* variables
  - `REDIS_URL` ← from REDIS_* variables
  - `API_URL` ← from API_* variables
  - See [CONFIGURATION.md](CONFIGURATION.md) for details

- [ ] **Review Configuration System**

  Read: [CONFIGURATION.md](CONFIGURATION.md)

  Understand:
  - Base variables (what you set)
  - Derived variables (auto-built)
  - How services use config

---

## Common Tasks Checklist

- [ ] **View Service Logs**
  ```bash
  docker-compose logs -f backend
  ```

- [ ] **Stop Services**
  ```bash
  docker-compose stop
  ```

- [ ] **Restart Services**
  ```bash
  docker-compose restart
  ```

- [ ] **Reset Database**
  ```bash
  docker-compose down -v
  docker-compose up -d
  ```

- [ ] **Check Service Status**
  ```bash
  docker-compose ps
  ```

- [ ] **View Database Content**
  ```bash
  docker-compose exec postgres psql -U mailuser -d mailagent
  # Then: SELECT * FROM users;
  # Then: \q (to exit)
  ```

---

## Optional: Configure External Services

Only do this if you want full functionality beyond local testing.

- [ ] **Gmail OAuth Integration**
  - [ ] Go to: https://console.cloud.google.com/
  - [ ] Create OAuth2 credentials
  - [ ] Copy Client ID and Secret
  - [ ] Update `.env`: `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET`
  - [ ] Restart: `docker-compose restart backend`

- [ ] **Microsoft OAuth Integration**
  - [ ] Go to: https://portal.azure.com/
  - [ ] Register application
  - [ ] Create client secret
  - [ ] Update `.env`: `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`
  - [ ] Restart: `docker-compose restart backend`

- [ ] **Mistral AI Integration**
  - [ ] Go to: https://console.mistral.ai/
  - [ ] Create API key
  - [ ] Update `.env`: `MISTRAL_API_KEY=your-key`
  - [ ] Restart: `docker-compose restart backend`

- [ ] **Email Provider Configuration**
  - [ ] Have SMTP server credentials ready
  - [ ] Update `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
  - [ ] Restart: `docker-compose restart backend`

---

## Troubleshooting Checklist

If something doesn't work:

- [ ] **Services won't start**
  - [ ] Check Docker is running
  - [ ] Check ports 3000, 3001, 5432 are not in use
  - [ ] Run: `docker-compose logs`
  - [ ] See: [SETUP_GUIDE.md - Troubleshooting](SETUP_GUIDE.md#troubleshooting)

- [ ] **Database connection error**
  - [ ] Wait 10 seconds for PostgreSQL to start
  - [ ] Run: `docker-compose ps` (postgres should show "healthy")
  - [ ] Restart: `docker-compose restart postgres`

- [ ] **AES_SECRET_KEY error**
  - [ ] Delete `.env` file
  - [ ] Run setup script: `setup.bat` or `./setup.sh`
  - [ ] Restart: `docker-compose down && docker-compose up -d`

- [ ] **Frontend shows blank page**
  - [ ] Hard refresh browser: Ctrl+F5 (Cmd+Shift+R on Mac)
  - [ ] Check frontend logs: `docker-compose logs frontend`
  - [ ] Check Nginx logs: `docker-compose logs nginx`

- [ ] **API docs showing error**
  - [ ] Wait for backend to fully start
  - [ ] Check logs: `docker-compose logs backend`
  - [ ] Verify health: `curl http://localhost:3000/api/health`

- [ ] **OTP not appearing in logs**
  - [ ] Run: `docker-compose logs backend | grep -i otp`
  - [ ] Make sure you're looking at recent logs
  - [ ] Try registering a new user

---

## Learning Resources Checklist

- [ ] **Read QUICK_START.md**
  - 5-10 minute overview
  - Basic usage instructions

- [ ] **Read SETUP_GUIDE.md**
  - Complete step-by-step guide
  - Troubleshooting section
  - Database operations

- [ ] **Review CONFIGURATION.md**
  - Understand config system
  - Learn base vs derived variables
  - See examples for production setup

- [ ] **Check README.md**
  - Full project documentation
  - Architecture overview
  - API endpoints reference
  - Feature descriptions

- [ ] **Use QUICK_REFERENCE.md**
  - Common commands cheat sheet
  - File structure
  - Useful snippets

---

## Next Steps After Setup

- [ ] **Explore the Frontend**
  - http://localhost:3001
  - Try the login flow
  - Navigate the dashboard

- [ ] **Test the Backend API**
  - http://localhost:3000/api/docs
  - Try endpoints in Swagger
  - Create test data

- [ ] **Review Code Structure**
  - `backend/src/modules/` - API logic
  - `frontend/pages/` - UI pages
  - `backend/src/config/configuration.ts` - Config system

- [ ] **Create Custom Test Users**
  - Register new accounts
  - Test multi-user functionality
  - Test MFA flow

- [ ] **Review Database Schema**
  - `backend/prisma/schema.prisma`
  - Understand data models
  - See relationships

- [ ] **Set Up Version Control** (Optional)
  - [ ] Initialize git: `git init`
  - [ ] Create `.gitignore` with `.env`
  - [ ] Make initial commit
  - [ ] Create GitHub repo and push

---

## Documentation Reference

| File | Purpose | Read Time |
|------|---------|-----------|
| [QUICK_START.md](QUICK_START.md) | 5-minute overview | 5 min |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Complete setup walkthrough | 15 min |
| [CONFIGURATION.md](CONFIGURATION.md) | Config system details | 10 min |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Command cheat sheet | 5 min |
| [README.md](README.md) | Full documentation | 20 min |
| [PRIVACY.md](PRIVACY.md) | GDPR & privacy | 10 min |

---

## Quick Help

**Forgot test credentials?**
```bash
docker-compose logs backend | grep "Test Account"
```

**Need to regenerate secrets?**
```bash
rm .env
setup.bat  # or ./setup.sh
docker-compose down
docker-compose up -d
```

**Want to reset everything?**
```bash
docker-compose down -v
docker-compose up -d
```

**Check if services are healthy?**
```bash
docker-compose ps
```

**View what's running on ports?**
```bash
# macOS/Linux
lsof -i :3000
lsof -i :3001
lsof -i :5432

# Windows (PowerShell)
netstat -ano | findstr :3000
```

---

## Success Indicators

You've successfully completed setup when:

✅ `.env` file exists with JWT_SECRET and AES_SECRET_KEY
✅ All Docker services show "Up" status
✅ Database seeding completes successfully
✅ Can access http://localhost:3001 (frontend)
✅ Can access http://localhost:3000/api/docs (API docs)
✅ Can login with admin@mailagent.local
✅ Backend health check returns "connected"
✅ No errors in Docker logs

---

## Congratulations! 🎉

You've successfully set up MailAgent! You're now ready to:
- Develop new features
- Test functionality
- Explore the codebase
- Configure external services
- Deploy to production

---

**Happy coding! 🚀**

For support, check the documentation files or review troubleshooting section.
