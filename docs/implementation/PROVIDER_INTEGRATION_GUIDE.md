# Email & Calendar Provider Integration Guide

> **Nota (2025-11-04):** le rotte legacy `/email-configs` e i callback OAuth in `/auth/*` sono deprecati. Tutte le integrazioni devono usare gli endpoint descritti in questo documento (`/providers/...`).

Guida completa per l'integrazione dei provider email/calendario in MailAgent.

## Indice
- [Panoramica](#panoramica)
- [Architettura](#architettura)
- [Configurazione Backend](#configurazione-backend)
- [Configurazione Frontend](#configurazione-frontend)
- [Configurazione Provider OAuth2](#configurazione-provider-oauth2)
- [Utilizzo](#utilizzo)
- [Sicurezza](#sicurezza)

---

## Panoramica

L'integrazione supporta tre tipi di provider:

1. **Google** (Gmail + Google Calendar)
   - OAuth2 con `googleapis` e `google-auth-library`
   - Supporta email, calendario e contatti

2. **Microsoft** (Outlook + Microsoft 365)
   - OAuth2 con `@azure/msal-node` e `@microsoft/microsoft-graph-client`
   - Supporta email, calendario e contatti

3. **Provider Generici** (IMAP/SMTP + CalDAV/CardDAV)
   - IMAP/SMTP per email con `imapflow` e `nodemailer`
   - CalDAV/CardDAV per calendario/contatti con `tsdav`

---

## Architettura

### Database Schema
```prisma
model ProviderConfig {
  id                 String   @id @default(cuid())
  tenantId           String
  providerType       String   // "google", "microsoft", "generic"
  email              String

  // OAuth2 tokens (crittografati)
  accessToken        String?
  refreshToken       String?
  tokenEncryptionIv  String?

  // IMAP/SMTP config (crittografato)
  imapHost           String?
  imapPassword       String?

  // CalDAV/CardDAV config (crittografato)
  caldavUrl          String?
  caldavPassword     String?
}
```

### Backend Structure
```
backend/src/modules/providers/
├── controllers/
│   ├── providers.controller.ts      # API endpoints
│   └── oauth-callback.controller.ts # OAuth callbacks
├── services/
│   ├── google-oauth.service.ts      # Google OAuth2
│   ├── microsoft-oauth.service.ts   # Microsoft OAuth2
│   ├── imap.service.ts              # IMAP/SMTP
│   ├── caldav.service.ts            # CalDAV/CardDAV
│   └── provider-config.service.ts   # Servizio principale
├── dto/
│   ├── google-provider.dto.ts
│   ├── microsoft-provider.dto.ts
│   └── generic-provider.dto.ts
└── providers.module.ts
```

### Frontend Structure
```
frontend/
├── pages/dashboard/
│   └── providers.tsx                # Pagina principale
├── components/providers/
│   ├── GoogleProviderCard.tsx       # Card Google
│   ├── MicrosoftProviderCard.tsx    # Card Microsoft
│   ├── GenericProviderDialog.tsx    # Dialog provider generico
│   └── ProvidersList.tsx            # Lista provider
├── components/ui/
│   ├── dialog.tsx                   # Componente Dialog
│   ├── badge.tsx                    # Componente Badge
│   └── tabs.tsx                     # Componente Tabs
└── lib/api/
    └── providers.ts                 # API client
```

---

## Configurazione Backend

### 1. Variabili d'Ambiente

Aggiungi le seguenti variabili al file `.env`:

```env
# Google OAuth2
GMAIL_CLIENT_ID=your-google-client-id
GMAIL_CLIENT_SECRET=your-google-client-secret

# Microsoft OAuth2
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Encryption (già configurato)
AES_SECRET_KEY=your-base64-encoded-32-byte-key
```

### 2. Applicare Migration Database

```bash
cd backend
npx prisma migrate dev --name add_provider_config_table
npx prisma generate
```

### 3. Avviare il Backend

```bash
npm run dev
```

Gli endpoint saranno disponibili su `http://localhost:3000`

---

## Configurazione Frontend

### 1. Installare Dipendenze

Le dipendenze sono già installate:
- `@radix-ui/react-dialog`
- `@radix-ui/react-tabs`

### 2. Avviare il Frontend

```bash
cd frontend
npm run dev
```

Il frontend sarà disponibile su `http://localhost:3001`

---

## Configurazione Provider OAuth2

### Google (Gmail + Calendar)

1. **Vai alla Google Cloud Console**
   - https://console.cloud.google.com/

2. **Crea un nuovo progetto** (o usa uno esistente)

3. **Abilita le API necessarie**
   - Gmail API
   - Google Calendar API
   - Google People API (per contatti)

4. **Crea credenziali OAuth2**
   - Vai a "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Tipo applicazione: "Web application"
   - Authorized redirect URIs:
     ```
     http://localhost:3000/auth/gmail/callback
     http://backend:3000/auth/gmail/callback
     ```

5. **Copia le credenziali**
   - Copia `Client ID` in `GMAIL_CLIENT_ID`
   - Copia `Client Secret` in `GMAIL_CLIENT_SECRET`

### Microsoft (Outlook + Microsoft 365)

1. **Vai all'Azure Portal**
   - https://portal.azure.com/

2. **Registra una nuova applicazione**
   - Vai a "Azure Active Directory" > "App registrations"
   - Click "New registration"
   - Nome: "MailAgent"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"

3. **Configura Redirect URIs**
   - Vai a "Authentication"
   - Add platform: "Web"
   - Redirect URIs:
     ```
     http://localhost:3000/auth/microsoft/callback
     http://backend:3000/auth/microsoft/callback
     ```

4. **Crea un Client Secret**
   - Vai a "Certificates & secrets"
   - Click "New client secret"
   - Copia il valore (disponibile solo una volta!)

5. **Configura i permessi API**
   - Vai a "API permissions"
   - Add permissions: "Microsoft Graph"
   - Permessi delegati:
     - `Mail.Read`
     - `Mail.Send`
     - `Calendars.ReadWrite`
     - `Contacts.ReadWrite`
     - `offline_access`
     - `openid`
     - `profile`
     - `email`

6. **Copia le credenziali**
   - Copia `Application (client) ID` in `MICROSOFT_CLIENT_ID`
   - Copia `Client Secret Value` in `MICROSOFT_CLIENT_SECRET`

---

## Utilizzo

### API Endpoints

#### Google Provider

**Ottieni URL OAuth2**
```http
POST /providers/google/auth-url
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "scopes": ["email", "calendar"]  // optional
}

Response:
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random-state-string"
}
```

**Collega Google Account**
```http
POST /providers/google/connect
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "email": "user@gmail.com",
  "authorizationCode": "4/0AX4XfWh...",
  "supportsCalendar": true,
  "supportsContacts": false,
  "isDefault": false
}

Response: ProviderConfig object
```

#### Microsoft Provider

**Ottieni URL OAuth2**
```http
POST /providers/microsoft/auth-url
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "scopes": ["Mail.Read", "Calendars.ReadWrite"]  // optional
}
```

**Collega Microsoft Account**
```http
POST /providers/microsoft/connect
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "email": "user@outlook.com",
  "authorizationCode": "M.R3_BAY...",
  "supportsCalendar": true,
  "supportsContacts": false,
  "isDefault": false
}
```

#### Provider Generico

**Collega Provider IMAP/CalDAV**
```http
POST /providers/generic/connect
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "email": "user@example.com",
  "displayName": "My Email",

  // IMAP (required)
  "imapHost": "imap.example.com",
  "imapPort": 993,
  "imapUsername": "user@example.com",
  "imapPassword": "password",
  "imapUseTls": true,

  // SMTP (optional)
  "smtpHost": "smtp.example.com",
  "smtpPort": 587,
  "smtpUsername": "user@example.com",
  "smtpPassword": "password",
  "smtpUseTls": true,

  // CalDAV (optional)
  "caldavUrl": "https://caldav.example.com/calendars/user",
  "caldavUsername": "user",
  "caldavPassword": "password",

  "supportsCalendar": true,
  "isDefault": false
}
```

#### Gestione Provider

**Lista Provider**
```http
GET /providers
Authorization: Bearer <jwt-token>

Response: ProviderConfig[]
```

**Dettaglio Provider**
```http
GET /providers/:id
Authorization: Bearer <jwt-token>

Response: ProviderConfig
```

**Elimina Provider**
```http
DELETE /providers/:id
Authorization: Bearer <jwt-token>

Response: 204 No Content
```

### Frontend Usage

1. **Naviga alla pagina Providers**
   - Dal dashboard, click su "Providers"
   - Oppure vai a `/dashboard/providers`

2. **Collega un provider**
   - Tab "Add Provider"
   - Scegli il tipo di provider:
     - **Google**: Click "Connect Google Account" → Login con Google → Autorizza
     - **Microsoft**: Click "Connect Microsoft Account" → Login con Microsoft → Autorizza
     - **Generic**: Click "Connect Generic Provider" → Compila il form

3. **Gestisci provider**
   - Tab "Connected Providers"
   - Visualizza tutti i provider collegati
   - Disconnetti provider se necessario

---

## Sicurezza

### Crittografia

Tutti i dati sensibili sono **crittografati** prima del salvataggio in database:

- **Token OAuth2** (Access Token, Refresh Token)
- **Password IMAP/SMTP**
- **Password CalDAV/CardDAV**

**Algoritmo**: AES-256-CBC con IV casuale per ogni campo

```typescript
// Esempio di crittografia
const encrypted = cryptoService.encrypt(password);
// Salva: encrypted.encrypted, encrypted.iv

// Esempio di decifratura
const decrypted = cryptoService.decrypt(encrypted.encrypted, encrypted.iv);
```

### GDPR Compliance

- ✅ Dati sensibili crittografati at-rest
- ✅ IV separati per ogni campo
- ✅ Isolamento multi-tenant
- ✅ Eliminazione completa dei dati su richiesta
- ✅ Audit log di tutte le operazioni

### OAuth2 Best Practices

- ✅ State parameter per CSRF protection
- ✅ Refresh token per rinnovare access token
- ✅ Scope minimi necessari
- ✅ Token scadono dopo 1 ora (Google) o 1 ora (Microsoft)
- ✅ Redirect URI whitelist

---

## Configurazioni IMAP/SMTP Comuni

### Gmail
```
IMAP: imap.gmail.com:993 (TLS)
SMTP: smtp.gmail.com:587 (STARTTLS)
Note: Richiede "App Password" (non la password normale)
```

### Outlook.com
```
IMAP: outlook.office365.com:993 (TLS)
SMTP: smtp.office365.com:587 (STARTTLS)
```

### Yahoo Mail
```
IMAP: imap.mail.yahoo.com:993 (TLS)
SMTP: smtp.mail.yahoo.com:587 (STARTTLS)
Note: Richiede "App Password"
```

### iCloud Mail
```
IMAP: imap.mail.me.com:993 (TLS)
SMTP: smtp.mail.me.com:587 (STARTTLS)
Note: Richiede "App-specific password"
```

### FastMail
```
IMAP: imap.fastmail.com:993 (TLS)
SMTP: smtp.fastmail.com:587 (STARTTLS)
CalDAV: https://caldav.fastmail.com/dav/calendars/user/
CardDAV: https://carddav.fastmail.com/dav/addressbooks/user/
```

---

## Troubleshooting

### Google OAuth: "Error 400: redirect_uri_mismatch"
- Verifica che il redirect URI in Google Cloud Console sia esattamente:
  ```
  http://localhost:3000/auth/gmail/callback
  ```
- Controlla che `API_HOST` e `API_PORT` nel `.env` siano corretti

### Microsoft OAuth: "AADSTS50011: The reply URL does not match"
- Verifica il redirect URI in Azure Portal
- Assicurati che sia configurato come "Web" e non "SPA"

### IMAP Connection Failed
- Verifica host e porta
- Controlla username/password
- Alcuni provider richiedono "App Password" invece della password normale
- Verifica che IMAP sia abilitato nelle impostazioni dell'account

### CalDAV Connection Failed
- Verifica l'URL CalDAV (di solito include `/dav/` o `/caldav/`)
- Alcuni provider richiedono autenticazione separata
- Prova prima con un client CalDAV desktop (es. Thunderbird)

---

## Prossimi Sviluppi

- [ ] Sincronizzazione automatica email in background
- [ ] Sincronizzazione calendario bidirezionale
- [ ] Notifiche push per nuove email
- [ ] Supporto per categorie/etichette
- [ ] Import/export contatti
- [ ] Ricerca full-text nelle email
- [ ] Filtri e regole automatiche
- [ ] Supporto OAuth2 per provider IMAP generici

---

## Supporto

Per domande o problemi:
1. Consulta questa guida
2. Verifica i log del backend
3. Controlla la console del browser per errori
4. Verifica la configurazione OAuth2

---

**Autore**: Claude AI
**Versione**: 1.0.0
**Data**: 2025-10-29
