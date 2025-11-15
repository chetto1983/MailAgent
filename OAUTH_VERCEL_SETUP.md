# ⚙️ OAuth Setup per Frontend su Vercel

## Architettura Deployment

- **Frontend (Vercel):** `https://your-app.vercel.app`
- **Backend/API pubblico:** `https://your-backend-url.com` (oppure `http://localhost:3000` in locale)
- **Callback OAuth:** `https://your-backend-url.com/auth/{provider}/callback`

> 📌 Tutti i provider devono richiamare **il backend**. Sarà poi il backend a reindirizzare il browser alla dashboard (`/dashboard/settings?section=accounts&provider=...`).

---

## 1. Google OAuth

### Configura Google Cloud Console

1. Apri [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Vai su **APIs & Services → Credentials**
3. Apri il tuo **OAuth 2.0 Client ID**
4. In **Authorized redirect URIs**, aggiungi:

```
https://your-backend-url.com/auth/gmail/callback
http://localhost:3000/auth/gmail/callback
```

### Aggiorna `backend/.env`

```env
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://your-backend-url.com/auth/gmail/callback
FRONTEND_URL=https://your-app.vercel.app
```

---

## 2. Microsoft OAuth

### Configura Azure Portal (Entra ID)

1. Apri [https://portal.azure.com/](https://portal.azure.com/)
2. Vai su **Azure Active Directory → App registrations**
3. Seleziona l’app → **Authentication → Web**
4. In **Redirect URIs**, aggiungi:

```
https://your-backend-url.com/auth/microsoft/callback
http://localhost:3000/auth/microsoft/callback
```

### Aggiorna `backend/.env`

```env
MICROSOFT_CLIENT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxx-xxxx-xxxx-xxxx-xxxxx
MICROSOFT_REDIRECT_URI=https://your-backend-url.com/auth/microsoft/callback
```

---

## 3. CORS Backend

Assicurati che il backend consenta richieste dal dominio Vercel:

```ts
app.enableCors({
  origin: [
    'http://localhost:3001',
    'https://your-app.vercel.app',
    /https:\/\/.*\.vercel\.app$/,
  ],
  credentials: true,
});
```

---

## 4. Variabili d'ambiente su Vercel

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

(Oppure `http://localhost:3000` se utilizzi un tunnel come ngrok durante i test.)

---

## 5. Test del Flusso

1. Apri `https://your-app.vercel.app`
2. Vai su **Dashboard → Providers**
3. Clicca su **Connect Google/Microsoft Account**
4. Dopo l’autorizzazione il provider richiama il backend (`/auth/gmail|microsoft/callback`)
5. Il backend reindirizza alla dashboard con `?provider=...&code=...`
6. Il frontend chiama `POST /providers/{provider}/connect` e salva l’account

---

## 6. Troubleshooting

- **redirect_uri_mismatch / invalid_request** → assicurati che Google/Azure e `.env` puntino agli stessi callback del backend (pubblico e locale).
- **CORS errors** → aggiorna `CORS_ALLOWED_ORIGINS` e riavvia il backend.
- **Provider non salvato** → controlla i log del backend; se il redirect alla dashboard non avviene, verifica `FRONTEND_URL`.

Seguendo questi passi il flusso OAuth funziona sia in locale sia con il frontend su Vercel. 🚀
