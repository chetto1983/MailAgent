# ✅ Configurazione OAuth per Vercel - Passi Finali

## 🌐 URL Vercel Configurato

```
https://mail-agent-indol.vercel.app
```

## ⚙️ Backend `.env` Aggiornato

```env
FRONTEND_URL=https://mail-agent-indol.vercel.app
GOOGLE_REDIRECT_URI=https://cordell-uncompounded-elene.ngrok-free.dev/auth/gmail/callback
MICROSOFT_REDIRECT_URI=https://cordell-uncompounded-elene.ngrok-free.dev/auth/microsoft/callback
CORS_ALLOWED_ORIGINS=https://mail-agent-indol.vercel.app,
```

> ℹ️ I redirect URI puntano **sempre al backend** (`/auth/{provider}/callback`).
> Dopo aver ricevuto il codice, il backend reindirizza automaticamente il browser a
> `https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=...`.

---

## ✅ Passi da Completare

### 1. Google Cloud Console - Aggiungi Redirect URI

1. Vai su **APIs & Services → Credentials**
2. Apri il tuo **OAuth 2.0 Client ID**
3. Aggiungi **entrambi** gli URL:

```
https://cordell-uncompounded-elene.ngrok-free.dev/auth/gmail/callback
http://localhost:3000/auth/gmail/callback
```

Google deve conoscere solo l’endpoint del backend (pubblico e locale). La dashboard non va registrata.

### 2. Azure Portal - Aggiungi Redirect URI

1. Vai su **Azure Active Directory (Entra ID) → App registrations**
2. Apri l’app e scegli **Authentication → Web**
3. Inserisci gli stessi callback del backend:

```
https://cordell-uncompounded-elene.ngrok-free.dev/auth/microsoft/callback
http://localhost:3000/auth/microsoft/callback
```

Azure rifiuta URL con querystring, quindi deve comparire solo l’endpoint `/auth/microsoft/callback`.

### 3. Riavvia il backend

```bash
cd backend
npm run start:dev
# oppure docker-compose restart backend
```

---

## 🔄 Test OAuth Flow

### Google

1. Apri `https://mail-agent-indol.vercel.app`
2. Vai su **Dashboard → Providers**
3. Clicca **Connect Google Account**
4. Dopo il consenso, Google richiama `https://cordell-uncompounded-elene.ngrok-free.dev/auth/gmail/callback`
5. Il backend risponde con un redirect a `https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=google&code=...`
6. Il frontend invia `POST /providers/google/connect` e salva l’account

### Microsoft

1. Stessi passi, ma scegli **Connect Microsoft Account**
2. Azure richiama `https://cordell-uncompounded-elene.ngrok-free.dev/auth/microsoft/callback`
3. Il backend reindirizza alla dashboard con `provider=microsoft`
4. Il frontend completa la connessione tramite `POST /providers/microsoft/connect`

---

## 🛠️ Troubleshooting

- **redirect_uri_mismatch / invalid_request**  
  Verifica che Google/Azure **e** il file `.env` contengano esattamente gli stessi callback (`https://cordell.../auth/{provider}/callback` e `http://localhost:3000/auth/{provider}/callback`).

- **La dashboard mostra `provider=undefined`**  
  Succede solo se il backend non ha potuto determinare il provider. Assicurati di aver usato il pulsante corretto (Google/Microsoft) e di non aver manipolato manualmente l’URL.

- **Account non salvato dopo l’OAuth**  
  Controlla i log del backend: se il redirect viene bloccato (CORS o URL errato), aggiorna `FRONTEND_URL` e `CORS_ALLOWED_ORIGINS` con l’URL Vercel.

Con questi passaggi l’integrazione OAuth via Vercel è allineata al comportamento attuale del backend. 🚀
