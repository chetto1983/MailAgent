# 📧 Email Sync Worker - Multi-Tenant Strategy

**Data**: 30 Ottobre 2025

## Stato Aggiornato (2025-11-04)
- Il pipeline attivo utilizza `QueueService`, `SyncSchedulerService` e `SyncWorker` nel modulo `email-sync`; il worker legacy singolo è stato dismesso.
- Le API basate su `EmailConfig` restituiscono 410 Gone: configurare gli account esclusivamente tramite `/providers/*` e `ProviderConfig`.
**Obiettivo**: Implementare sincronizzazione email scalabile per ambiente multi-tenant

---

## 🎯 Problemi da Risolvere

### 1. Saturazione Risorse
- **Problema**: N tenant × M provider = troppi sync simultanei
- **Impatto**: CPU, memoria, connessioni DB, rate limits API

### 2. Rate Limiting Provider
- **Gmail API**: 250 quote units/user/second, 1 billion/day
- **Microsoft Graph**: ~2000 requests/minute/app
- **IMAP**: 10-15 connessioni simultanee/account (Gmail), 5 (Outlook)

### 3. Database Overload
- **Problema**: Migliaia di INSERT simultanei
- **Impatto**: Lock contention, performance degradation

### 4. Equità
- **Problema**: Alcuni tenant potrebbero monopolizzare risorse
- **Impatto**: Altri tenant delayed o starved

---

## 🏗️ Architettura Proposta

### Strategia 1: **Queue-Based Sync con Priorità** ✅ SCELTA

```
┌─────────────────────────────────────────────────────────┐
│                   Email Sync System                      │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │   Scheduler Service   │
                │  (Cron ogni 5 min)    │
                └───────────┬───────────┘
                            │
                  ┌─────────┴─────────┐
                  │  Select Tenants   │
                  │  + Providers      │
                  └─────────┬─────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Queue HIGH  │ │ Queue NORMAL│ │  Queue LOW  │
    │ (Priority)  │ │  (Regular)  │ │  (Batch)    │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           └───────────────┼───────────────┘
                           │
                  ┌────────┴────────┐
                  │  Worker Pool    │
                  │  (3-5 workers)  │
                  └────────┬────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  IMAP    │    │  Gmail   │    │Microsoft │
    │  Sync    │    │  API     │    │  Graph   │
    └──────────┘    └──────────┘    └──────────┘
```

---

## 📋 Strategie Implementate

### 1. **Rate Limiting per Provider**

```typescript
// Limiti per provider type
const RATE_LIMITS = {
  imap: {
    concurrent: 3,        // Max 3 sync IMAP simultanei
    perTenant: 1,         // Max 1 per tenant
    interval: 5000,       // 5 secondi tra sync stesso account
  },
  google: {
    concurrent: 10,       // Gmail API più veloce
    perTenant: 2,         // Max 2 per tenant
    interval: 2000,       // 2 secondi
  },
  microsoft: {
    concurrent: 8,
    perTenant: 2,
    interval: 3000,
  },
};
```

### 2. **Batch Processing con Staggering**

```typescript
// Non sincronizzare tutti i tenant insieme
// Distribuisci nel tempo

Cron Job ogni 5 minuti:
  1. SELECT tenant WHERE last_sync < NOW() - interval
     ORDER BY priority DESC, last_sync ASC
     LIMIT 50  // Batch size

  2. Per ogni tenant:
     - Aggiungi job alla queue con priority
     - Delay staggered: batch_position × 100ms

  3. Worker processa con concurrency limit
```

### 3. **Prioritization System**

```typescript
enum SyncPriority {
  CRITICAL = 1,    // Tenant paganti premium, sync ogni 5 min
  HIGH = 2,        // Tenant attivi, sync ogni 15 min
  NORMAL = 3,      // Tenant regolari, sync ogni 30 min
  LOW = 4,         // Tenant inattivi, sync ogni 2 ore
}

// Calcolo dinamico priorità
function calculatePriority(tenant: Tenant): SyncPriority {
  if (tenant.plan === 'premium') return SyncPriority.CRITICAL;
  if (tenant.lastLoginAt > Date.now() - 1h) return SyncPriority.HIGH;
  if (tenant.lastLoginAt > Date.now() - 24h) return SyncPriority.NORMAL;
  return SyncPriority.LOW;
}
```

### 4. **Incremental Sync**

```typescript
// Non risincronizzare tutto, solo nuovi messaggi

IMAP:
  - Salvare ultimo UID fetchato
  - SEARCH UID ${lastUID}:*
  - Fetch solo nuovi

Gmail API:
  - historyId per delta sync
  - Fetch solo messaggi dopo historyId

Microsoft Graph:
  - deltaLink per incremental
  - Fetch solo delta changes
```

### 5. **Circuit Breaker Pattern**

```typescript
// Se provider fallisce troppo, skip temporaneamente

CircuitBreaker per provider:
  States: CLOSED → OPEN → HALF_OPEN

  Thresholds:
    - 5 errori consecutivi → OPEN (skip sync per 5 min)
    - Test dopo 5 min → HALF_OPEN
    - 1 success → CLOSED (riprendi normal)
    - 1 failure → OPEN (altri 5 min)
```

---

## 🔧 Implementazione Tecnica

### Database Schema Updates

```sql
-- Aggiungi campi a provider_configs
ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS sync_priority INTEGER DEFAULT 3;
ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;
ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS last_sync_uid TEXT;  -- IMAP
ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS last_history_id TEXT; -- Gmail
ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS last_delta_link TEXT; -- Microsoft
ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS sync_error_count INTEGER DEFAULT 0;
ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS circuit_state TEXT DEFAULT 'CLOSED';

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_provider_sync ON provider_configs(last_synced_at, sync_priority, is_active);
CREATE INDEX IF NOT EXISTS idx_tenant_provider ON provider_configs(tenant_id, provider_type);
```

### Queue Configuration

```typescript
// 3 code separate con diverse priorità
const queues = {
  high: new Queue('email-sync-high', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 100, // Keep last 100 failures
    }
  }),
  normal: new Queue('email-sync-normal', {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: true,
    }
  }),
  low: new Queue('email-sync-low', {
    connection: redis,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
    }
  }),
};
```

### Worker Pool Configuration

```typescript
// Worker pool con concurrency limits
const workerConfig = {
  high: {
    concurrency: 5,    // 5 job simultanei
    limiter: {
      max: 10,         // Max 10 job processati
      duration: 60000, // per minuto
    }
  },
  normal: {
    concurrency: 3,
    limiter: {
      max: 5,
      duration: 60000,
    }
  },
  low: {
    concurrency: 2,
    limiter: {
      max: 3,
      duration: 60000,
    }
  },
};
```

---

## 📊 Configurazioni Sync Interval

### Per Tipo Provider

```typescript
const SYNC_INTERVALS = {
  // In base a tipo di provider
  google: {
    critical: 5 * 60 * 1000,    // 5 min
    high: 15 * 60 * 1000,       // 15 min
    normal: 30 * 60 * 1000,     // 30 min
    low: 120 * 60 * 1000,       // 2 ore
  },
  microsoft: {
    critical: 5 * 60 * 1000,
    high: 15 * 60 * 1000,
    normal: 30 * 60 * 1000,
    low: 120 * 60 * 1000,
  },
  generic: { // IMAP/SMTP
    critical: 10 * 60 * 1000,   // 10 min (più lento, limiti IMAP)
    high: 30 * 60 * 1000,       // 30 min
    normal: 60 * 60 * 1000,     // 1 ora
    low: 240 * 60 * 1000,       // 4 ore
  },
};
```

---

## 🎮 Flow di Sync

### Scheduler Flow (ogni 5 minuti)

```typescript
1. Query providers da sincronizzare:
   SELECT * FROM provider_configs
   WHERE is_active = true
   AND circuit_state != 'OPEN'
   AND (
     last_synced_at IS NULL
     OR last_synced_at < NOW() - sync_interval
   )
   ORDER BY sync_priority ASC, last_synced_at ASC
   LIMIT 50;

2. Gruppa per priority:
   - CRITICAL → queue HIGH
   - HIGH → queue HIGH
   - NORMAL → queue NORMAL
   - LOW → queue LOW

3. Aggiungi job con delay staggered:
   for (i, provider in providers) {
     await queue.add('sync-provider', {
       providerId: provider.id,
       tenantId: provider.tenantId,
       providerType: provider.providerType,
     }, {
       delay: i * 100, // 100ms stagger
       jobId: `sync-${provider.id}-${Date.now()}`,
     });
   }
```

### Worker Flow

```typescript
1. Worker riceve job

2. Check rate limit:
   - Concurrent jobs per provider type
   - Per-tenant rate limit
   - Interval since last sync

3. Fetch provider config + decrypt credentials

4. Sync based on provider type:
   - IMAP: Incremental UID sync
   - Gmail: History ID delta
   - Microsoft: Delta link sync

5. Store messages:
   - Batch insert (100 messaggi alla volta)
   - Update last_sync markers
   - Update last_synced_at

6. Update metrics:
   - Sync duration
   - Messages fetched
   - Errors if any

7. Circuit breaker:
   - Reset error_count on success
   - Increment on failure
   - Update circuit_state if threshold
```

---

## 🚨 Error Handling

### Retry Strategy

```typescript
Job Options:
  attempts: 3
  backoff: {
    type: 'exponential',
    delay: 5000, // 5s, 25s, 125s
  }

Error Categories:
  1. Transient (network, timeout):
     → Retry with backoff

  2. Auth Error (invalid credentials):
     → No retry, mark provider as needs_reconnect

  3. Rate Limit:
     → Delay 60s, then retry

  4. Provider Down:
     → Open circuit breaker, skip for 5 min
```

### Circuit Breaker Implementation

```typescript
interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureAt: Date | null;
  nextRetryAt: Date | null;
}

Thresholds:
  - 5 consecutive failures → OPEN
  - OPEN duration: 5 minutes
  - HALF_OPEN: try 1 request
    - Success → CLOSED
    - Failure → OPEN (another 5 min)
```

---

## 📈 Monitoring & Metrics

### Key Metrics to Track

```typescript
Metrics:
  - sync_jobs_queued (by priority)
  - sync_jobs_processing (by provider_type)
  - sync_jobs_completed (by provider_type)
  - sync_jobs_failed (by provider_type, error_type)
  - sync_duration_ms (histogram)
  - messages_synced_total (counter)
  - circuit_breaker_state (gauge by provider)
  - queue_lag_seconds (gauge by priority)
  - rate_limit_hits (counter by provider_type)
```

### Health Checks

```http
GET /health/queues
[
  {
    "queue": "high",
    "completed": 1234,
    "failed": 12,
    "averageDurationMs": 420,
    "lastDurationMs": 390,
    "lastCompletedAt": "2025-11-04T17:20:11.000Z"
  },
  {
    "queue": "normal",
    "completed": 567,
    "failed": 3,
    "averageDurationMs": 610,
    "lastDurationMs": 580
  },
  {
    "queue": "low",
    "completed": 90,
    "failed": 0,
    "averageDurationMs": 1200,
    "lastDurationMs": 1180
  }
]

GET /health/metrics
# HELP email_sync_queue_completed Total completed sync jobs per queue
email_sync_queue_completed{queue="high"} 1234
email_sync_queue_completed{queue="normal"} 567
email_sync_queue_completed{queue="low"} 90
# HELP email_sync_queue_failed Total failed sync jobs per queue
email_sync_queue_failed{queue="high"} 12
```

---

## 🔬 Testing Strategy

### Load Testing Scenarios

```typescript
Scenario 1: 100 tenants, 2 providers each
  - Expected: All sync within 15 minutes
  - Max concurrent: 5 workers
  - Success rate: > 95%

Scenario 2: 1000 tenants (spike)
  - Batch processing: 50 per cycle
  - All tenants synced: < 2 hours
  - No resource exhaustion

Scenario 3: Provider failures
  - Circuit breaker activates
  - Other providers unaffected
  - Automatic recovery after 5 min
```

---

## 🎯 Scalability Targets

### Performance Goals

```
Tenant Scale:
  - 100 tenants: < 5 minutes full sync
  - 1,000 tenants: < 1 hour full sync
  - 10,000 tenants: < 4 hours full sync (with 10 workers)

Resource Usage:
  - CPU: < 50% average
  - Memory: < 2GB per worker
  - DB connections: < 20 simultaneous
  - Redis: < 100MB queue data

Rate Limits:
  - Stay under 50% of provider limits
  - No 429 errors (rate limit exceeded)
```

---

## 🛠️ Configuration Example

### Environment Variables

```env
# Email Sync Configuration
EMAIL_SYNC_ENABLED=true
EMAIL_SYNC_CRON=*/5 * * * *      # Every 5 minutes
EMAIL_SYNC_BATCH_SIZE=50         # Providers per batch
EMAIL_SYNC_STAGGER_MS=100        # Delay between jobs

# Worker Configuration


# Rate Limits
IMAP_CONCURRENT_MAX=3
GMAIL_CONCURRENT_MAX=10
MICROSOFT_CONCURRENT_MAX=8

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5      # Failures before open
CIRCUIT_BREAKER_TIMEOUT=300000   # 5 minutes
```

---

## 📝 Implementation Checklist

### Phase 1: Foundation (2-3 giorni)
- [ ] Database schema updates
- [ ] Priority calculation logic
- [ ] Queue setup (3 priorities)
- [ ] Basic worker pool

### Phase 2: Rate Limiting (1-2 giorni)
- [ ] Per-provider rate limiters
- [ ] Per-tenant rate limiters
- [ ] Staggered job scheduling

### Phase 3: Incremental Sync (2-3 giorni)
- [ ] IMAP UID tracking
- [ ] Gmail historyId
- [ ] Microsoft deltaLink
- [ ] Batch insert optimization

### Phase 4: Circuit Breaker (1 giorno)
- [ ] State machine implementation
- [ ] Failure tracking
- [ ] Auto-recovery logic

### Phase 5: Monitoring (1 giorno)
- [ ] Metrics collection
- [ ] Health endpoints
- [ ] Logging enhancement

### Phase 6: Testing (2 giorni)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Load testing

**Totale stimato**: 9-12 giorni

---

## ✅ Vantaggi della Strategia

1. **Scalabile**: Gestisce da 10 a 10,000+ tenant
2. **Fair**: Priorità evita starvation
3. **Resilient**: Circuit breaker protegge da cascading failures
4. **Efficiente**: Incremental sync riduce carico
5. **Monitorabile**: Metriche dettagliate per troubleshooting
6. **Configurabile**: Tuning via env vars
7. **Cost-effective**: Rispetta rate limits = no extra costs

---

## 🎯 Next Steps

1. **Review questa strategia** - Ok con questo approach?
2. **Implementare Phase 1** - Foundation + schema
3. **Test con 10 tenant** - Validare funzionamento base
4. **Scale progressivamente** - 100, 1000, 10000 tenant

**Quale fase vuoi iniziare?** 🚀
