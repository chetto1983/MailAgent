# Analisi Scalabilità - Sistema Email Sync

**Data**: 2025-11-02
**Domanda**: Il sistema può reggere 1000 tenant?

---

## 🔍 Configurazione Attuale

### Worker Configuration
```typescript
High Priority:   5 concurrent jobs
Normal Priority: 3 concurrent jobs
Low Priority:    2 concurrent jobs
─────────────────────────────────
TOTALE:         10 concurrent jobs
```

### Scheduler Configuration
```typescript
Sync Interval:  5 minuti (ogni provider)
Batch Size:     50 providers per ciclo
Rate Limiter:   max * 2 jobs/minuto per queue
```

### Limiti Rate
```typescript
High:   10 jobs/minuto (5 concurrent * 2)
Normal:  6 jobs/minuto (3 concurrent * 2)
Low:     4 jobs/minuto (2 concurrent * 2)
─────────────────────────────────
TOTALE: 20 jobs/minuto MAX
```

---

## 📈 Calcolo Capacità con Configurazione Attuale

### Scenario 1: Tutti i Tenant Attivi (Worst Case)

**Assunzioni**:
- 1000 tenant con 1 provider ciascuno = 1000 provider
- Tutti attivi e richiedono sync ogni 5 minuti
- Tempo medio sync: 10 secondi per provider

**Calcolo Throughput Attuale**:
```
Workers concorrenti: 10
Tempo medio sync:    10 secondi
Throughput:          10 providers × 6 cycles/minuto = 60 providers/minuto
```

**Tempo necessario per 1000 provider**:
```
1000 providers ÷ 60 providers/minuto = 16.67 minuti
```

**⚠️ PROBLEMA**: Lo scheduler gira ogni 5 minuti, ma servirebbero ~17 minuti per processare tutti i provider!

### Scenario 2: Distribuzione Realistica

**Assunzioni più realistiche**:
- 1000 tenant totali
- 30% attivi contemporaneamente = 300 provider attivi
- Sync ogni 5-30 minuti (distribuito)

**Calcolo**:
```
300 providers attivi ÷ 60 providers/minuto = 5 minuti ✅
```

**✅ FUNZIONA** se il carico è distribuito nel tempo!

---

## 🚨 Colli di Bottiglia Identificati

### 1. Worker Concurrency (CRITICO)
- **Attuale**: 10 concurrent jobs
- **Limite**: 60 providers/minuto
- **Con 1000 tenant**: INSUFFICIENTE se tutti attivi

### 2. Batch Size Scheduler
- **Attuale**: 50 providers per ciclo
- **Problema**: Solo 50 provider schedulati ogni 5 minuti
- **Con 1000 tenant**: Servirebbero 20 cicli = 100 minuti per fare il giro completo

### 3. Redis Queue
- **Attuale**: Singola istanza Redis
- **Limite**: ~50,000 jobs/secondo (teorico)
- **Stato**: ✅ NON è un bottleneck

### 4. Database (PostgreSQL)
- **Query per sync**: ~3 query (select provider, update, insert emails)
- **Con 60 sync/minuto**: ~180 query/minuto
- **Stato**: ✅ Capacità PostgreSQL molto superiore

### 5. API Rate Limits Esterni

#### Microsoft Graph API
- **Limite**: 10,000 requests/10 minuti per app
- **Equivalente**: 1,000 requests/minuto
- **Con 100 sync Microsoft/minuto**: ~200 requests/minuto
- **Stato**: ✅ OK

#### Gmail API
- **Limite**: 250 quota units/secondo per user
- **Limite app**: 10,000 requests/100 secondi = 100 req/sec
- **Con 100 sync Google/minuto**: ~30 requests/minuto
- **Stato**: ✅ OK

#### IMAP Generic
- **Limite**: Dipende dal provider
- **Rate limiting**: Necessario per evitare ban
- **Stato**: ⚠️ Rischio per provider strict (es. Gmail IMAP)

---

## 💡 Soluzioni per Scalare a 1000 Tenant

### Soluzione 1: Aumentare Worker Concurrency (FACILE)
```typescript
// Da:
high:   { concurrency: 5 }
normal: { concurrency: 3 }
low:    { concurrency: 2 }

// A:
high:   { concurrency: 20 }  // 4x
normal: { concurrency: 15 }  // 5x
low:    { concurrency: 10 }  // 5x
─────────────────────────────
TOTALE: 45 concurrent jobs (invece di 10)
```

**Throughput nuovo**: 45 × 6 = 270 providers/minuto
**Tempo per 1000 provider**: 1000 ÷ 270 = 3.7 minuti ✅

**Requisiti**:
- Server con più CPU cores (almeno 8-16 cores)
- Più RAM (~4GB minimo)
- Costo: ~ +$50-100/mese cloud

### Soluzione 2: Aumentare Batch Size
```typescript
// Da:
BATCH_SIZE = 50

// A:
BATCH_SIZE = 200
```

**Beneficio**: Schedula più provider per ciclo
**Problema**: Se i worker non riescono a processarli, si accumula backlog

### Soluzione 3: Worker Orizzontale Scaling (AVANZATO)
```
┌─────────────┐
│   Redis     │
│   Queue     │
└─────────────┘
       │
   ┌───┴───┬───────┬───────┐
   │       │       │       │
┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐
│ W1  │ │ W2  │ │ W3  │ │ W4  │  Multiple instances
└─────┘ └─────┘ └─────┘ └─────┘
```

**Beneficio**: Throughput lineare con numero di istanze
**Costo**: ~ +$100-200/mese per istanza

### Soluzione 4: Sync Interval Dinamico
```typescript
// Invece di sync fisso ogni 5 minuti:
- Tenant premium: ogni 1 minuto
- Tenant standard: ogni 5 minuti
- Tenant free: ogni 30 minuti
```

**Beneficio**: Riduce carico per tenant non critici
**Costo**: Gratis, solo logica applicativa

### Soluzione 5: Incremental Sync Sempre
```typescript
// Prioritizzare sync incrementale:
- Prima sincronizzazione: FULL
- Tutte le successive: INCREMENTAL (molto più veloci)
```

**Beneficio**: Sync incrementale ~10x più veloce
**Throughput effettivo**: ~600 providers/minuto
**Costo**: Gratis

---

## 🎯 Raccomandazioni per 1000 Tenant

### Piano A: Quick Win (1-2 ore implementazione)
1. ✅ Aumentare concurrency a 20/15/10 (45 totale)
2. ✅ Aumentare batch size a 200
3. ✅ Implementare sync interval dinamico per tier

**Risultato atteso**:
- Throughput: 270 provider/minuto
- Capacità: ~1500 tenant attivi

### Piano B: Ottimizzazione (1 giorno implementazione)
1. Tutto Piano A
2. ✅ Prioritizzare sync incrementale
3. ✅ Implementare caching token in Redis
4. ✅ Ottimizzare query database (connection pooling)

**Risultato atteso**:
- Throughput: 500+ provider/minuto
- Capacità: ~2500 tenant attivi

### Piano C: Scaling Avanzato (1 settimana implementazione)
1. Tutto Piano A + B
2. ✅ Horizontal scaling con multiple worker instances
3. ✅ Database read replicas
4. ✅ Redis Cluster
5. ✅ Monitoring e auto-scaling

**Risultato atteso**:
- Throughput: 1000+ provider/minuto
- Capacità: 5000+ tenant attivi

---

## 📊 Tabella Comparativa

| Scenario | Concurrent Workers | Throughput | Tempo 1000 Providers | Capacità Tenant | Costo Mensile |
|----------|-------------------|------------|---------------------|-----------------|---------------|
| **Attuale** | 10 | 60/min | 17 min ❌ | ~300 | $0 |
| **Piano A** | 45 | 270/min | 3.7 min ✅ | ~1500 | +$50-100 |
| **Piano B** | 45 | 500/min | 2 min ✅ | ~2500 | +$50-100 |
| **Piano C** | 180 (4 instances) | 1000/min | 1 min ✅ | ~5000 | +$400-500 |

---

## 🧪 Testing Requirements

Per validare la scalabilità a 1000 tenant, serve testare:

1. **Load Testing**: Simulare 1000 provider in database
2. **Stress Testing**: Triggerare sync simultaneo di tutti
3. **Monitoring**: CPU, RAM, Redis, DB durante carico
4. **API Rate Limits**: Verificare non si superino limiti esterni

---

## ✅ Risposta alla Domanda Iniziale

**"Con 1000 tenant il sistema regge?"**

### Con configurazione ATTUALE:
- ❌ **NO** se tutti i 1000 tenant sono attivi contemporaneamente
- ✅ **SI** se solo 300-400 tenant attivi (distribuzione realistica)

### Con Piano A (facile, ~2 ore):
- ✅ **SI** fino a 1500 tenant attivi
- Costo: ~$50-100/mese extra

### Con Piano B (ottimizzato, ~1 giorno):
- ✅ **SI** fino a 2500 tenant attivi
- Costo: ~$50-100/mese extra

### Con Piano C (enterprise, ~1 settimana):
- ✅ **SI** fino a 5000+ tenant attivi
- Costo: ~$400-500/mese extra

---

## 🚀 Next Steps

1. Eseguire load test con 1000 provider simulati
2. Monitorare metriche durante test
3. Implementare Piano A (quick wins)
4. Re-testare con nuova configurazione
5. Decidere se serve Piano B o C basandosi su dati reali
