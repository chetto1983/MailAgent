# 🔐 OAuth Setup Guide - Google & Microsoft

## Architettura

- **Frontend:** `http://localhost:3001` (Next.js)
- **Backend:** `http://localhost:3000` (NestJS)
- **OAuth Redirect:** `http://localhost:3001/dashboard/providers`

---

## 1. Google OAuth Setup

### Passo 1: Crea Progetto Google Cloud

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto o seleziona uno esistente
3. Nome suggerito: `MailAgent Dev`

### Passo 2: Abilita API

Cerca e abilita queste API:
- ✅ **Gmail API**
- ✅ **Google Calendar API**
- ✅ **Google People API** (per contatti)

### Passo 3: Crea Credenziali OAuth 2.0

1. Vai su **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Configura schermata consenso (se richiesto):
   - User Type: **External** (per test)
   - App name: `MailAgent`
   - User support email: tua email
   - Developer contact: tua email
   - Scopes: aggiungi manualmente se richiesto

4. Crea OAuth client ID:
   - Application type: **Web application**
   - Name: `MailAgent Web Client`

5. **Authorized redirect URIs:**
   ```
   http://localhost:3001/dashboard/providers
   http://localhost:3000/providers/google/callback
   ```

6. Click **CREATE**

7. **Copia le credenziali:**
   - Client ID: `123456789-xxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`

### Passo 4: Aggiungi al `.env`

```env
# Google OAuth
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3001/dashboard/providers
```

### Passo 5: Test Users (Solo per External)

Se usi **External**, aggiungi il tuo account Gmail come test user:

1. Vai su **OAuth consent screen**
2. Scroll down a **Test users**
3. Click **+ ADD USERS**
4. Aggiungi la tua email Gmail
5. Salva

---

## 2. Microsoft OAuth Setup

### Passo 1: Registra App in Azure

1. Vai su [Azure Portal](https://portal.azure.com/)
2. Cerca **Azure Active Directory** (o **Microsoft Entra ID**)
3. Vai su **App registrations**
4. Click **+ New registration**

### Passo 2: Configura App

**Basic Information:**
- Name: `MailAgent`
- Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
- Redirect URI:
  - Platform: **Web**
  - URI: `http://localhost:3001/dashboard/providers`

Click **Register**

### Passo 3: Aggiungi Redirect URIs

1. Vai su **Authentication**
2. **Redirect URIs** → **+ Add a platform** → **Web**
3. Aggiungi:
   ```
   http://localhost:3001/dashboard/providers
   http://localhost:3000/providers/microsoft/callback
   ```
4. Salva

### Passo 4: Crea Client Secret

1. Vai su **Certificates & secrets**
2. **Client secrets** → **+ New client secret**
3. Description: `MailAgent Dev Secret`
4. Expires: `24 months` (o Custom)
5. Click **Add**
6. **⚠️ COPIA SUBITO IL SECRET** (Value column) - non sarà visibile dopo!

### Passo 5: Configura Permissions

1. Vai su **API permissions**
2. Click **+ Add a permission**
3. **Microsoft Graph** → **Delegated permissions**

Aggiungi queste permissions:
- ✅ `Mail.Read`
- ✅ `Mail.ReadWrite`
- ✅ `Mail.Send`
- ✅ `Calendars.Read`
- ✅ `Calendars.ReadWrite`
- ✅ `Contacts.Read`
- ✅ `Contacts.ReadWrite`
- ✅ `User.Read`
- ✅ `offline_access` (per refresh token)

4. Click **Add permissions**
5. ⚠️ **Non serve** "Grant admin consent" per test personali

### Passo 6: Copia Credenziali

Vai su **Overview** e copia:
- **Application (client) ID**: `xxxxx-xxxx-xxxx-xxxx-xxxxx`
- **Directory (tenant) ID**: `xxxxx-xxxx-xxxx-xxxx-xxxxx`
- **Client Secret** (copiato prima)

### Passo 7: Aggiungi al `.env`

```env
# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_REDIRECT_URI=http://localhost:3001/dashboard/providers
```

---

## 3. Verifica Configurazione

### Backend `.env` completo

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mailagent"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=http://localhost:3001/dashboard/providers

# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_REDIRECT_URI=http://localhost:3001/dashboard/providers

# Encryption (per token storage)
ENCRYPTION_KEY=your-32-character-encryption-key!!

# AI (Mistral)
MISTRAL_API_KEY=your-mistral-api-key
MISTRAL_MODEL=mistral-large-latest

# Public URLs (for webhooks - optional)
API_PUBLIC_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Webhook URLs (optional - per real-time sync)
GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT/topics/gmail-notifications
MICROSOFT_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/webhooks/microsoft/notifications
```

---

## 4. Test OAuth Flow

### Test Google OAuth

1. **Avvia frontend e backend:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run start:dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. **Accedi al frontend:** `http://localhost:3001`

3. **Vai alla sezione Providers**

4. **Click su "Connect Google"**

5. **Autorizza l'app:**
   - Seleziona account Gmail
   - Accetta permissions
   - Verrai reindirizzato a `/dashboard/providers?code=xxx`

6. **Frontend completerà automaticamente la connessione**

### Test Microsoft OAuth

Stesso processo, ma click su **"Connect Microsoft"**

---

## 5. Troubleshooting

### Errore: "redirect_uri_mismatch" (Google)

**Problema:** Redirect URI non configurato correttamente

**Soluzione:**
1. Vai su Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client ID
3. Verifica Authorized redirect URIs contiene **esattamente**:
   ```
   http://localhost:3001/dashboard/providers
   ```
4. Salva e riprova (può servire qualche minuto per propagazione)

### Errore: "AADSTS50011" (Microsoft)

**Problema:** Redirect URI non autorizzato

**Soluzione:**
1. Azure Portal → App registrations → tua app
2. Authentication
3. Verifica Redirect URIs contiene:
   ```
   http://localhost:3001/dashboard/providers
   ```
4. Salva e riprova

### Errore: "invalid_client" (Microsoft)

**Problema:** Client Secret errato o scaduto

**Soluzione:**
1. Crea nuovo Client Secret
2. Aggiorna `.env` con nuovo secret
3. Riavvia backend

### Errore: "access_denied"

**Problema:** Utente non autorizzato o ha rifiutato permissions

**Soluzione Google:**
- Aggiungi utente a Test users (se External)

**Soluzione Microsoft:**
- Verifica account Microsoft valido
- Riprova autorizzazione

---

## 6. API Endpoints (Riferimento)

### Google

**Get Auth URL:**
```http
POST http://localhost:3000/providers/google/auth-url
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "scopes": [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar"
  ]
}
```

**Connect Provider:**
```http
POST http://localhost:3000/providers/google/connect
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "code": "4/0AeanSxxxxxxxxxxxxx",
  "redirectUri": "http://localhost:3001/dashboard/providers"
}
```

### Microsoft

**Get Auth URL:**
```http
POST http://localhost:3000/providers/microsoft/auth-url
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "scopes": [
    "Mail.Read",
    "Calendars.Read",
    "offline_access"
  ]
}
```

**Connect Provider:**
```http
POST http://localhost:3000/providers/microsoft/connect
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "code": "M.C507_BAY.xxxxxxxxx",
  "redirectUri": "http://localhost:3001/dashboard/providers"
}
```

---

## 7. Scopes Consigliati

### Google Scopes

```javascript
[
  "https://www.googleapis.com/auth/gmail.readonly",      // Leggi email
  "https://www.googleapis.com/auth/gmail.modify",        // Modifica email
  "https://www.googleapis.com/auth/calendar",            // Gestisci calendar
  "https://www.googleapis.com/auth/contacts.readonly"    // Leggi contatti
]
```

### Microsoft Scopes

```javascript
[
  "Mail.Read",
  "Mail.ReadWrite",
  "Calendars.Read",
  "Calendars.ReadWrite",
  "Contacts.Read",
  "User.Read",
  "offline_access"
]
```

---

## 8. Next Steps

Dopo aver configurato OAuth:

1. ✅ Collega account Google
2. ✅ Collega account Microsoft
3. ✅ Verifica sync automatico parte
4. ✅ Usa monitoring script:
   ```bash
   node backend/scripts/monitor-sync.js --watch
   ```

---

**Setup completato! 🎉**

Torna alla [TESTING_GUIDE.md](./TESTING_GUIDE.md) per continuare i test.
