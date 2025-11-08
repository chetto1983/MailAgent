# Configuration Management

## Overview

MailAgent utilizza un **sistema di configurazione centralizzato** dove tutte le variabili derivate sono costruite automaticamente dalle variabili base nel file `.env`. Questo elimina i valori hardcoded e garantisce consistenza tra frontend e backend.

## Architecture

```
.env (7 variabili base)
       ↓
configuration.ts (costruisce URL e credenziali)
       ↓
Tutti i servizi (EmailService, AuthService, ecc.)
```

## Base Variables

Queste sono le **UNICHE variabili** che devi impostare manualmente in `.env`:

### Environment
```env
NODE_ENV=development                    # development | production | test
LOG_LEVEL=debug                         # debug | info | warn | error
```

### Server
```env
API_PORT=3000                           # Porta backend
API_HOST=backend                        # Hostname backend (docker service name)
API_PUBLIC_URL=http://backend:3000      # URL pubblico opzionale (https://domain.tld)
```

### Database Components
```env
DB_HOST=postgres                        # Host PostgreSQL
DB_PORT=5432                            # Porta PostgreSQL
DB_USER=mailuser                        # Username database
DB_PASSWORD=mailpass                    # Password database
DB_NAME=mailagent                       # Nome database
```

**DATABASE_URL è costruita automaticamente come:**
```
postgresql://mailuser:mailpass@postgres:5432/mailagent
```

### Redis Components
```env
REDIS_HOST=redis                        # Host Redis
REDIS_PORT=6379                         # Porta Redis
```

**REDIS_URL è costruita automaticamente come:**
```
redis://redis:6379
```

### Authentication
```env
JWT_SECRET=dev-secret-key-change-in-production-12345678901234567890
JWT_EXPIRATION=24h                      # Scadenza JWT
OTP_EXPIRATION=900000                   # OTP scade in 15 minuti (milliseconds)
PASSWORD_RESET_EXPIRATION=900000        # Reset token scade in 15 minuti
```

### Encryption
```env
AES_SECRET_KEY=ZGV2LXNlY3JldC1rZXktY2hhbmdlLWluLXByb2R1Y3Rpb24tMjA0OC1iaXQtYmFzZTY0LW1vZGU=
```

**Genera una chiave valida con:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### OAuth2 Credentials
```env
# Gmail
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret

# Microsoft Graph
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

**Redirect URIs sono costruite automaticamente:**
- Gmail: `${API_URL}/auth/gmail/callback` → `http://backend:3000/auth/gmail/callback`
- Microsoft: `${API_URL}/auth/microsoft/callback` → `http://backend:3000/auth/microsoft/callback`

### AI Provider
```env
MISTRAL_API_KEY=your-mistral-api-key
MISTRAL_MODEL=mistral-large-latest
```

### Email Provider
```env
SMTP_HOST=mail-server
SMTP_PORT=587
SMTP_USER=mailuser
SMTP_PASSWORD=mailpass
SMTP_FROM_EMAIL=noreply
SMTP_FROM_DOMAIN=mailagent.local
```

**SMTP_FROM è costruito automaticamente come:**
```
noreply@mailagent.local
```

### External Services
```env
STT_PROVIDER=google                     # google | vosk
TTS_PROVIDER=piper                      # piper | google
GOOGLE_STT_API_KEY=your-google-cloud-key
PIPER_LANGUAGE=it_IT
```

### Frontend Config
```env
FRONTEND_URL=http://localhost:3001
FRONTEND_PORT=3001
CORS_ALLOWED_ORIGINS=
```
> `CORS_ALLOWED_ORIGINS` accetta una lista separata da virgole (es. `https://app.example.com,https://admin.example.com`) e viene aggiunta agli origin permessi oltre al `FRONTEND_URL`.

## Derived Variables

Queste variabili sono **costruite automaticamente** dal file `backend/src/config/configuration.ts`:

### API URLs
```typescript
API_URL = API_PUBLIC_URL || `http://${API_HOST}:${API_PORT}`
// Esempio: https://cordell-uncompounded-elene.ngrok-free.dev
```

### Database
```typescript
DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
// Esempio: postgresql://mailuser:mailpass@postgres:5432/mailagent
```

### Redis
```typescript
REDIS_URL = `redis://${REDIS_HOST}:${REDIS_PORT}`
// Esempio: redis://redis:6379
```

### CORS Origins
```typescript
corsOrigins = unique([
  API_URL,
  `http://localhost:${API_PORT}`,
  FRONTEND_URL,
  'https://localhost',
  'https://localhost:443',
  ...CORS_ALLOWED_ORIGINS.split(',')
])
// Esempio: ['http://backend:3000', 'http://localhost:3000', 'http://localhost:3001', 'https://myapp.vercel.app']
```

### OAuth Redirect URIs
```typescript
gmailRedirectUri = `${API_URL}/auth/gmail/callback`
microsoftRedirectUri = `${API_URL}/auth/microsoft/callback`
```

### SMTP From
```typescript
from = `${SMTP_FROM_EMAIL}@${SMTP_FROM_DOMAIN}`
// Esempio: noreply@mailagent.local
```

## How It Works

### 1. Configuration File Structure

```typescript
// backend/src/config/configuration.ts
export interface Configuration {
  nodeEnv: 'development' | 'production' | 'test'
  logLevel: string
  database: DatabaseConfig
  redis: RedisConfig
  api: ApiConfig
  auth: AuthConfig
  email: EmailConfig
  oauth: OAuthConfig
  ai: AiConfig
  encryption: EncryptionConfig
  stt: STTConfig
  tts: TTSConfig
}

export function loadConfiguration(): Configuration {
  // Legge .env e costruisce URL derivate
  // Valida i valori
  // Ritorna oggetto Configuration tipizzato
}
```

### 2. Usage in Services

```typescript
// backend/src/modules/email/services/email.service.ts
import { getConfiguration } from '../../../config/configuration';

@Injectable()
export class EmailService {
  private config = getConfiguration();

  private initializeTransporter() {
    const emailConfig = this.config.email;
    this.transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: emailConfig.smtpPort,
      auth: {
        user: emailConfig.smtpUser,
        pass: emailConfig.smtpPassword,
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    const from = `${this.config.email.fromEmail}@${this.config.email.fromDomain}`;
    await this.transporter.sendMail({ from, to, subject, html });
  }
}
```

### 3. Main Application Bootstrap

```typescript
// backend/src/main.ts
import { getConfiguration } from './config/configuration';

async function bootstrap() {
  const config = getConfiguration();

  app.enableCors({
    origin: config.api.corsOrigins,  // Costruite automaticamente
  });

  await app.listen(config.api.port);
  logger.log(`🚀 Running on ${config.api.url}`);
}
```

## Environment-Specific Configuration

### Development (.env)
```env
NODE_ENV=development
API_HOST=backend
DB_HOST=postgres
REDIS_HOST=redis
```

### Production (.env.production)
```env
NODE_ENV=production
API_HOST=mailagent.example.com
DB_HOST=db.example.com
DB_USER=prod_user
DB_PASSWORD=prod_secure_password
REDIS_HOST=redis.example.com
JWT_SECRET=production-secret-key-very-secure-32-chars-minimum
AES_SECRET_KEY=base64-encoded-32-bytes-production-key
```

### Docker Compose
Le variabili nel `.env` vengono passate ai container:

```yaml
# docker-compose.yml
services:
  backend:
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      # ... other variables
```

## Best Practices

### ✅ DO
- Usa componenti base nel `.env` (DB_HOST, DB_PORT, etc.)
- Lascia che `configuration.ts` costruisca gli URL
- Accedi sempre tramite `getConfiguration()`
- Valida i valori sensibili (JWT_SECRET, AES_SECRET_KEY)
- Usa commenti per spiegare il formato atteso

### ❌ DON'T
- Non hardcodificare URL in servizi
- Non usare direttamente `process.env` nei servizi
- Non mescolare variabili base e derivate nel `.env`
- Non duplicare URL tra frontend e backend

## Validation

Il file `configuration.ts` valida automaticamente:

1. **AES Secret Key**
   ```typescript
   if (this.secretKey.length !== 32) {
     throw new Error(`AES secret key must be 32 bytes, got ${this.secretKey.length}`);
   }
   ```

2. **Numeric Values**
   ```typescript
   const dbPort = parseInt(process.env.DB_PORT || '5432');
   const apiPort = parseInt(process.env.API_PORT || '3000');
   ```

3. **URL Format**
   ```typescript
   const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
   ```

## Migration from Hardcoded to Centralized

Se stai aggiornando del codice che usa `process.env` direttamente:

### Before
```typescript
const smtpHost = process.env.SMTP_HOST || 'localhost';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpFrom = process.env.SMTP_FROM || 'noreply@mailagent.local';
```

### After
```typescript
import { getConfiguration } from '../config/configuration';

const config = getConfiguration();
const emailConfig = config.email;

const { smtpHost, smtpPort } = emailConfig;
const from = `${emailConfig.fromEmail}@${emailConfig.fromDomain}`;
```

## Troubleshooting

### "Invalid AES_SECRET_KEY configuration"
Genera una nuova chiave:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### "DATABASE_URL is not set"
Assicurati che nel `.env` siano presenti:
```env
DB_HOST=postgres
DB_PORT=5432
DB_USER=mailuser
DB_PASSWORD=mailpass
DB_NAME=mailagent
```

### "Cannot connect to Redis"
Verifica nel `.env`:
```env
REDIS_HOST=redis
REDIS_PORT=6379
```

## Summary

| Layer | Variables | Source |
|-------|-----------|--------|
| **Base** | DB_HOST, DB_PORT, SMTP_HOST, etc. | `.env` |
| **Derived** | DATABASE_URL, REDIS_URL, API_URL, etc. | `configuration.ts` |
| **Services** | Accedono via `getConfiguration()` | Tutti i servizi |
| **Docker** | Passate tramite environment | `docker-compose.yml` |

Questo sistema garantisce **zero hardcoded values**, **single source of truth**, e **facile deployment** in diversi ambienti.
