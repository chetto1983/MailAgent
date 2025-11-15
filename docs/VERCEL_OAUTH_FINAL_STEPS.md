# ✅ Configurazione OAuth per Vercel - Passi Finali

## 🎯 URL Vercel Configurato

```
https://mail-agent-indol.vercel.app
```

## ✅ Backend `.env` Aggiornato

Le seguenti variabili sono state configurate nel file `backend/.env`:

```env
FRONTEND_URL=https://mail-agent-indol.vercel.app
GOOGLE_REDIRECT_URI=https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts
MICROSOFT_REDIRECT_URI=https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts
CORS_ALLOWED_ORIGINS=https://mail-agent-indol.vercel.app,
```

> ℹ️ **Nota:** mantieni le variabili `GOOGLE_REDIRECT_URI` e `MICROSOFT_REDIRECT_URI` senza il parametro `provider`.
> Il backend aggiunge automaticamente `&provider=google|microsoft` quando genera l'URL di autorizzazione e quando gestisce i callback.
> Per questo motivo è necessario registrare su Google/Microsoft gli URL completi che includono `&provider=...`.

---

## 🔧 Passi da Completare

### 1. Google Cloud Console - Aggiungi Redirect URI

**Link:** [https://console.cloud.google.com/](https://console.cloud.google.com/)

#### Passi:

1. Vai su **APIs & Services** → **Credentials**
2. Click sul tuo OAuth 2.0 Client ID esistente
3. Nella sezione **Authorized redirect URIs**, aggiungi ENTRAMBI questi URI:

```
https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=google
https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts
```

**Nota:** Devi aggiungere entrambi! Il primo (con `&provider=google`) è quello che userà il backend, il secondo è un fallback.

4. **Salva**

#### Screenshot della configurazione:

```
Authorized redirect URIs:
  ✅ https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=google (NUOVO - richiesto!)
  ✅ https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts
  ✅ http://localhost:3001/dashboard/settings?section=accounts&provider=google (mantieni per test locale)
  ✅ http://localhost:3001/dashboard/settings?section=accounts (mantieni per test locale)
```

**IMPORTANTE:** Il parametro `&provider=google` è necessario per far sapere al frontend quale provider sta connettendo!

---

### 2. Azure Portal - Aggiungi Redirect URI

**Link:** [https://portal.azure.com/](https://portal.azure.com/)

#### Passi:

1. Vai su **Azure Active Directory** (o **Microsoft Entra ID**)
2. **App registrations** → Seleziona la tua app
3. **Authentication** → **Platform configurations** → **Web**
4. Nella sezione **Redirect URIs**, aggiungi ENTRAMBI questi URI:

```
https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=microsoft
https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts
```

**Nota:** Devi aggiungere entrambi! Il primo (con `&provider=microsoft`) è quello che userà il backend, il secondo è un fallback.

5. **Salva**

#### Screenshot della configurazione:

```
Redirect URIs:
  ✅ https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=microsoft (NUOVO - richiesto!)
  ✅ https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts
  ✅ http://localhost:3001/dashboard/settings?section=accounts&provider=microsoft (mantieni per test locale)
  ✅ http://localhost:3001/dashboard/settings?section=accounts (mantieni per test locale)
```

**IMPORTANTE:** Il parametro `&provider=microsoft` è necessario per far sapere al frontend quale provider sta connettendo!

---

### 3. Riavvia Backend

Dopo aver salvato il `.env`, riavvia il backend per applicare le modifiche:

```bash
cd backend
npm run start:dev
```

Oppure se usi Docker:

```bash
docker-compose restart backend
```

---

## 🧪 Test OAuth Flow

### Test Google

1. Apri **https://mail-agent-indol.vercel.app**
2. Login con le tue credenziali
3. Vai su **Dashboard** → **Providers**
4. Click su **"Connect Google Account"**
5. Autorizza l'app Google
6. Verrai reindirizzato a:
   ```
   https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts?code=4/0AeanS...
   ```
7. Il frontend chiamerà automaticamente:
   ```
   POST https://cordell-uncompounded-elene.ngrok-free.dev/providers/google/connect
   ```
8. Provider salvato ✅

### Test Microsoft

1. Stessa procedura, ma click su **"Connect Microsoft Account"**
2. Autorizza l'app Microsoft
3. Verrai reindirizzato a:
   ```
   https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts?code=M.C507_BAY...
   ```
4. Provider salvato ✅

---

## ⚠️ Troubleshooting

### Errore: OAuth redirect funziona ma account non vengono salvati

**Causa:** Il redirect URI non include il parametro `provider`, quindi il frontend non sa quale provider connettere

**Soluzione:**
1. Aggiungi il redirect URI con il parametro provider:
   - **Google:** `https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=google`
   - **Microsoft:** `https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=microsoft`
2. Riavvia il backend (già fatto ✅)
3. Riprova la connessione

### Errore: "redirect_uri_mismatch" (Google)

**Causa:** Redirect URI non configurato correttamente in Google Cloud Console

**Soluzione:**
1. Verifica di aver salvato **esattamente**:
   ```
   https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=google
   https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts
   ```
   (Nota: NO trailing slash `/` alla fine!)
2. Aspetta 1-2 minuti per la propagazione
3. Riprova

### Errore: "AADSTS50011" (Microsoft)

**Causa:** Redirect URI non configurato in Azure Portal

**Soluzione:**
1. Azure Portal → App registrations → tua app
2. Authentication → Web → Redirect URIs
3. Aggiungi entrambi:
   ```
   https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts&provider=microsoft
   https://mail-agent-indol.vercel.app/dashboard/settings?section=accounts
   ```
4. Salva e riprova

### Errore: CORS (Frontend → Backend)

**Causa:** Backend blocca richieste da Vercel

**Soluzione:**
Il CORS è già configurato nel `.env`:
```env
CORS_ALLOWED_ORIGINS=https://mail-agent-indol.vercel.app,...
```

Verifica che il backend sia riavviato dopo aver modificato `.env`.

### Backend non raggiungibile da Vercel

**Problema:** Frontend su Vercel non può chiamare `localhost:3000`

**Soluzione:** Usi già ngrok! ✅
```env
API_PUBLIC_URL=https://cordell-uncompounded-elene.ngrok-free.dev
```

Assicurati che:
1. ngrok sia avviato: `ngrok http 3000`
2. Frontend Vercel usi l'URL ngrok nelle chiamate API
3. Environment variable su Vercel:
   ```
   NEXT_PUBLIC_API_URL=https://cordell-uncompounded-elene.ngrok-free.dev
   ```

---

## 📋 Checklist Finale

Prima di testare, verifica:

- [ ] ✅ `.env` aggiornato con redirect URI Vercel
- [ ] ✅ Google Cloud Console → Redirect URI aggiunto
- [ ] ✅ Azure Portal → Redirect URI aggiunto
- [ ] ✅ Backend riavviato
- [ ] ✅ ngrok attivo (se backend locale)
- [ ] ✅ Vercel environment variables configurate

---

## 🚀 Pronto per il Test!

Ora puoi:

1. Vai su **https://mail-agent-indol.vercel.app**
2. Login
3. Collega account Google
4. Collega account Microsoft
5. Osserva il monitoring:
   ```bash
   cd backend
   node scripts/monitor-sync.js --watch
   ```

---

## 📊 Dopo il Collegamento

Una volta collegati gli account, vedrai nel monitoring:

```
📧 PROVIDERS STATUS
--------------------------------------------------------------------------------
  google          ✅ Active       Count: 1
  microsoft       ✅ Active       Count: 1

🎯 SMART SYNC - PRIORITY DISTRIBUTION
--------------------------------------------------------------------------------
  Priority 1 - High (3min)              2 providers

📬 EMAILS (Last 24 hours)
--------------------------------------------------------------------------------
  Total: 0 emails  (aumenterà dopo prima sincronizzazione)
```

Il sistema:
1. ✅ Avvierà automaticamente la prima sincronizzazione
2. ✅ Calcolerà l'activity rate
3. ✅ Assegnerà la priorità dinamica
4. ✅ Schedulerà i prossimi sync

---

**Tutto configurato! 🎉**

Procedi con i test OAuth e poi controlla il monitoring per vedere la sincronizzazione in azione.
