# 🔧 TROUBLESHOOTING GUIDE - MailAgent

**Data creazione**: 29 Ottobre 2025
**Versione**: 1.0.0

Questa guida contiene soluzioni ai problemi comuni riscontrati durante lo sviluppo e l'utilizzo di MailAgent.

---

## 📑 Indice

1. [Mistral AI](#mistral-ai)
2. [OAuth2 Provider](#oauth2-provider)
3. [Database](#database)
4. [Email](#email)
5. [Docker](#docker)
6. [Frontend](#frontend)

---

## 🤖 Mistral AI

### Problema: "The AI service is currently unavailable"

**Sintomo**: Il backend risponde con errore generico anche se l'API key è valida.

**Causa**: Il backend non trova il file `.env` perché cerca in `backend/.env` invece che nella root.

**Soluzione**:

```bash
# Opzione 1: Copia .env nella cartella backend (Windows/Linux/Mac)
cp .env backend/.env

# Opzione 2: Crea symlink (Linux/Mac)
cd backend
ln -s ../.env .env

# Opzione 3: Crea symlink (Windows PowerShell - esegui come Admin)
cd backend
New-Item -ItemType SymbolicLink -Name ".env" -Target "..\.env"

# Opzione 4: Crea junction (Windows CMD - no admin required)
cd backend
mklink /J .env ..\.env
```

**Verifica configurazione**:

```bash
# 1. Verifica che il file .env esista in backend/
cat backend/.env | grep MISTRAL

# 2. Test API key direttamente con Mistral
curl -X POST "https://api.mistral.ai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"model":"mistral-medium-latest","messages":[{"role":"user","content":"Hello"}],"max_tokens":50}'

# 3. Riavvia il backend
cd backend && npm run start:dev

# 4. Test endpoint backend
curl -X POST http://localhost:3000/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message":"Say hello in one word"}'
```

**Script diagnostico**: Usa `test-mistral-api.js` (da creare con moduli Node.js)

**Risolto**: ✅ 29 Ottobre 2025

---

### Problema: Mistral API key invalida (401 Unauthorized)

**Sintomo**: Errore 401 quando si chiama Mistral API.

**Causa**: API key scaduta, invalida o revocata.

**Soluzione**:

1. Vai su [Mistral Console](https://console.mistral.ai/)
2. Genera una nuova API key
3. Aggiorna `.env`:
   ```
   MISTRAL_API_KEY=your_new_key_here
   ```
4. Copia in `backend/.env`
5. Riavvia backend

---

### Problema: Modello non disponibile (404 Not Found)

**Sintomo**: Errore 404 quando si usa un modello specifico.

**Causa**: Il modello specificato non esiste o non è disponibile per il tuo account.

**Soluzione**:

Modelli disponibili (Ottobre 2025):
- `mistral-small-latest` - Modello più piccolo e veloce
- `mistral-medium-latest` - Bilanciamento qualità/velocità
- `mistral-large-latest` - Modello più potente

Aggiorna `.env`:
```
MISTRAL_MODEL=mistral-small-latest
```

---

## 🔌 OAuth2 Provider

### Problema: Google OAuth "Error 400: redirect_uri_mismatch"

**Sintomo**: Errore durante il callback OAuth2 di Google.

**Causa**: Redirect URI configurato in Google Cloud Console non corrisponde a quello usato dal backend.

**Soluzione**:

1. Verifica redirect URI nel backend:
   ```bash
   echo "http://localhost:3000/auth/gmail/callback"
   ```

2. Vai su [Google Cloud Console](https://console.cloud.google.com/)
   - Seleziona il progetto
   - API & Services > Credentials
   - Clicca sulla tua OAuth 2.0 Client ID
   - Aggiungi **Authorized redirect URIs**:
     - `http://localhost:3000/auth/gmail/callback`
     - `http://localhost:3000/auth/google/callback` (se usi questo)

3. Salva e attendi 5 minuti per la propagazione

**Guida completa**: Vedi `OAUTH_GMAIL_SETUP.md`

---

### Problema: Microsoft OAuth "AADSTS50011: Reply URL mismatch"

**Sintomo**: Errore durante il callback OAuth2 di Microsoft.

**Causa**: Redirect URI non configurato in Azure AD.

**Soluzione**:

1. Vai su [Azure Portal](https://portal.azure.com/)
   - Azure Active Directory > App registrations
   - Seleziona la tua app
   - Authentication > Platform configurations > Web

2. Aggiungi Redirect URI:
   - `http://localhost:3000/auth/microsoft/callback`

3. Salva

**Guida completa**: Vedi `OAUTH_MICROSOFT_SETUP.md`

---

### Problema: Token scaduto (401 Unauthorized)

**Sintomo**: Provider restituisce errori 401/403 dopo un po' di tempo.

**Causa**: Access token scaduto e refresh token non funziona.

**Comportamento atteso**:
- Il sistema tenta automaticamente il refresh **60 secondi prima** della scadenza
- Se il refresh fallisce, viene loggato un warning
- L'utente continua con il vecchio token (potrebbe funzionare per qualche minuto)

**Soluzione manuale**:

1. **Frontend**: Disconnetti e riconnetti il provider
   - Dashboard > Providers
   - Click su "Disconnect"
   - Click su "Connect" e riautorizza

2. **Verifica database**:
   ```sql
   -- Controlla scadenza token
   SELECT id, provider_type, email, token_expires_at,
          (token_expires_at - NOW()) as time_remaining
   FROM "ProviderConfig"
   WHERE user_id = 'YOUR_USER_ID';
   ```

3. **Verifica che refresh token sia salvato**:
   - Deve esistere sia `refreshToken` che `refreshTokenEncryptionIv`
   - Se mancano, l'utente deve riconnettersi

**Prevenzione**:
- Assicurati di richiedere `offline_access` nello scope OAuth2
- Google: `access_type: 'offline'`, `prompt: 'consent'`
- Microsoft: scope include `offline_access`

---

## 💾 Database

### Problema: "Cannot find module '@prisma/client'"

**Sintomo**: Backend non trova Prisma Client.

**Causa**: Prisma Client non generato dopo modifiche allo schema.

**Soluzione**:

```bash
cd backend

# Genera Prisma Client
npx prisma generate

# Se hai modificato lo schema, applica migration
npx prisma migrate dev --name describe_your_changes

# Riavvia backend
npm run start:dev
```

---

### Problema: Database connection error

**Sintomo**: Backend non si connette al database PostgreSQL.

**Causa**: Database non avviato o credenziali errate.

**Soluzione**:

```bash
# 1. Verifica che PostgreSQL sia in esecuzione
docker ps | grep postgres

# 2. Se non è attivo, avvia i container
docker-compose -f docker-compose.dev.yml up -d postgres

# 3. Verifica connessione database
docker exec -it mailagent-postgres-1 psql -U mailuser -d mailagent -c "SELECT version();"

# 4. Verifica DATABASE_URL in .env
cat backend/.env | grep DATABASE_URL

# 5. Test connessione da backend
cd backend
npx prisma db pull --schema prisma/schema.prisma
```

**Se database è vuoto (nessuna tabella)**:

```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

---

### Problema: Migration failed

**Sintomo**: Errore durante applicazione migration.

**Causa**: Conflitto con stato database corrente.

**Soluzione (ATTENZIONE: resetta il database)**:

```bash
cd backend

# Backup dei dati (se necessario)
npx prisma db pull

# Reset completo database
npx prisma migrate reset --skip-seed

# Applica migration
npx prisma migrate deploy

# Seed con dati iniziali
npx prisma db seed
```

---

## 📧 Email

### Problema: Email OTP non ricevute

**Sintomo**: Non arrivano email di OTP durante login.

**Causa**: SMTP non configurato o MailHog non in esecuzione.

**Soluzione (Development)**:

```bash
# 1. Verifica MailHog sia attivo
docker ps | grep mailhog

# 2. Avvia MailHog se non attivo
docker-compose -f docker-compose.dev.yml up -d mailhog

# 3. Apri MailHog UI
open http://localhost:8025

# 4. Verifica configurazione SMTP in .env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
```

**Soluzione (Production)**:

Configura SMTP reale (Gmail, SendGrid, AWS SES):

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply
SMTP_FROM_DOMAIN=yourdomain.com
```

---

### Problema: IMAP connection timeout

**Sintomo**: Generic provider non si connette via IMAP.

**Causa**: Host/porta errati o firewall.

**Soluzione**:

```bash
# Test connessione IMAP manuale
telnet imap.example.com 993

# Se non risponde, prova porta 143
telnet imap.example.com 143

# Test con OpenSSL (TLS)
openssl s_client -connect imap.example.com:993 -crlf

# Se funziona, dovresti vedere:
# * OK [CAPABILITY ...] IMAP4rev1
```

**Configurazioni comuni**:

Gmail IMAP:
```
Host: imap.gmail.com
Port: 993
TLS: true
```

Outlook IMAP:
```
Host: outlook.office365.com
Port: 993
TLS: true
```

---

## 🐳 Docker

### Problema: Container non si avviano

**Sintomo**: `docker-compose up` fallisce.

**Causa**: Porta già in uso o file non trovati.

**Soluzione**:

```bash
# 1. Controlla porte in uso
netstat -ano | findstr :3000
netstat -ano | findstr :5432
netstat -ano | findstr :6379

# 2. Ferma tutti i container
docker-compose -f docker-compose.dev.yml down

# 3. Rimuovi volumi (ATTENZIONE: cancella i dati)
docker-compose -f docker-compose.dev.yml down -v

# 4. Rebuild da zero
docker-compose -f docker-compose.dev.yml build --no-cache

# 5. Avvia
docker-compose -f docker-compose.dev.yml up
```

---

### Problema: Backend container esce immediatamente

**Sintomo**: Container backend si ferma dopo pochi secondi.

**Causa**: Errore nel codice o dipendenza mancante.

**Soluzione**:

```bash
# 1. Controlla log container
docker logs mailagent-backend-1

# 2. Entra nel container
docker exec -it mailagent-backend-1 sh

# 3. Verifica node_modules
ls /app/node_modules

# 4. Se node_modules è vuoto, rebuild
docker-compose -f docker-compose.dev.yml build backend
```

---

## 💻 Frontend

### Problema: "Cannot connect to backend"

**Sintomo**: Frontend non riesce a chiamare API backend.

**Causa**: CORS o backend non in esecuzione.

**Soluzione**:

```bash
# 1. Verifica backend sia attivo
curl http://localhost:3000/health

# 2. Controlla FRONTEND_URL in .env backend
cat backend/.env | grep FRONTEND_URL
# Deve essere: FRONTEND_URL=http://localhost:3001

# 3. Controlla NEXT_PUBLIC_API_URL nel frontend
cat frontend/.env.local | grep NEXT_PUBLIC_API_URL
# Deve essere: NEXT_PUBLIC_API_URL=http://localhost:3000

# 4. Test CORS
curl -X OPTIONS http://localhost:3000/auth/login \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

---

### Problema: "Unauthorized" su tutte le richieste

**Sintomo**: Tutte le chiamate API restituiscono 401.

**Causa**: JWT token non salvato o scaduto.

**Soluzione**:

1. Apri DevTools (F12) > Application > Local Storage
2. Verifica che esista `access_token`
3. Se manca o è scaduto:
   - Fai logout
   - Login di nuovo
   - Verifica OTP arrivi in MailHog

**Debug JWT token**:

```javascript
// Console browser
const token = localStorage.getItem('access_token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires:', new Date(payload.exp * 1000));
console.log('Is expired:', Date.now() > payload.exp * 1000);
```

---

## 🆘 Problemi Non Risolti?

Se il problema persiste:

1. **Controlla i log**:
   ```bash
   # Backend logs
   docker logs mailagent-backend-1 --tail 100

   # Database logs
   docker logs mailagent-postgres-1 --tail 100

   # Frontend logs (se in Docker)
   docker logs mailagent-frontend-1 --tail 100
   ```

2. **Verifica l'ambiente**:
   ```bash
   # Node version
   node --version  # Deve essere v18+

   # Docker version
   docker --version

   # Docker Compose version
   docker-compose --version
   ```

3. **Pulisci e ricomincia**:
   ```bash
   # Stop tutto
   docker-compose -f docker-compose.dev.yml down -v

   # Pulisci node_modules
   rm -rf backend/node_modules frontend/node_modules

   # Reinstalla
   cd backend && npm install
   cd ../frontend && npm install

   # Riavvia
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Crea un issue su GitHub** con:
   - Descrizione problema
   - Log di errore completi
   - Comandi eseguiti
   - Versioni software (Node, Docker, OS)

---

## 📚 Risorse Aggiuntive

- [README.md](README.md) - Introduzione generale
- [LOCAL_DEV_SETUP.md](LOCAL_DEV_SETUP.md) - Setup ambiente sviluppo
- [OAUTH_GMAIL_SETUP.md](OAUTH_GMAIL_SETUP.md) - Setup OAuth Google
- [OAUTH_MICROSOFT_SETUP.md](OAUTH_MICROSOFT_SETUP.md) - Setup OAuth Microsoft
- [PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md) - Stato progetto e test
- [PROVIDER_INTEGRATION_GUIDE.md](PROVIDER_INTEGRATION_GUIDE.md) - Guida provider

---

**Ultimo aggiornamento**: 29 Ottobre 2025
**Contribuisci**: Se risolvi un problema non documentato, aggiungi la soluzione qui!

---

_Documento creato da Claude Code Assistant_
