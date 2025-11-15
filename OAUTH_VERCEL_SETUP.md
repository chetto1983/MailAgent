# 🌐 OAuth Setup per Frontend Vercel

## Architettura Deployment

- **Frontend:** `https://your-app.vercel.app` (Vercel)
- **Backend:** `http://localhost:3000` (Locale per test) o URL pubblico
- **OAuth Redirect:** `https://your-app.vercel.app/dashboard/settings?section=accounts`

---

## ⚠️ IMPORTANTE: Sostituisci `your-app.vercel.app` con il TUO URL Vercel

---

## 1. Google OAuth - Aggiorna Redirect URIs

### Passo 1: Vai su Google Cloud Console

[https://console.cloud.google.com/](https://console.cloud.google.com/)

### Passo 2: Modifica OAuth Client

1. **APIs & Services** → **Credentials**
2. Click sul tuo OAuth 2.0 Client ID
3. **Authorized redirect URIs** → Aggiungi:

```
https://your-app.vercel.app/dashboard/settings?section=accounts
http://localhost:3001/dashboard/settings?section=accounts  (mantieni per test locale)
```

4. **Salva**

### Passo 3: Aggiorna `.env` Backend

```env
# Google OAuth
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/dashboard/settings?section=accounts

# Frontend URL
FRONTEND_URL=https://your-app.vercel.app
```

---

## 2. Microsoft OAuth - Aggiorna Redirect URIs

### Passo 1: Vai su Azure Portal

[https://portal.azure.com/](https://portal.azure.com/)

### Passo 2: Modifica App Registration

1. **Azure Active Directory** → **App registrations**
2. Seleziona la tua app
3. **Authentication** → **Platform configurations** → **Web**
4. **Redirect URIs** → Aggiungi:

```
https://your-app.vercel.app/dashboard/settings?section=accounts
http://localhost:3001/dashboard/settings?section=accounts  (mantieni per test locale)
```

5. **Salva**

### Passo 3: Aggiorna `.env` Backend

```env
# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_REDIRECT_URI=https://your-app.vercel.app/dashboard/settings?section=accounts
```

---

## 3. CORS - Configurazione Backend

Il backend deve accettare richieste da Vercel.

### Aggiorna `main.ts` o configurazione CORS

**File:** `backend/src/main.ts`

```typescript
app.enableCors({
  origin: [
    'http://localhost:3001',           // Dev locale
    'https://your-app.vercel.app',     // Vercel produzione
    /https:\/\/.*\.vercel\.app$/,      // Tutti i preview di Vercel
  ],
  credentials: true,
});
```

---

## 4. Environment Variables - Vercel Frontend

Nel dashboard Vercel, aggiungi queste variabili d'ambiente:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000  # Per dev locale

# Oppure se backend è pubblico:
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

---

## 5. Backend Pubblico (Opzionale - Per Produzione)

Se vuoi che Vercel comunichi con un backend pubblico:

### Opzione A: ngrok (Test)

```bash
# Installa ngrok
npm install -g ngrok

# Esponi backend
ngrok http 3000

# Output: https://abc123.ngrok.io
```

Usa questo URL come `NEXT_PUBLIC_API_URL` in Vercel.

### Opzione B: Deploy Backend (Produzione)

Deploy backend su:
- **Railway:** [railway.app](https://railway.app/)
- **Render:** [render.com](https://render.com/)
- **Fly.io:** [fly.io](https://fly.io/)
- **DigitalOcean App Platform**

Poi usa URL pubblico come `NEXT_PUBLIC_API_URL`.

---

## 6. Test Completo

### Setup:

1. ✅ Frontend su Vercel
2. ✅ Backend locale (o pubblico)
3. ✅ OAuth redirect URIs aggiornati
4. ✅ CORS configurato

### Test OAuth:

1. Vai su `https://your-app.vercel.app`
2. Login con le tue credenziali
3. Click **"Connect Google"** o **"Connect Microsoft"**
4. Autorizza l'app
5. Verrai reindirizzato a `/dashboard/settings?section=accounts?code=xxx`
6. Frontend chiamerà backend per completare la connessione

---

## 7. Verifica Configurazione

### Check 1: Google Redirect URIs

```bash
# Deve contenere:
https://your-app.vercel.app/dashboard/settings?section=accounts ✅
```

### Check 2: Microsoft Redirect URIs

```bash
# Deve contenere:
https://your-app.vercel.app/dashboard/settings?section=accounts ✅
```

### Check 3: Backend `.env`

```env
FRONTEND_URL=https://your-app.vercel.app
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/dashboard/settings?section=accounts
MICROSOFT_REDIRECT_URI=https://your-app.vercel.app/dashboard/settings?section=accounts
```

### Check 4: CORS Backend

```typescript
origin: [
  'http://localhost:3001',
  'https://your-app.vercel.app',  // ✅
]
```

---

## 8. Troubleshooting

### Errore: "redirect_uri_mismatch"

**Causa:** Redirect URI non corrisponde

**Fix:**
1. Verifica URL Vercel esatto (con/senza trailing slash)
2. Usa ESATTAMENTE lo stesso URL in:
   - Google/Microsoft OAuth config
   - Backend `.env`
   - Frontend chiamate API

### Errore: CORS

**Causa:** Backend blocca richieste da Vercel

**Fix:**
```typescript
// main.ts
app.enableCors({
  origin: [
    'https://your-app.vercel.app',
    /https:\/\/.*\.vercel\.app$/,  // Permetti tutti i deploy Vercel
  ],
  credentials: true,
});
```

### Errore: "Failed to fetch" dal frontend

**Causa:** Backend non raggiungibile

**Fix:**
1. Se backend locale: usa ngrok
2. Verifica `NEXT_PUBLIC_API_URL` in Vercel
3. Controlla firewall/network

---

## 9. Configurazione Completa `.env`

### Backend `.env`

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mailagent"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Google OAuth (VERCEL)
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/dashboard/settings?section=accounts

# Microsoft OAuth (VERCEL)
MICROSOFT_CLIENT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_REDIRECT_URI=https://your-app.vercel.app/dashboard/settings?section=accounts

# URLs
FRONTEND_URL=https://your-app.vercel.app
API_PUBLIC_URL=http://localhost:3000  # o https://your-backend.com

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key!!

# AI
MISTRAL_API_KEY=your-mistral-api-key
```

### Vercel Environment Variables (Frontend)

```env
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3000  # Test con ngrok
# Oppure
NEXT_PUBLIC_API_URL=https://your-backend.railway.app  # Produzione
```

---

## 10. Deployment Workflow

### Sviluppo Locale:

```bash
# Terminal 1 - Backend locale
cd backend
npm run start:dev

# Terminal 2 - Frontend usa Vercel
# Accedi a https://your-app.vercel.app
```

### Produzione:

```bash
# 1. Deploy backend (Railway, Render, etc.)
# 2. Aggiorna NEXT_PUBLIC_API_URL in Vercel
# 3. Redeploy frontend Vercel
# 4. Test OAuth flow completo
```

---

**Configurazione completata! 🚀**

Dimmi il tuo URL Vercel e aggiorno tutti i placeholder!
