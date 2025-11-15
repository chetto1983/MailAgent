# Guida Setup OAuth2 Google per MailAgent

## 1. Vai alla Google Cloud Console
https://console.cloud.google.com/

## 2. Crea un nuovo progetto (o seleziona uno esistente)
- Click su "Select a project" in alto
- Click "New Project"
- Nome: **MailAgent**
- Click "Create"

## 3. Abilita le API necessarie
Nel menu laterale vai a:
- **APIs & Services** → **Library**

Cerca e abilita:
- ✅ **Gmail API**
- ✅ **Google Calendar API**
- ✅ **Google People API** (opzionale, per contatti)

## 4. Configura OAuth Consent Screen
- Vai a **APIs & Services** → **OAuth consent screen**
- Scegli **External** (per test)
- Click **Create**

Compila:
- **App name**: MailAgent
- **User support email**: la tua email
- **Developer contact**: la tua email
- Click **Save and Continue**

Scopes: (lascia vuoto per ora)
- Click **Save and Continue**

Test users: (aggiungi la tua email per testare)
- Click **Add Users**
- Aggiungi la tua email Gmail
- Click **Save and Continue**

## 5. Crea credenziali OAuth 2.0
- Vai a **APIs & Services** → **Credentials**
- Click **Create Credentials** → **OAuth client ID**

Configurazione:
- **Application type**: Web application
- **Name**: MailAgent Web Client

**Authorized redirect URIs**:
```
http://localhost:3000/auth/gmail/callback
```

Click **Create**

## 6. Copia le credenziali nel .env

Dopo aver creato il client, vedrai:
- **Client ID**: copia e incolla
- **Client Secret**: copia e incolla

Apri il file `.env` e sostituisci:
```env
GMAIL_CLIENT_ID=il-tuo-nuovo-client-id
GMAIL_CLIENT_SECRET=il-tuo-nuovo-client-secret
```

## 7. Riavvia il backend

```bash
# Ferma il backend (Ctrl+C)
# Riavvia:
cd backend
npm run start:dev
```

## 8. Testa la connessione

1. Vai su http://localhost:3001/dashboard/settings?section=accounts
2. Click "Connect Google Account"
3. Accedi con l'account Gmail che hai aggiunto come Test User
4. Autorizza l'accesso
5. Dovresti essere rediretto all'app con successo!

---

## Troubleshooting

### Errore: "redirect_uri_mismatch"
- Verifica che l'URI sia **esattamente**: `http://localhost:3000/auth/gmail/callback`
- NO HTTPS in locale
- NO trailing slash
- Aspetta 1-2 minuti dopo aver salvato

### Errore: "Access blocked: This app's request is invalid"
- Aggiungi la tua email come Test User nell'OAuth Consent Screen
- Assicurati di aver abilitato Gmail API

### Errore: "This app isn't verified"
- È normale per app in sviluppo
- Click su "Advanced" → "Go to MailAgent (unsafe)"

---

## Per produzione

Quando deployerai in produzione, aggiungi anche:
```
https://tuodominio.com/auth/gmail/callback
```

E sottoponi l'app per la verifica di Google se vuoi che sia accessibile a tutti gli utenti.
