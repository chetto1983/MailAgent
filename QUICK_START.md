# ⚡ Quick Start - 3 Simple Steps

## Step 1️⃣: Start Services (Docker)
```bash
docker-compose -f docker-compose.dev.yml up -d
```
✅ PostgreSQL, Redis, MailHog are now running

---

## Step 2️⃣: Start Backend (Terminal 1)
**Windows:**
```bash
start-backend-local.bat
```
**Mac/Linux:**
```bash
./start-backend-local.sh
```
✅ Backend API running on http://localhost:3000

---

## Step 3️⃣: Start Frontend (Terminal 2)
**Windows:**
```bash
start-frontend-local.bat
```
**Mac/Linux:**
```bash
./start-frontend-local.sh
```
✅ Frontend running on http://localhost:3001

---

## 🧪 Test Authentication

### Option 1: Use Frontend
1. Go to http://localhost:3001/auth/login
2. Use pre-seeded account:
   - **Email:** `admin@mailagent.local`
   - **Password:** `TestPassword123!`
3. Copy OTP from http://localhost:8025 (MailHog)
4. Enter OTP and login
5. ✅ Done!

### Option 2: Use API (cURL/Postman)
1. **Login:**
   ```bash
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@mailagent.local","password":"TestPassword123!"}'
   ```

2. **Check Email in MailHog:** http://localhost:8025

3. **Verify OTP:**
   ```bash
   curl -X POST http://localhost:3000/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@mailagent.local","code":"123456"}'
   ```

---

## 📍 Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:3000 |
| API Docs | http://localhost:3000/api/docs |
| Email Testing | http://localhost:8025 |

---

## 🛠️ Troubleshooting

**Backend won't start?**
```bash
# Make sure services are running
docker-compose -f docker-compose.dev.yml ps

# Check DATABASE_URL on Windows is set
echo %DATABASE_URL%
```

**Can't see emails?**
- Visit http://localhost:8025
- Check backend logs for `[EmailService] Email sent to...`

**Port in use?**
- Backend: 3000
- Frontend: 3001
- Database: 5432
- Make sure nothing else is using these ports

---

## 📚 For More Details
See `LOCAL_DEV_SETUP.md` and `CURRENT_STATUS.md` for comprehensive guides

---

## ✨ You're All Set! 🎉

Happy coding! The application is fully functional and ready for development.
