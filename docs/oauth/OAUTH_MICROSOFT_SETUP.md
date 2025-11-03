# MailAgent - Microsoft OAuth2 Setup Guide

Guida completa per configurare l'autenticazione Microsoft (Outlook, Exchange) su MailAgent.

## 📋 Indice

1. [Registrare l'App su Azure](#registrare-lapplicazione-su-azure)
2. [Generare le Credenziali](#generare-le-credenziali)
3. [Configurare i Redirect URI](#configurare-i-redirect-uri)
4. [Aggiornare il File .env](#aggiornare-il-file-env)
5. [Testare la Configurazione](#testare-la-configurazione)
6. [Troubleshooting](#troubleshooting)

---

## Registrare l'Applicazione su Azure

### Step 1: Accedere ad Azure Portal

1. Vai a: https://portal.azure.com/
2. Accedi con il tuo account Microsoft (crea uno se necessario)
3. Se richiesto, accetta i termini di servizio

### Step 2: Navigare a Entra ID

1. Nella barra di ricerca in alto, digita: **"Entra ID"** (o "Azure Active Directory")
2. Fai clic sul primo risultato
3. Dovresti vedere la dashboard di Entra ID

**Schermata attesa:**
```
Entra ID (Azure Active Directory)
├── Overview
├── Manage
│   ├── App registrations ← Click here
│   ├── Enterprise applications
│   └── ...
├── Monitoring
└── ...
```

### Step 3: Creare una Nuova App Registration

1. Nel menu sinistro, fai clic su: **"App registrations"**
2. Fai clic su: **"+ New registration"** (in alto)

**Verrà mostrato un form:**

```
Register an application
├── Name: [_______________]              ← Inserisci il nome
├── Supported account types:
│   ○ Single tenant (selected)
│   ○ Multi-tenant
│   ○ Personal Microsoft accounts only
└── Redirect URI (Optional)
    ├── Web: [_______________]           ← Questo lo faremo dopo
```

### Step 4: Compilare il Form

**Nome dell'Applicazione:**
```
MailAgent
```

**Supported Account Types:**
Seleziona: **"Accounts in this organizational directory only (Single tenant)"**

**Redirect URI:**
Lascia vuoto per ora (lo configureremo dopo).

Fai clic su: **"Register"**

**Aspetta 10-15 secondi** mentre l'app viene creata.

---

## Generare le Credenziali

### Step 5: Copiare l'Application (Client) ID

Dopo la registrazione, dovresti vedere una pagina come questa:

```
MailAgent
├── Application (client) ID: 12345678-1234-1234-1234-123456789abc ← COPIA QUESTO
├── Directory (tenant) ID: 87654321-4321-4321-4321-abcdef123456
├── Essentials
│   ├── Display name: MailAgent
│   └── Supported account types: ...
└── ...
```

**Copia il valore di "Application (client) ID"** - questo diventerà il tuo **MICROSOFT_CLIENT_ID**.

### Step 6: Creare un Client Secret

Nel menu sinistro della pagina dell'app:

1. Fai clic su: **"Certificates & secrets"**
2. Fai clic su: **"Client secrets"**
3. Fai clic su: **"+ New client secret"**

**Verrà mostrato un form:**

```
Add a client secret
├── Description: [_________________]
└── Expires: [dropdown - select option]
```

**Compila il form:**

**Description:**
```
MailAgent Backend
```

**Expires:**
Seleziona: **"24 months"** (o il tempo che preferisci)

Fai clic su: **"Add"**

### Step 7: Copiare il Client Secret

**ATTENZIONE**: Il secret apparirà per pochi secondi. Devi copiarlo immediatamente!

Dovresti vedere:

```
Client secrets
├── Application ID: 12345678-1234-1234-1234-123456789abc
├── Description | Expires | Value | Expires (days)
├── MailAgent Backend | 24 months | ●●●●●●●●●●●●●● | 730
│                                    ↑ Click eye icon to reveal
```

1. Fai clic sull'icona dell'occhio per rivelare il valore
2. Fai clic su **"Copy to clipboard"** (oppure seleziona e copia manualmente)

**Questo è il tuo MICROSOFT_CLIENT_SECRET**.

⚠️ **IMPORTANTE**: Se non riesci a copiarlo, dovrai creare un nuovo secret. Non potrai mai vedere il vecchio.

---

## Configurare i Redirect URI

### Step 8: Aggiungere i Redirect URI

Ancora nella pagina dell'app, nel menu sinistro:

1. Fai clic su: **"Authentication"**
2. Nella sezione **"Platform configurations"**, fai clic su: **"+ Add a platform"**
3. Seleziona: **"Web"**

**Verrà mostrato un form:**

```
Configure Web
├── Redirect URIs
│   ├── [_____________________________________] ← Aggiungi qui
│   └── [Remove] [Add URI]
├── Front-channel logout URL
│   └── [_____________________________________]
└── [Configure] [Cancel]
```

### Step 9: Inserire il Redirect URI

Per **sviluppo locale**, inserisci:

```
http://localhost:3000/auth/microsoft/callback
```

Per **produzione**, usa:

```
https://your-domain.com/auth/microsoft/callback
```

(Sostituisci `your-domain.com` con il tuo dominio effettivo)

Fai clic su: **"Add URI"** (se vedi questo bottone)

Fai clic su: **"Configure"** per salvare

**Dovresti vedere:**
```
Platform configurations
├── Web
│   ├── Redirect URIs:
│   │   └── http://localhost:3000/auth/microsoft/callback
│   └── Front-channel logout URL: [empty]
```

---

## Aggiornare il File .env

### Step 10: Aggiornare le Variabili d'Ambiente

Ora hai le credenziali. Apri il file `.env` nella radice del progetto:

```bash
d:\MailAgent\.env
```

Trova queste linee:

```env
# ===== OAUTH2 CREDENTIALS (Microsoft) =====
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

Sostituiscile con i tuoi valori:

```env
# ===== OAUTH2 CREDENTIALS (Microsoft) =====
MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789abc
MICROSOFT_CLIENT_SECRET=abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH
```

### Step 11: Salvare e Riavviare

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

### Step 12: Verificare i Log

Controlla che non ci siano errori:

```bash
docker-compose logs backend | grep -i "microsoft\|oauth"
```

Se configurato correttamente, non dovresti vedere errori.

### Step 13: Testare il Login Microsoft (Manuale)

Se hai aggiunto il pulsante Microsoft Login nel frontend:

1. Vai a: http://localhost:3001/auth/login
2. Fai clic su: **"Login with Microsoft"** (se disponibile)
3. Dovresti essere reindirizzato a: `https://login.microsoftonline.com/...`
4. Accedi con il tuo account Microsoft
5. Autorizza l'accesso a MailAgent
6. Dovresti essere reindirizzato a: `http://localhost:3000/auth/microsoft/callback`
7. Se tutto va bene, sarai loggato in MailAgent

### Step 14: Test via API (Curl)

Per testare manualmente (senza UI):

```bash
# 1. Ottenere il token di accesso
curl -X POST https://login.microsoftonline.com/common/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "scope=https://outlook.office365.com/.default" \
  -d "grant_type=client_credentials"

# Dovresti ricevere:
# {
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
#   "expires_in": 3599,
#   "token_type": "Bearer"
# }
```

---

## Problemi Comuni e Soluzioni

### Errore: "Invalid redirect_uri"

**Problema**: Il redirect URI nel tuo backend non corrisponde a quello registrato su Azure.

**Soluzione**:
1. Verifica il redirect URI su Azure
2. Verifica il valore della configurazione in `backend/src/config/configuration.ts`
3. Assicurati che siano identici

```typescript
// In configuration.ts
oauth: {
  microsoft: {
    redirectUri: `${api.url}/auth/microsoft/callback`, // Deve essere: http://localhost:3000/auth/microsoft/callback
  }
}
```

### Errore: "Invalid client_id or secret"

**Problema**: Il CLIENT_ID o SECRET sono incorretti o copiati male.

**Soluzione**:
1. Torna su Azure Portal
2. Copia di nuovo il valore
3. Assicurati di non aver aggiunto spazi o caratteri extra
4. Aggiorna `.env`
5. Riavvia: `docker-compose restart backend`

### Errore: "Unauthorized_client"

**Problema**: L'app non è configurata correttamente su Azure.

**Soluzione**:
1. Vai a: **Authentication** in Azure
2. Verifica che i **Redirect URIs** siano configurati
3. Verifica che il **Client secret** sia valido (controlla la data di scadenza)

### Errore: "The tenant for account ... does not exist"

**Problema**: Stai usando un account non associato al tenant Azure.

**Soluzione**:
1. Assicurati di essere loggato con un account Microsoft del tuo tenant
2. Oppure cambia il tipo di app a "Accounts in any organizational directory"

---

## Configurazione per Produzione

Se stai distribuendo in produzione, devi aggiornare i redirect URI:

### Step 1: Aggiungere il Redirect URI di Produzione

1. Su Azure Portal, vai a: **Authentication**
2. Aggiungi un nuovo URI:

```
https://your-domain.com/auth/microsoft/callback
```

### Step 2: Aggiornare il .env per Produzione

```env
API_HOST=your-domain.com
API_PORT=3000

MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
```

Il sistema costruirà automaticamente:
```
MICROSOFT_REDIRECT_URI=https://your-domain.com:3000/auth/microsoft/callback
```

### Step 3: Verificare HTTPS

Assicurati che il tuo server abbia:
- ✅ Certificato SSL/TLS valido
- ✅ HTTPS configurato in Nginx
- ✅ Dominio risolto correttamente

---

## Flusso di Autenticazione Microsoft

Ecco come funziona il processo:

```
1. User clicks "Login with Microsoft"
   ↓
2. Frontend redirects to:
   https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
   client_id=YOUR_CLIENT_ID&
   redirect_uri=http://localhost:3000/auth/microsoft/callback&
   response_type=code&
   scope=https://outlook.office365.com/.default
   ↓
3. User logs in on Microsoft login page
   ↓
4. User authorizes MailAgent to access their email
   ↓
5. Microsoft redirects back to:
   http://localhost:3000/auth/microsoft/callback?
   code=M.R3_BAY.12345678...&
   session_state=12345678...
   ↓
6. Backend exchanges code for token:
   POST https://login.microsoftonline.com/common/oauth2/v2.0/token
   code=M.R3_BAY.12345678...&
   client_id=YOUR_CLIENT_ID&
   client_secret=YOUR_CLIENT_SECRET
   ↓
7. Microsoft returns access_token
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
| `https://outlook.office365.com/.default` | Accesso completo a Outlook | Email sync |
| `https://graph.microsoft.com/.default` | Accesso completo a Microsoft Graph | Email, calendar, contacts |
| `Mail.Read` | Leggere email | Email sync read-only |
| `Mail.ReadWrite` | Leggere e scrivere email | Send emails |
| `Calendar.Read` | Leggere calendario | Calendar access |
| `Contacts.Read` | Leggere contatti | Contacts access |

Nel nostro caso, usiamo:
```env
https://outlook.office365.com/.default
```

Per accesso completo a Outlook e all'email.

---

## Integrazione con il Codice

Se vuoi testare l'integrazione programmaticamente:

### Test in Node.js

```javascript
// test-microsoft-oauth.js
const axios = require('axios');

async function testMicrosoftOAuth() {
  const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
  const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;

  try {
    // 1. Get access token
    const tokenResponse = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://outlook.office365.com/.default',
        grant_type: 'client_credentials'
      })
    );

    console.log('✅ Access Token acquired');
    console.log('Token:', tokenResponse.data.access_token.substring(0, 50) + '...');

    // 2. Test with Microsoft Graph API
    const mailResponse = await axios.get(
      'https://graph.microsoft.com/v1.0/me/mailFolders',
      {
        headers: {
          Authorization: `Bearer ${tokenResponse.data.access_token}`
        }
      }
    );

    console.log('✅ Microsoft Graph API accessible');
    console.log('Mail Folders:', mailResponse.data.value.length);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testMicrosoftOAuth();
```

Esegui con:
```bash
node test-microsoft-oauth.js
```

---

## Checklist di Configurazione

- [ ] Account Microsoft creato
- [ ] Azure Portal accessibile
- [ ] App registrata su Entra ID
- [ ] MICROSOFT_CLIENT_ID copiato
- [ ] MICROSOFT_CLIENT_SECRET generato e copiato
- [ ] Redirect URI configurato (localhost per dev)
- [ ] `.env` aggiornato con le credenziali
- [ ] Backend riavviato
- [ ] Log verificati (nessun errore)
- [ ] Nessun spazio extra nel .env
- [ ] Caratteri speciali nel secret? Verificati
- [ ] Scadenza del secret controllata
- [ ] Produzione: Redirect URI aggiunto per dominio
- [ ] Produzione: HTTPS verificato

---

## Domande Frequenti

**Q: Posso usare un account Microsoft personale?**
A: Sì, ma dovrai cambiare il tipo di app a "Personal Microsoft accounts only" durante la registrazione.

**Q: Quanto tempo impiega la propagazione dei dati su Azure?**
A: Di solito 1-5 minuti. Se non funziona subito, aspetta un po' e riprova.

**Q: Come faccio a revocare l'accesso?**
A: Su Azure Portal, vai a **Enterprise applications** e rimuovi l'app.

**Q: Posso rigenerare il secret?**
A: Sì, ma il vecchio non funzionerà più. Tutti i client attivi dovranno usare il nuovo.

**Q: Qual è la scadenza consigliata per il secret?**
A: 24 mesi è un buon compromesso tra sicurezza e praticità.

---

## Risorse Utili

- [Azure Portal](https://portal.azure.com/)
- [Microsoft Identity Platform](https://learn.microsoft.com/en-us/entra/identity-platform/)
- [OAuth 2.0 Authorization Code Flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/overview)
- [Outlook REST API](https://learn.microsoft.com/en-us/outlook/rest/)

---

## Riepilogo

Hai imparato a:

✅ Registrare un'app su Azure Entra ID
✅ Generare MICROSOFT_CLIENT_ID e SECRET
✅ Configurare i redirect URI
✅ Integrare con MailAgent
✅ Testare la configurazione
✅ Risolvere i problemi comuni
✅ Preparare per la produzione

**Prossimo passo**: Configura anche Gmail OAuth seguendo [OAUTH_GMAIL_SETUP.md](OAUTH_GMAIL_SETUP.md)

---

**Ultima modifica**: Gennaio 2025
**Progetto**: MailAgent
