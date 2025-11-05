# MailAgent - AI-Powered Multi-Tenant Email Assistant

MailAgent è una piattaforma full-stack completa e moderna per la gestione intelligente della posta elettronica con supporto IA, riconoscimento vocale (STT) e sintesi vocale (TTS). Progettato per supportare multi-tenancy con isolamento completo dei dati.

## Features

- ✅ **Multi-Tenant Architecture**: Isolamento completo dei dati con supporto per più tenant
- ✅ **AI Assistant**: Integrazione con Mistral AI per risposte intelligenti e RAG (Retrieval-Augmented Generation)
- ✅ **Email Integration**: Supporto per Gmail, Outlook/Microsoft Graph e IMAP
- ✅ **Voice Support**: STT (Speech-to-Text) e TTS (Text-to-Speech) con supporto italiano
- ✅ **Advanced Authentication**: Email/Password + OTP/MFA per ogni login
- ✅ **Password Recovery**: Reset password sicuro con token temporaneo
- ✅ **GDPR Compliance**: Crittografia dei dati sensibili, audit log, diritto all'oblio
- ✅ **Real-time Chat**: Dashboard interattiva con chat in tempo reale
- ✅ **Dark/Light Mode**: UI responsive con tema personalizzabile
- ✅ **Docker**: Containerizzazione completa con orchestrazione via docker-compose

## Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│         React + TailwindCSS + ShadCN UI + Next.js            │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                     Nginx (Reverse Proxy)                    │
│                  (HTTPS, Rate Limiting)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼────────┐  ┌──────────▼────────┐  ┌────────▼──────────┐
│   Backend   │  │   Email Worker   │  │   AI Worker      │
│  (NestJS)   │  │  (Email Sync)    │  │  (Mistral API)   │
└───┬────────┘  └──────────┬────────┘  └────────┬──────────┘
    │                      │                    │
    └──────────────────────┼────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐  ┌────────▼─────┐  ┌────────▼──────┐
   │ PostgreSQL│  │    Redis     │  │  pgvector    │
   │           │  │  (Cache +    │  │  (Embeddings)│
   │ (Data)    │  │   Queues)    │  │              │
   └───────────┘  └──────────────┘  └───────────────┘
```

## Technology Stack

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 15+ con pgvector per RAG
- **ORM**: Prisma
- **Cache**: Redis
- **Job Queue**: BullMQ
- **AI**: Mistral API
- **Email**: nodemailer, IMAP-Flow, googleapis, microsoft-graph-client
- **Auth**: JWT, bcrypt, OTP
- **Voice**: Vosk (STT), Piper (TTS)

### Frontend
- **Framework**: Next.js 14 con React 18
- **Styling**: TailwindCSS + ShadCN UI
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React

### DevOps
- **Containerization**: Docker + docker-compose
- **Reverse Proxy**: Nginx con HTTPS/SSL
- **Database Migration**: Prisma Migrate

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (if running locally without Docker)
- PostgreSQL 15+ (if running locally)
- Redis (if running locally)

### Installation with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mailagent
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

3. **Generate SSL certificates (development)**
   ```bash
   mkdir -p nginx/certs
   openssl req -x509 -newkey rsa:4096 -keyout nginx/certs/key.pem -out nginx/certs/cert.pem -days 365 -nodes
   ```

4. **Start all services**
   ```bash
   docker-compose up -d
   ```

5. **Run database migrations**
   ```bash
   docker-compose exec backend npx prisma migrate deploy
   ```

6. **Seed the database**
   ```bash
   docker-compose exec backend npx prisma db seed
   ```

7. **Access the application**
   - Frontend: https://localhost
   - API: https://localhost/api
   - API Docs: https://localhost/api/docs
   - Demo Credentials:
     - Admin: `admin@mailagent.local` | password: `TestPassword123!`
     - User: `test@mailagent.local` | password: `UserPassword123!`

### Local Development (without Docker)

1. **Backend setup**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run start:dev
   ```

2. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Database setup**
   ```bash
   # PostgreSQL and Redis must be running
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password pgvector/pgvector:pg15-latest
   docker run -d -p 6379:6379 redis:7-alpine
   ```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - Login
- `POST /auth/send-otp` - Send OTP code
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user profile

### Users
- `GET /users/me` - Get user profile
- `PUT /users/me` - Update profile
- `DELETE /users/me` - Delete account (GDPR)
- `GET /users/me/messages` - Get message history

### AI Chat
- `POST /ai/chat` - Send message to AI
- `GET /ai/chat/sessions` - List the latest chat sessions (FIFO per user/tenant)
- `POST /ai/chat/sessions` - Create a new chat session
- `GET /ai/chat/sessions/:id` - Retrieve a specific session with history
- `DELETE /ai/chat/sessions/:id` - Delete a stored chat session
- `POST /ai/agent` - Agentic workflow (LangChain) with automatic session persistence and titles

### AI Knowledge Base
- `POST /ai/knowledge-base/emails/backfill` - Admin: generate embeddings for existing emails
- `GET /ai/knowledge-base/embeddings` - Admin: inspect stored embeddings
- `DELETE /ai/knowledge-base/embeddings/:id` - Admin: remove a specific embedding
- `DELETE /ai/knowledge-base/embeddings/email/:emailId` - Admin: purge embeddings linked to an email

### Providers & Email Sync
- `POST /providers/google/auth-url` - Ottieni URL OAuth Google
- `POST /providers/google/connect` - Collega account Google
- `POST /providers/microsoft/auth-url` - Ottieni URL OAuth Microsoft
- `POST /providers/microsoft/connect` - Collega account Microsoft
- `POST /providers/generic/connect` - Collega provider IMAP/SMTP
- `GET /providers` - Elenco provider collegati
- `GET /providers/:id/test/*` - Diagnostic API per Gmail/Microsoft

### Tenants (Admin)
- `GET /tenants` - List tenants
- `GET /tenants/:id` - Get tenant details
- `POST /tenants` - Create tenant
- `PUT /tenants/:id` - Update tenant
- `DELETE /tenants/:id` - Delete tenant

### Health
- `GET /health` - System health status
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/queues` - Email sync queue metrics (JSON)
- `GET /health/metrics` - Prometheus metrics (text/plain)

## Observability Stack

### Avvio Prometheus e Grafana

Il `docker-compose.yml` include Prometheus (porta `9090`) e Grafana (porta `3002`). Per avviarli:

```bash
docker-compose up -d prometheus grafana
```

Prometheus carica automaticamente `monitoring/prometheus.yml`, che esegue lo scrape di `backend:3000/health/metrics`.
Grafana utilizza una datasource preconfigurata che punta al servizio Prometheus interno.

- Dashboard Prometheus: http://localhost:9090
- Dashboard Grafana: http://localhost:3002 (credenziali di default `admin` / `admin`; personalizzabili via `GRAFANA_ADMIN_USER`/`GRAFANA_ADMIN_PASSWORD`)

### Metriche disponibili

- `email_sync_queue_completed{queue="high"}` – contatore job completati per coda
- `email_sync_queue_failed{queue="normal"}` – contatore job falliti per coda
- `email_sync_queue_last_duration_ms{queue="low"}` – durata dell’ultimo job
- `email_sync_queue_avg_duration_ms{queue="high"}` – media mobile delle durate

È possibile estendere `QueueService` per esporre metriche aggiuntive (lag, rate limit, circuit breaker) se necessario.

### Compliance
- `GET /compliance/gdpr/status` - GDPR compliance snapshot with outstanding actions

## OAuth Configuration

### Gmail (Google Cloud)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable APIs: Gmail API, Google Drive API
4. Create OAuth 2.0 credentials (Web Application)
5. Add redirect URIs:
   - `http://localhost:3000/auth/gmail/callback` (development)
   - `https://yourdomain.com/auth/gmail/callback` (production)

   **Note**: Backend receives OAuth callback, then redirects to frontend with auth code
6. Copy Client ID and Secret to `.env`

### Microsoft Graph (Azure)

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application in Azure AD
3. Create client secret
4. Configure redirect URIs:
   - `http://localhost:3000/auth/microsoft/callback` (development)
   - `https://yourdomain.com/auth/microsoft/callback` (production)

   **Note**: Backend receives OAuth callback, then redirects to frontend with auth code
5. Enable API permissions:
   - Mail.Read
   - Mail.Send
   - offline_access
6. Copy Client ID and Secret to `.env`

## Useful Commands

```bash
# Start development environment
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Access database
docker-compose exec postgres psql -U mailuser -d mailagent

# Run migration
docker-compose exec backend npx prisma migrate dev

# Reset database
docker-compose exec backend npx prisma migrate reset

# Build images
docker-compose build

# Restart a service
docker-compose restart backend
```

## Project Structure

```
mailagent/
├── backend/                      # NestJS Backend
│   ├── src/
│   │   ├── main.ts              # Entry point
│   │   ├── app.module.ts        # Root module
│   │   ├── modules/
│   │   │   ├── auth/            # Authentication
│   │   │   ├── users/           # Users management
│   │   │   ├── tenants/         # Tenants management
│   │   │   ├── email/           # Email integration
│   │   │   ├── ai/              # AI/Mistral
│   │   │   ├── health/          # Health checks
│   │   │   └── audit/           # Audit logging
│   │   ├── workers/
│   │   │   ├── email.worker.ts  # Email sync worker
│   │   │   └── ai.worker.ts     # AI processing worker
│   │   ├── common/
│   │   │   ├── services/
│   │   │   └── filters/
│   │   └── prisma/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   └── package.json
│
├── frontend/                     # Next.js Frontend
│   ├── pages/
│   │   ├── index.tsx            # Home
│   │   ├── _app.tsx
│   │   ├── auth/
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   └── reset-password.tsx
│   │   └── dashboard/
│   │       ├── index.tsx        # Main dashboard
│   │       ├── providers.tsx    # Provider management
│   │       └── settings.tsx     # Settings
│   ├── components/
│   │   └── ui/                  # ShadCN UI
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── context/
│   │   ├── hooks/
│   │   └── utils.ts
│   ├── stores/
│   │   └── auth-store.ts
│   ├── styles/
│   │   └── globals.css
│   ├── Dockerfile
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
├── nginx/
│   ├── nginx.conf
│   └── certs/                   # SSL certificates
│
├── database/
│   └── init.sql
│
├── docker-compose.yml
├── .env.example
└── README.md
```

## Security Features

- ✅ HTTPS/TLS with SSL certificates
- ✅ JWT authentication
- ✅ OTP/MFA for every login
- ✅ Bcrypt password hashing
- ✅ AES-256 encryption for sensitive data
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Rate limiting on auth endpoints
- ✅ Multi-tenant data isolation
- ✅ Audit logging
- ✅ GDPR compliance (right to be forgotten, data deletion)

## GDPR and Privacy

### Right to be Forgotten
Users can request complete account deletion:
- Endpoint: `DELETE /users/me`
- Data is soft-deleted then permanently removed in background
- All messages, embeddings, and email configs are deleted
- Sensitive data in logs is anonymized

### Audit Log
All critical actions are logged:
- User creation/modification/deletion
- Login/logout events
- Configuration changes
- Email access

### Encryption
- Email credentials (OAuth tokens, IMAP passwords) encrypted with AES-256
- Encryption keys managed via environment variables

## Logging

Backend uses **pino** for structured logging:
```typescript
logger.log('User logged in', { userId, timestamp });
logger.warn('Failed login attempt', { email, attempts });
logger.error('API error', { error: error.message, stack });
```

Logs available via:
- Console (development)
- File (production - configurable)
- Structured logging for ELK stack integration

## Monitoring

### Health Checks
```bash
$ curl http://localhost:3000/health
{
  "status": "healthy",
  "timestamp": "2025-11-04T17:20:11.000Z",
  "services": {
    "database": { "status": "up", "responseTime": 5 },
    "redis": { "status": "up", "responseTime": 2 },
    "mistral": { "status": "up", "responseTime": 110 },
    "emailSyncQueue": {
      "status": "up",
      "queues": [
        { "queue": "high", "completed": 1234, "failed": 12, "averageDurationMs": 420 },
        { "queue": "normal", "completed": 567, "failed": 3, "averageDurationMs": 610 },
        { "queue": "low", "completed": 90, "failed": 0, "averageDurationMs": 1200 }
      ],
      "totals": { "completed": 1891, "failed": 15 }
    }
  }
}
```

Queue-only metrics:

```bash
$ curl http://localhost:3000/health/queues
```

Prometheus metrics:

```bash
$ curl http://localhost:3000/health/metrics
# HELP email_sync_queue_completed Total completed sync jobs per queue
email_sync_queue_completed{queue="high"} 1234
```

### Dashboard Metrics
- Message queue count
- Service uptime
- Last email sync per account
- Connected users count

## Troubleshooting

### Database Connection Error
```bash
docker-compose exec postgres psql -U mailuser -d mailagent -c "SELECT 1"
```

### Redis Connection Error
```bash
docker-compose exec redis redis-cli ping
```

### SSL Certificate Issues
```bash
# Regenerate self-signed certificates
rm -rf nginx/certs/*
openssl req -x509 -newkey rsa:4096 -keyout nginx/certs/key.pem -out nginx/certs/cert.pem -days 365 -nodes
docker-compose restart nginx
```

### Database Migration Failures
```bash
docker-compose exec backend npx prisma migrate reset
docker-compose exec backend npx prisma db seed
```

## 📚 Documentation

### 📖 Documentazione Principale

- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Guida risoluzione problemi comuni
- **[PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md)** - Stato progetto, test effettuati, roadmap
- **[PRIVACY.md](PRIVACY.md)** - Informativa privacy e GDPR compliance

### 📁 Documentazione Organizzata

Tutta la documentazione è ora organizzata nella cartella **[`docs/`](docs/)**:

#### 🚀 [Setup](docs/setup/)
- Guide configurazione e quick start
- Setup ambiente locale e produzione
- Checklist iniziali

#### 🔐 [OAuth](docs/oauth/)
- Setup OAuth2 Gmail (step-by-step)
- Setup OAuth2 Microsoft (step-by-step)
- Fix e troubleshooting token

#### 💻 [Implementation](docs/implementation/)
- Strategia sincronizzazione email
- Guida integrazione provider
- Auto-refresh token (Google + Microsoft)
- Architettura sistema

#### 🧪 [Testing](docs/testing/)
- Risultati test sessioni
- Test token refresh
- Test email sync success

#### 📈 [Scalability](docs/scalability/)
- Analisi capacità sistema
- Piano B: Ottimizzazioni per 1000+ tenant
- Test risultati performance

**📚 [Indice Completo Documentazione →](docs/README.md)**

### 🔧 Script di Test

Gli script sono organizzati in **[`scripts/`](scripts/)**:

- **[`scripts/test/`](scripts/test/)** - Test API (Google, Microsoft, IMAP)
- **[`scripts/diagnostics/`](scripts/diagnostics/)** - Script diagnostici (database, provider, sync)
- **[`scripts/scalability/`](scripts/scalability/)** - Test scalabilità e performance

**🔧 [Guida Script →](scripts/README.md)**

### Problemi Comuni

Consulta [TROUBLESHOOTING.md](TROUBLESHOOTING.md) per soluzioni a:
- ❌ Mistral AI "Service unavailable"
- ❌ OAuth2 redirect_uri_mismatch
- ❌ Token scaduti
- ❌ Database connection error
- ❌ Email OTP non ricevute
- ❌ IMAP connection timeout
- ❌ Docker container issues

---

## Production Deployment

For production deployment:

1. **Environment Variables**: Configure `.env.production`
2. **SSL Certificates**: Use Let's Encrypt via Certbot
3. **Database**: Use managed PostgreSQL service with automatic backups
4. **Redis**: Use managed Redis or cluster setup
5. **Reverse Proxy**: Consider CloudFlare or AWS CloudFront
6. **Monitoring**: Integrate Prometheus + Grafana
7. **Logging**: Use ELK stack or Datadog
8. **Email**: Use SendGrid, Mailgun, or similar service

## License

MIT

## Support

For issues or questions, please create an issue on GitHub.

---

**MailAgent** - Powered by AI, Designed for Privacy 🔒
