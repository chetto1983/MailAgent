# 📧 Email Sync System - Usage Guide

**Data**: 01 Novembre 2025
**Sistema**: Multi-tenant Email Sync con BullMQ

---

## 🚀 Quick Start

### 1. Prerequisiti

Assicurati che Redis sia in esecuzione:

```bash
# Con Docker
docker-compose up redis -d

# Oppure Redis locale
redis-server
```

### 2. Avviare il Backend

```bash
cd backend
npm run start:dev
```

Il sistema inizierà automaticamente:
- ✅ Connessione a Redis
- ✅ Inizializzazione 3 code (HIGH, NORMAL, LOW)
- ✅ Avvio 10 worker (5 HIGH + 3 NORMAL + 2 LOW)
- ✅ Scheduler cron ogni 5 minuti

---

## 📊 Monitoraggio Sistema

### Stato Generale

```bash
curl http://localhost:3000/email-sync/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Risposta:**
```json
{
  "queues": [
    {
      "queueName": "email-sync-high",
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 3,
      "delayed": 0
    }
  ],
  "providers": {
    "total": 3,
    "neverSynced": 0,
    "syncedToday": 3
  },
  "scheduler": {
    "isRunning": false,
    "batchSize": 50,
    "intervalMinutes": 5
  }
}
```

### Stato Code

```bash
curl http://localhost:3000/email-sync/queues \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ⚡ Operazioni Manuali

### Sincronizzazione Manuale di un Provider

```bash
curl -X POST http://localhost:3000/email-sync/sync/PROVIDER_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Questo aggiunge il provider alla coda **HIGH priority** per sincronizzazione immediata.

### Pausa Coda

```bash
# Pausa coda HIGH
curl -X POST http://localhost:3000/email-sync/queues/high/pause \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Pausa coda NORMAL
curl -X POST http://localhost:3000/email-sync/queues/normal/pause \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Ripresa Coda

```bash
curl -X POST http://localhost:3000/email-sync/queues/high/resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Cancellazione Coda (⚠️ ATTENZIONE)

Elimina TUTTI i job dalla coda:

```bash
curl -X POST http://localhost:3000/email-sync/queues/low/clear \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔄 Come Funziona

### Scheduler Automatico

Ogni **5 minuti**, lo scheduler:

1. **Seleziona 50 provider** da sincronizzare:
   - Provider mai sincronizzati
   - Provider non sincronizzati negli ultimi 5 minuti
   - Ordinati per data ultima sincronizzazione (più vecchi prima)

2. **Determina priorità**:
   - **HIGH**: Mai sincronizzati o sincronizzati nelle ultime 2 ore (utenti attivi)
   - **NORMAL**: Sincronizzati 2-24 ore fa
   - **LOW**: Sincronizzati oltre 24 ore fa (utenti inattivi)

3. **Determina tipo sincronizzazione**:
   - **FULL**: Prima sincronizzazione o > 1 ora dall'ultima
   - **INCREMENTAL**: < 1 ora dall'ultima sincronizzazione

4. **Aggiunge job alle code** con staggering di 100ms tra job

### Worker Processing

I worker processano i job in parallelo:

- **HIGH queue**: 5 worker simultanei
- **NORMAL queue**: 3 worker simultanei
- **LOW queue**: 2 worker simultanei

Ogni worker:
1. Riceve un job dalla coda
2. Decripta i token/credenziali del provider
3. Chiama il servizio appropriato (Gmail, Microsoft, IMAP)
4. Salva nuove email (TODO: implementare storage)
5. Aggiorna `lastSyncedAt` e `lastSyncToken` nel database
6. Ritorna statistiche (messaggi processati, nuovi messaggi, durata)

### Sincronizzazione Incrementale

#### Gmail (Google API)
- Usa `historyId` per tracking
- Chiama `/users/me/history.list` con `startHistoryId`
- Recupera solo email aggiunte/eliminate dopo l'ultima sincronizzazione
- Salva nuovo `historyId` in `provider_configs.metadata`

#### Microsoft (Graph API)
- Usa `deltaLink` per tracking
- Chiama il deltaLink salvato per ottenere solo cambiamenti
- Recupera solo email nuove/modificate
- Salva nuovo `deltaLink` in `provider_configs.metadata`

#### IMAP (Generic Provider)
- Usa `UID` (Unique ID) per tracking
- Fetch solo messaggi con UID > ultimo UID sincronizzato
- UIDs sono monotonicamente crescenti e permanenti
- Salva massimo UID in `provider_configs.metadata`

---

## 📈 Performance

### Limiti di Rate

**Concurrency per coda:**
- HIGH: 5 job simultanei, max 10 job/minuto
- NORMAL: 3 job simultanei, max 5 job/minuto
- LOW: 2 job simultanei, max 3 job/minuto

**Staggering:**
- 100ms di delay tra ogni job aggiunto
- Previene picchi di connessioni simultanee

### Retry Policy

**HIGH priority:**
- 3 tentativi
- Backoff esponenziale (5s, 10s, 20s)
- Mantiene ultimi 50 job completati, 100 falliti

**NORMAL priority:**
- 2 tentativi
- Backoff esponenziale (10s, 20s)
- Auto-remove job completati

**LOW priority:**
- 1 tentativo
- Nessun retry
- Auto-remove job completati

---

## 🗄️ Database

### Campo lastSyncedAt

Aggiornato automaticamente dopo ogni sincronizzazione riuscita:

```sql
UPDATE provider_configs
SET "lastSyncedAt" = NOW()
WHERE id = 'provider_id';
```

### Campo metadata (JSONB)

Salva token per sincronizzazione incrementale:

```json
{
  "lastSyncToken": "1234567890",  // historyId, deltaLink, o UID
  // Altri metadata provider-specific
}
```

**Gmail:**
```json
{ "lastSyncToken": "8675309" }  // historyId
```

**Microsoft:**
```json
{
  "lastSyncToken": "https://graph.microsoft.com/v1.0/me/messages/delta?$deltatoken=..."
}
```

**IMAP:**
```json
{ "lastSyncToken": "12345" }  // Max UID
```

---

## 🛠️ Configurazione

### Variabili d'Ambiente

```env
# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=         # Opzionale

# Sync Configuration (opzionali - valori di default)
SYNC_BATCH_SIZE=50              # Provider per ciclo
SYNC_INTERVAL_MINUTES=5         # Frequenza scheduler
SYNC_INCREMENTAL_THRESHOLD=1    # Ore per incremental vs full
```

### Modifica Scheduler

Per cambiare la frequenza di sincronizzazione, modifica il decoratore in `sync-scheduler.service.ts`:

```typescript
// Ogni 5 minuti (default)
@Cron(CronExpression.EVERY_5_MINUTES)

// Ogni 10 minuti
@Cron(CronExpression.EVERY_10_MINUTES)

// Ogni ora
@Cron(CronExpression.EVERY_HOUR)

// Custom (ogni 2 minuti)
@Cron('*/2 * * * *')
```

---

## 🐛 Debug e Logging

### Livelli di Log

Il sistema logga con diversi livelli:

- `LOG`: Operazioni normali (job aggiunti, completati)
- `DEBUG`: Dettagli operazioni (connessioni, query)
- `WARN`: Situazioni anomale (scheduler già in esecuzione)
- `ERROR`: Errori (sync falliti, connessioni perse)

### Log Importanti

```
Email sync queues initialized successfully
Started high priority worker with concurrency 5
Starting sync scheduler...
Scheduled 50 sync jobs
[high] Job xxx completed: 15 messages, 3 new
```

### Log di Errore

```
[high] Job xxx failed for user@example.com: Token expired
Sync failed for user@example.com: IMAP connection timeout
```

---

## 📝 TODO

Funzionalità non ancora implementate:

### 1. Storage Email in Database
Attualmente i messaggi vengono recuperati ma non salvati. Serve:
- Schema database per email
- Inserimento bulk messages
- Gestione allegati
- Full-text search

### 2. Circuit Breaker
Pattern per gestire provider temporaneamente non disponibili:
- Dopo N fallimenti → stato OPEN (stop sync per X minuti)
- Dopo timeout → stato HALF_OPEN (1 tentativo)
- Se successo → stato CLOSED (resume normale)

### 3. Webhook Notifications
Notifiche real-time quando arrivano nuove email:
- Gmail: Push notifications API
- Microsoft: Graph webhooks
- IMAP: IDLE command

### 4. Metriche Prometheus
Export metriche per monitoring:
- Job processati per minuto
- Latenza media sincronizzazione
- Rate di errori per provider type
- Queue depth over time

---

## 🧪 Testing

### Test con Script Node

```javascript
// test-sync.js
const http = require('http');

const JWT = 'your_jwt_token';

async function testSync() {
  // Get status
  const res = await fetch('http://localhost:3000/email-sync/status', {
    headers: { 'Authorization': `Bearer ${JWT}` }
  });

  const status = await res.json();
  console.log('Status:', JSON.stringify(status, null, 2));

  // Trigger manual sync
  const providerId = 'cmhc66y3r0001u16zzou7qpfe';
  const syncRes = await fetch(
    `http://localhost:3000/email-sync/sync/${providerId}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${JWT}` }
    }
  );

  console.log('Sync triggered:', await syncRes.json());
}

testSync();
```

### Verifica Redis

```bash
# Connetti a Redis
redis-cli

# Vedi tutte le chiavi
KEYS *

# Vedi job in una coda
LRANGE bull:email-sync-high:wait 0 -1

# Vedi statistiche
HGETALL bull:email-sync-high:stats
```

---

## 🎯 Best Practices

1. **Monitor queue depth**: Se waiting jobs > 100, considera aumentare worker concurrency
2. **Check failed jobs**: Log ricorrenti indicano problema sistemico
3. **Incremental sync**: Mantieni lastSyncToken sempre aggiornato
4. **Rate limits**: Non superare limiti API provider (vedi EMAIL_SYNC_STRATEGY.md)
5. **Database indexes**: Crea index su `lastSyncedAt` per performance query scheduler

---

## 📚 Riferimenti

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Gmail API - History](https://developers.google.com/gmail/api/guides/sync)
- [Microsoft Graph - Delta Query](https://learn.microsoft.com/en-us/graph/delta-query-overview)
- [IMAP Protocol - RFC 3501](https://www.rfc-editor.org/rfc/rfc3501)
- [EMAIL_SYNC_STRATEGY.md](./EMAIL_SYNC_STRATEGY.md) - Architettura completa

---

**Stato**: ✅ Implementato e pronto per uso
**Prossimo**: Implementare storage email in database
