# MailAgent - Gmail OAuth2 Setup Guide

Guida completa per configurare l'autenticazione Gmail (Google) su MailAgent.

## 📋 Indice

1. [Creare un Progetto Google Cloud](#creare-un-progetto-google-cloud)
2. [Abilitare le API Necessarie](#abilitare-le-api-necessarie)
3. [Configurare la Schermata di Consenso](#configurare-la-schermata-di-consenso)
4. [Generare le Credenziali](#generare-le-credenziali)
5. [Aggiornare il File .env](#aggiornare-il-file-env)
6. [Testare la Configurazione](#testare-la-configurazione)
7. [Troubleshooting](#troubleshooting)

---

## Creare un Progetto Google Cloud

### Step 1: Accedere a Google Cloud Console

1. Vai a: https://console.cloud.google.com/
2. Accedi con il tuo account Google (crea uno se necessario)
3. Se è la prima volta, accetta i termini di servizio

### Step 2: Creare un Nuovo Progetto

1. In alto a sinistra, dovresti vedere: **"Select a Project"**
2. Fai clic su di esso
3. Fai clic su: **"NEW PROJECT"**

**Verrà mostrato un form:**

```
Create a new project
├── Project name: [_____________________] ← Inserisci il nome
├── Organization: [dropdown]
├── Location: [dropdown - lasciar vuoto]
└── [Create]
```

**Compila il form:**

**Project name:**
```
MailAgent
```

**Organization:**
Seleziona la tua organizzazione (o lascio il default)

Fai clic su: **"Create"**

**Aspetta 30-60 secondi** mentre il progetto viene creato.

### Step 3: Selezionare il Nuovo Progetto

Una volta creato, selezionalo dal dropdown in alto:

```
Select a Project
├── MailAgent ← Fai clic qui
```

---

## Abilitare le API Necessarie

### Step 4: Aprire l'API Library

Nel menu sinistro, fai clic su: **"APIs & Services"** → **"Library"**

### Step 5: Abilitare Gmail API

1. Nella barra di ricerca, digita: **"Gmail API"**
2. Fai clic sul primo risultato
3. Fai clic su: **"ENABLE"** (pulsante blu)

**Aspetta qualche secondo.** Dovresti vedere:

```
Gmail API
├── MANAGE
│   ├── Overview
│   ├── Credentials ← Lo useremo dopo
│   ├── OAuth consent screen
│   └── ...
└── Status: API enabled ✅
```

### Step 6: Abilitare Google+ API (Opzionale, per info utente)

1. Torna a: **APIs & Services** → **Library**
2. Digita: **"Google+ API"**
3. Fai clic e abilita

---

## Configurare la Schermata di Consenso

### Step 7: Creare la Schermata OAuth Consent

Nel menu sinistro, fai clic su: **"OAuth consent screen"**

Vedrai:

```
OAuth consent screen
├── User Type
│   ├── ○ External ← Seleziona questa
│   └── ○ Internal
├── [CREATE]
```

Seleziona: **"External"**

Fai clic su: **"CREATE"**

### Step 8: Compilare i Dettagli dell'App

Dovresti vedere un form grande:

```
OAuth consent screen
├── Required information
│   ├── App name: [_____________________]
│   ├── User support email: [_____________________]
│   ├── App logo: [Upload image] (opzionale)
│   └── App domain info
│       ├── Application home page: [________________]
│       ├── Application privacy policy link: [________________]
│       └── Application terms of service link: [________________]
│
└── Developer contact information
    └── Email addresses: [_____________________]
```

**Compila i campi obbligatori:**

**App name:**
```
MailAgent
```

**User support email:**
```
your-email@example.com
```

**Application home page:**
```
http://localhost:3001
```
(O il tuo dominio di produzione)

**Developer contact information:**
```
your-email@example.com
```

Fai clic su: **"SAVE AND CONTINUE"**

### Step 9: Aggiungere i Scopes

Sulla pagina successiva:

```
Scopes
├── Add or remove scopes
├── [ADD SCOPES]
```

Fai clic su: **"ADD SCOPES"**

Vedrai una lista di scopes disponibili. Seleziona:

```
✓ https://www.googleapis.com/auth/gmail.readonly
✓ https://www.googleapis.com/auth/gmail.modify
✓ https://www.googleapis.com/auth/userinfo.email
✓ https://www.googleapis.com/auth/userinfo.profile
```

(Questi permettono di leggere/scrivere email e accedere ai dati dell'utente)

Fai clic su: **"UPDATE"**

Fai clic su: **"SAVE AND CONTINUE"**

### Step 10: Aggiungere Utenti di Test (Opzionale per Dev)

```
Test users
├── Add users
├── [Add Users]
```

Se vuoi, puoi aggiungere il tuo email come utente di test per fare testing senza pubblicare l'app.

Fai clic su: **"SAVE AND CONTINUE"**

Dovresti vedere un riassunto della configurazione. Fai clic su: **"BACK TO DASHBOARD"**

---

## Generare le Credenziali

### Step 11: Creare Credenziali OAuth

Nel menu sinistro, fai clic su: **"APIs & Services"** → **"Credentials"**

Vedrai:

```
Credentials
├── + CREATE CREDENTIALS
└── [v] (dropdown)
```

Fai clic su: **"+ CREATE CREDENTIALS"**

Seleziona: **"OAuth client ID"**

Potrebbe chiederti di configurare il consenso screen prima (che abbiamo già fatto):

```
⚠️  You must configure the OAuth consent screen
├── [GO TO OAUTH CONSENT SCREEN]
```

Ignora questo se hai già completato il consent screen.

### Step 12: Selezionare il Tipo di Applicazione

```
Create OAuth 2.0 client ID
├── Application type
│   ├── ○ Web application ← Seleziona questa
│   ├── ○ Desktop app
│   ├── ○ iOS
│   ├── ○ Android
│   └── ○ Chrome App
│
├── Authorized redirect URIs
│   ├── [_________________________________]
│   └── [+ ADD URI]
│
└── [CREATE] [CANCEL]
```

Seleziona: **"Web application"**

### Step 13: Aggiungere il Redirect URI

Sotto **"Authorized redirect URIs"**, aggiungi:

**Per sviluppo locale:**
```
http://localhost:3000/auth/gmail/callback
```

**Per produzione:**
```
https://your-domain.com/auth/gmail/callback
```

Fai clic su: **"+ ADD URI"** per aggiungere più URI

Dovresti vederne almeno uno:
```
✓ http://localhost:3000/auth/gmail/callback
```

Fai clic su: **"CREATE"**

### Step 14: Copiare le Credenziali

Una finestra popup mostrerà:

```
Your OAuth 2.0 client credentials
├── Client ID: 1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
└── Client secret: GOCSPX-1234567890abcdefghijklmn
```

**IMPORTANTE**: Copia questi valori immediatamente!

- **Client ID** → GMAIL_CLIENT_ID
- **Client secret** → GMAIL_CLIENT_SECRET

Farai clic su: **"OK"** per chiudere la finestra.

---

## Aggiornare il File .env

### Step 15: Aggiornare le Variabili d'Ambiente

Apri il file `.env` nella radice del progetto:

```bash
d:\MailAgent\.env
```

Trova queste linee:

```env
# ===== OAUTH2 CREDENTIALS (Gmail) =====
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
```

Sostituiscile con i tuoi valori:

```env
# ===== OAUTH2 CREDENTIALS (Gmail) =====
GMAIL_CLIENT_ID=1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-1234567890abcdefghijklmn
```

### Step 16: Salvare e Riavviare

Dopo aver aggiornato `.env`:

```bash
# Riavvia il backend per caricare le nuove variabili
docker-compose restart backend
```

Verifica che il backend si sia avviato correttamente:

```bash
docker-compose logs backend | tail -20
```

Dovresti vedere:

```
🚀 Application is running on http://backend:3000
```

---

## Testare la Configurazione

### Step 17: Verificare i Log

Controlla che non ci siano errori:

```bash
docker-compose logs backend | grep -i "gmail\|oauth"
```

Se configurato correttamente, non dovresti vedere errori.

### Step 18: Testare il Login Gmail (Manuale)

Se hai aggiunto il pulsante Gmail Login nel frontend:

1. Vai a: http://localhost:3001/auth/login
2. Fai clic su: **"Login with Google"** (se disponibile)
3. Dovresti essere reindirizzato a: `https://accounts.google.com/...`
4. Seleziona il tuo account Gmail
5. Fai clic su: **"Allow"** per autorizzare MailAgent
6. Dovresti essere reindirizzato a: `http://localhost:3000/auth/gmail/callback`
7. Se tutto va bene, sarai loggato in MailAgent

### Step 19: Test via API (Curl)

Per testare manualmente (senza UI):

```bash
# 1. Ottenere il refresh token (richiede interazione utente)
# Questo è il flusso completo da fare nel browser

# Apri nel browser:
https://accounts.google.com/o/oauth2/v2/auth?
client_id=YOUR_CLIENT_ID&
redirect_uri=http://localhost:3000/auth/gmail/callback&
response_type=code&
scope=https://www.googleapis.com/auth/gmail.readonly

# 2. Dopo aver cliccato "Allow", ottieni il code
# Es: http://localhost:3000/auth/gmail/callback?code=4/0A1234...

# 3. Scambia il code con un access token
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=4/0A1234..." \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:3000/auth/gmail/callback"

# Dovresti ricevere:
# {
#   "access_token": "ya29.a0Afd...",
#   "expires_in": 3599,
#   "refresh_token": "1//0gp...",
#   "scope": "https://www.googleapis.com/auth/gmail.readonly",
#   "token_type": "Bearer"
# }
```

---

## Problemi Comuni e Soluzioni

### Errore: "redirect_uri_mismatch"

**Problema**: Il redirect URI nel backend non corrisponde a quello registrato su Google.

**Soluzione**:
1. Verifica il redirect URI su Google Cloud Console
2. Verifica il valore della configurazione in `backend/src/config/configuration.ts`
3. Assicurati che siano identici (incluso il protocollo http/https)

```typescript
// In configuration.ts
oauth: {
  gmail: {
    redirectUri: `${api.url}/auth/gmail/callback`, // Deve essere: http://localhost:3000/auth/gmail/callback
  }
}
```

### Errore: "invalid_client"

**Problema**: Il CLIENT_ID o SECRET sono incorretti o copiati male.

**Soluzione**:
1. Torna su Google Cloud Console
2. Vai a: **APIs & Services** → **Credentials**
3. Copia di nuovo i valori
4. Assicurati di non aver aggiunto spazi o caratteri extra
5. Aggiorna `.env`
6. Riavvia: `docker-compose restart backend`

### Errore: "access_denied" o "The user did not consent"

**Problema**: L'utente ha rifiutato l'accesso, o l'app non è configurata correttamente.

**Soluzione**:
1. Verifica che la **OAuth consent screen** sia configurata
2. Verifica che gli **scopes** siano corretti
3. Se l'app è in "External", solo gli utenti di test possono accedere
   - Aggiungi il tuo email come test user
   - Oppure pubblica l'app (per produzione)

### Errore: "403 Forbidden - Gmail API not enabled"

**Problema**: La Gmail API non è abilitata nel progetto Google Cloud.

**Soluzione**:
1. Vai a: **APIs & Services** → **Library**
2. Cerca: **"Gmail API"**
3. Fai clic e abilita: **"ENABLE"**
4. Aspetta 1-2 minuti per la propagazione
5. Riprova

---

## Configurazione per Produzione

Se stai distribuendo in produzione, devi:

### Step 1: Aggiungere il Redirect URI di Produzione

1. Su Google Cloud Console, vai a: **APIs & Services** → **Credentials**
2. Fai clic sulla tua credenziale OAuth
3. Aggiungi un nuovo redirect URI:

```
https://your-domain.com/auth/gmail/callback
```

Fai clic: **SAVE**

### Step 2: Pubblicare l'App (se non già fatto)

Se l'app è in "External", sarà visibile solo ai test user.

Per permettere a tutti di accedere:

1. Vai a: **OAuth consent screen**
2. Cambia lo stato da "Testing" a "In production"
3. Google probabilmente dovrà verificare l'app

### Step 3: Aggiornare il .env per Produzione

```env
API_HOST=your-domain.com
API_PORT=3000

GMAIL_CLIENT_ID=your-client-id
GMAIL_CLIENT_SECRET=your-client-secret
```

Il sistema costruirà automaticamente:
```
GMAIL_REDIRECT_URI=https://your-domain.com:3000/auth/gmail/callback
```

### Step 4: Verificare HTTPS

Assicurati che il tuo server abbia:
- ✅ Certificato SSL/TLS valido
- ✅ HTTPS configurato in Nginx
- ✅ Dominio risolto correttamente

---

## Flusso di Autenticazione Gmail

Ecco come funziona il processo:

```
1. User clicks "Login with Google"
   ↓
2. Frontend redirects to:
   https://accounts.google.com/o/oauth2/v2/auth?
   client_id=YOUR_CLIENT_ID&
   redirect_uri=http://localhost:3000/auth/gmail/callback&
   response_type=code&
   scope=https://www.googleapis.com/auth/gmail.readonly
   ↓
3. User logs in on Google login page (if needed)
   ↓
4. User authorizes MailAgent to access their email
   ↓
5. Google redirects back to:
   http://localhost:3000/auth/gmail/callback?code=4/0A1234...
   ↓
6. Backend exchanges code for tokens:
   POST https://oauth2.googleapis.com/token
   code=4/0A1234...&
   client_id=YOUR_CLIENT_ID&
   client_secret=YOUR_CLIENT_SECRET&
   grant_type=authorization_code
   ↓
7. Google returns access_token and refresh_token
   ↓
8. Backend creates MailAgent session
   ↓
9. User is logged in! ✅
```

---

## Scopes Disponibili

A seconda di quello che vuoi fare, puoi richiedere diversi scopes:

| Scope | Permette | Uso |
|-------|----------|-----|
| `gmail.readonly` | Leggere email | Email sync (read-only) |
| `gmail.modify` | Leggere, scrivere, eliminare email | Email sync (read-write) |
| `gmail.send` | Inviare email | Send emails only |
| `userinfo.email` | Leggere email dell'utente | Auth |
| `userinfo.profile` | Leggere nome, foto, ecc. | User profile |

Nel nostro caso, usiamo:
```env
gmail.readonly    # Leggere email
gmail.modify      # Leggere e scrivere email
userinfo.email    # Autenticazione
userinfo.profile  # Profilo utente
```

---

## Integrazione con il Codice

Se vuoi testare l'integrazione programmaticamente:

### Test in Node.js

```javascript
// test-gmail-oauth.js
const axios = require('axios');

async function testGmailOAuth() {
  const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
  const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
  const REFRESH_TOKEN = 'your-refresh-token-from-oauth-flow'; // Ottenuto dal flusso OAuth

  try {
    // 1. Refresh access token using refresh token
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token'
      }
    );

    console.log('✅ Access Token refreshed');
    const accessToken = tokenResponse.data.access_token;

    // 2. Get Gmail profile
    const profileResponse = await axios.get(
      'https://www.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    console.log('✅ Gmail API accessible');
    console.log('Email:', profileResponse.data.emailAddress);
    console.log('Messages:', profileResponse.data.messagesTotal);

    // 3. List emails
    const mailResponse = await axios.get(
      'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    console.log('✅ Emails retrieved');
    console.log('Recent messages:', mailResponse.data.messages?.length || 0);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testGmailOAuth();
```

Esegui con:
```bash
node test-gmail-oauth.js
```

---

## Checklist di Configurazione

- [ ] Account Google creato
- [ ] Google Cloud Console accessibile
- [ ] Progetto "MailAgent" creato
- [ ] Gmail API abilitata
- [ ] Google+ API abilitata (opzionale)
- [ ] OAuth consent screen configurato
- [ ] Scopes aggiunti (gmail.readonly, gmail.modify, userinfo.email)
- [ ] OAuth client ID creato (tipo: Web application)
- [ ] GMAIL_CLIENT_ID copiato
- [ ] GMAIL_CLIENT_SECRET copiato
- [ ] Redirect URI configurato (localhost per dev)
- [ ] `.env` aggiornato con le credenziali
- [ ] Backend riavviato
- [ ] Log verificati (nessun errore)
- [ ] Nessuno spazio extra nel .env
- [ ] Produzione: Redirect URI aggiunto per dominio
- [ ] Produzione: App pubblicata (se necessario)
- [ ] Produzione: HTTPS verificato

---

## Domande Frequenti

**Q: Devo pubblicare l'app per testarla localmente?**
A: No. Durante il testing, puoi aggiungere il tuo email come "Test user" nella OAuth consent screen.

**Q: Posso usare Gmail personale o solo account business?**
A: Entrambi funzionano. Gmail personale usa @gmail.com, business usa @domain.com.

**Q: Quanto tempo impiega la propagazione dei dati su Google?**
A: Di solito 1-5 minuti. Se non funziona subito, aspetta un po' e riprova.

**Q: Come faccio a revocare il token?**
A: Su myaccount.google.com, vai a **Security** → **Your apps & sites** e disconnetti MailAgent.

**Q: Posso ottenere il refresh token senza interazione utente?**
A: No. Il refresh token richiede il consenso dell'utente almeno una volta.

**Q: Qual è la durata dell'access token?**
A: Solitamente 1 ora. Dopo scade e devi usare il refresh token per ottenerne uno nuovo.

---

## Risorse Utili

- [Google Cloud Console](https://console.cloud.google.com/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 Flow](https://developers.google.com/identity/protocols/oauth2)
- [Gmail Scopes](https://developers.google.com/gmail/api/auth/scopes)
- [Google Workspace Account Types](https://support.google.com/a/answer/9308914)

---

## Riepilogo

Hai imparato a:

✅ Creare un progetto Google Cloud
✅ Abilitare le API necessarie
✅ Configurare la schermata di consenso
✅ Generare GMAIL_CLIENT_ID e SECRET
✅ Configurare i redirect URI
✅ Integrare con MailAgent
✅ Testare la configurazione
✅ Risolvere i problemi comuni
✅ Preparare per la produzione

**Prossimo passo**: Configura anche Microsoft OAuth seguendo [OAUTH_MICROSOFT_SETUP.md](OAUTH_MICROSOFT_SETUP.md)

---

**Ultima modifica**: Gennaio 2025
**Progetto**: MailAgent
