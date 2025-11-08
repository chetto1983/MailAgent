# 🧪 Guida ai Test - Smart Sync & Webhook System

## Setup Iniziale Completato ✅

Il database è stato pulito completamente e lo schema applicato con successo.

---

## 1. Avvio del Backend

```bash
cd backend
npm run start:dev
```

Il backend si avvierà su **http://localhost:3000**

---

## 2. Monitoraggio in Tempo Reale

Apri un nuovo terminale e avvia il monitor:

```bash
cd backend
node scripts/monitor-sync.js --watch
```

Questo dashboard si aggiorna ogni 10 secondi mostrando:
- 📧 Stato providers (Google, Microsoft, IMAP)
- 🎯 Distribuzione priorità Smart Sync
- 📈 Activity rate (email/ora)
- 🔔 Webhook subscriptions
- 📬 Email ricevute (ultime 24h)
- ⚠️ Errori di sincronizzazione
- ⏰ Prossimi sync programmati

---

## 3. Registrazione e Login

### 3.1 Crea un Utente Admin

**API Request:**
```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "SecureP@ss123",
  "firstName": "Admin",
  "lastName": "User",
  "tenantName": "Test Company"
}
```

**Risposta attesa:**
```json
{
  "user": {
    "id": "...",
    "email": "admin@test.com",
    "tenantId": "..."
  },
  "mfaCode": "123456"  // Codice MFA da usare per login
}
```

### 3.2 Login con MFA

```http
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@test.com",
  "password": "SecureP@ss123",
  "mfaCode": "123456"  // Usa il codice ricevuto dalla registrazione
}
```

**Risposta:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": { ... }
}
```

Salva il `accessToken` per le richieste successive!

---

## 4. Configurazione Provider Email

### 4.1 Google (Gmail)

**Prerequisiti:**
1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un progetto o seleziona uno esistente
3. Abilita Gmail API
4. Crea credenziali OAuth 2.0:
   - Tipo: Web application
   - Redirect URI: `http://localhost:3000/providers/google/callback`
5. Copia Client ID e Client Secret nel file `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

**Collegamento Account Gmail:**

```http
GET http://localhost:3000/providers/google/auth
Authorization: Bearer {accessToken}
```

Questo ti reindirizzerà a Google OAuth. Dopo l'autorizzazione, il provider verrà automaticamente configurato.

**Verifica Provider:**
```http
GET http://localhost:3000/providers
Authorization: Bearer {accessToken}
```

### 4.2 Microsoft (Outlook)

**Prerequisiti:**
1. Vai su [Azure Portal](https://portal.azure.com/)
2. Registra una nuova app in Azure AD
3. Permissions richieste:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `offline_access`
4. Redirect URI: `http://localhost:3000/providers/microsoft/callback`
5. Copia Client ID e Client Secret nel `.env`:
   ```env
   MICROSOFT_CLIENT_ID=your-client-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   MICROSOFT_TENANT_ID=your-tenant-id
   ```

**Collegamento Account Microsoft:**

```http
GET http://localhost:3000/providers/microsoft/auth
Authorization: Bearer {accessToken}
```

---

## 5. Test Sincronizzazione Smart Sync

### 5.1 Trigger Sync Manuale

```http
POST http://localhost:3000/email-sync/sync/{providerId}
Authorization: Bearer {accessToken}
```

### 5.2 Verifica Stato Sync

```http
GET http://localhost:3000/email-sync/status
Authorization: Bearer {accessToken}
```

**Risposta attesa:**
```json
{
  "queues": {
    "high": { "waiting": 0, "active": 0, "completed": 5 },
    "normal": { "waiting": 0, "active": 0, "completed": 10 },
    "low": { "waiting": 0, "active": 0, "completed": 3 }
  },
  "providers": {
    "total": 2,
    "neverSynced": 0,
    "syncedToday": 2
  },
  "scheduler": {
    "isRunning": false,
    "batchSize": 200,
    "intervalMinutes": 5
  },
  "smartSync": {
    "priorityDistribution": [
      { "priority": 1, "count": 1, "description": "High (3 min)" },
      { "priority": 3, "count": 1, "description": "Medium (30 min)" }
    ],
    "avgActivityRate": 2.5,
    "providersWithErrors": 0
  }
}
```

### 5.3 Test Priorità Dinamica

Dopo la prima sincronizzazione, il sistema calcolerà automaticamente:
- **avgActivityRate** (email/ora nelle ultime 24h)
- **syncPriority** (1-5 basato su attività)
- **nextSyncAt** (prossimo sync basato su priority)

**Esempio:**
- Account con 5 email/ora → Priority 1 → Sync ogni 3 minuti
- Account con 1 email/ora → Priority 3 → Sync ogni 30 minuti
- Account con 0.05 email/ora → Priority 5 → Sync ogni 6 ore

---

## 6. Test Webhook Real-Time

### 6.1 Setup Gmail Pub/Sub

**Prerequisiti:**
1. Google Cloud Project con Gmail API abilitata
2. Crea Pub/Sub Topic:
   ```bash
   gcloud pubsub topics create gmail-notifications
   ```
3. Aggiungi permissions:
   ```bash
   gcloud pubsub topics add-iam-policy-binding gmail-notifications \
     --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
     --role=roles/pubsub.publisher
   ```
4. Configura `.env`:
   ```env
   GMAIL_PUBSUB_TOPIC=projects/YOUR_PROJECT_ID/topics/gmail-notifications
   ```

**Crea Webhook Subscription:**

Il webhook verrà creato automaticamente quando colleghi un account Gmail tramite OAuth.

Oppure manualmente:
```http
POST http://localhost:3000/email-sync/providers/{providerId}/webhook
Authorization: Bearer {accessToken}
```

### 6.2 Setup Microsoft Graph Webhook

**Prerequisiti:**
1. Backend deve essere accessibile pubblicamente (usa ngrok per test)
   ```bash
   ngrok http 3000
   ```
2. Copia l'URL ngrok (es: `https://abc123.ngrok.io`)
3. Configura `.env`:
   ```env
   MICROSOFT_WEBHOOK_URL=https://abc123.ngrok.io/webhooks/microsoft/notifications
   ```

**Verifica Webhook:**
```http
GET http://localhost:3000/webhooks/health
```

### 6.3 Test Notifiche Real-Time

1. Invia una nuova email al tuo account Gmail o Outlook
2. Osserva il monitor: vedrai il sync triggerato entro 15-60 secondi
3. Verifica che l'email appaia nel database

**Query manuale database:**
```bash
cd backend
npx prisma studio
```

Apri **http://localhost:5555** per vedere i dati in tempo reale.

---

## 7. Test Scenari Specifici

### Scenario 1: Account Ad Alta Attività

1. Collega account Gmail personale (con molte email)
2. Aspetta prima sincronizzazione
3. Nel monitor vedrai:
   - `avgActivityRate` > 4 email/h
   - `syncPriority` = 1
   - Sync ogni 3 minuti

### Scenario 2: Account Inattivo

1. Collega account email poco usato
2. Dopo 24h senza email:
   - `avgActivityRate` < 0.1
   - `syncPriority` = 5
   - Sync ogni 6 ore

### Scenario 3: Webhook Real-Time

1. Setup ngrok e webhook (vedi sopra)
2. Invia email all'account
3. Verifica latenza: **<60 secondi**

### Scenario 4: Fallback a Polling

1. Disattiva webhook (es: scadenza)
2. Sistema torna automaticamente a polling
3. Sync continua basato su `syncPriority`

---

## 8. Comandi Utili

### Reset Provider Priority

Se vuoi testare il cambio di priorità:

```sql
-- Abbassa priority manualmente
UPDATE provider_configs
SET sync_priority = 5, next_sync_at = NOW()
WHERE email = 'test@gmail.com';
```

### Trigger Sync Immediato

```http
POST http://localhost:3000/email-sync/sync/{providerId}
Authorization: Bearer {accessToken}
```

### Visualizza Queue Status

```http
GET http://localhost:3000/email-sync/queues
Authorization: Bearer {accessToken}
```

### Pause/Resume Queue

```http
POST http://localhost:3000/email-sync/queues/high/pause
Authorization: Bearer {accessToken}

POST http://localhost:3000/email-sync/queues/high/resume
Authorization: Bearer {accessToken}
```

---

## 9. Troubleshooting

### Provider non si sincronizza

**Verifica:**
1. Provider è attivo: `isActive = true`
2. Token OAuth validi (non scaduti)
3. Nessun error streak alto

**Fix:**
```http
POST http://localhost:3000/email-sync/sync/{providerId}
Authorization: Bearer {accessToken}
```

### Webhook non riceve notifiche

**Gmail:**
1. Verifica Pub/Sub topic configurato
2. Controlla logs backend per errori
3. Rinnova watch:
   ```http
   POST http://localhost:3000/email-sync/providers/{providerId}/webhook/renew
   Authorization: Bearer {accessToken}
   ```

**Microsoft:**
1. Verifica ngrok attivo
2. Controlla webhook URL pubblicamente accessibile
3. Verifica subscription non scaduta

### Worker non parte

```bash
# Verifica Redis
docker ps | grep redis

# Riavvia backend
npm run start:dev
```

---

## 10. Metriche di Successo

Dopo i test, verifica:

✅ **Smart Sync funziona:**
- Priorità calcolate correttamente
- Intervalli adattivi (3min - 6h)
- Activity rate aggiornato dopo sync

✅ **Webhook funzionano:**
- Gmail: Latenza <30 secondi
- Microsoft: Latenza <60 secondi
- Notifiche ricevute su `/webhooks/*`

✅ **Fallback polling:**
- Account IMAP sincronizzati
- Webhook falliti tornano a polling

✅ **Performance:**
- API calls ridotte del 58-65%
- Nessun errore critico
- CPU/RAM uso normale

---

## 11. Next Steps

Dopo test positivi:

1. **Deploy produzione:**
   - Setup Google Cloud Pub/Sub
   - Deploy backend su dominio HTTPS
   - Configura webhook URL produzione

2. **Monitoring:**
   - Setup Prometheus metrics
   - Alert su PagerDuty/Slack
   - Dashboard Grafana

3. **Scaling:**
   - Aumenta worker concurrency
   - Multi-instance backend con load balancer
   - Redis Cluster per alta disponibilità

---

## 📞 Support

In caso di problemi:
1. Controlla logs backend
2. Verifica `.env` configurato correttamente
3. Controlla database con Prisma Studio
4. Usa monitoring script per debug

**Buon testing! 🚀**
