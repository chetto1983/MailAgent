# 🔴 PROBLEMA IDENTIFICATO - Email Storage Non Funziona

## Situazione Attuale
- ✅ Schema database creato correttamente
- ✅ Tabella `emails` esiste nel database
- ✅ Prisma client generato con modello Email
- ✅ Codice compilato contiene `prisma.email.upsert()`
- ✅ Backend in esecuzione
- ✅ Sync jobs vengono accodati
- ❌ **NESSUNA EMAIL SALVATA NEL DATABASE** (count = 0)

## Analisi Log Backend

### Log IMAP Sync
```
[SyncWorker] Processing full sync for testopta@libero.it (generic)
[ImapSyncService] Starting full IMAP sync for testopta@libero.it
[ImapSyncService] Connected to IMAP server for testopta@libero.it
[ImapSyncService] Full sync - fetching recent messages
```

### Cosa MANCA dai Log
❌ Nessun messaggio "Saved email UID..."
❌ Nessun messaggio "Failed to process message"
❌ Nessun errore visibile
❌ Nessun log di completamento sync

## Cause Probabili

### 1. TIMEOUT durante download body IMAP
Il codice IMAP in `imap-sync.service.ts:272-289` fa:
```typescript
const download = await client.download(message.uid.toString(), '1', { uid: true });
```

Questo scarica il **corpo completo** di OGNI email. Con 100 email può richiedere troppo tempo e andare in timeout.

### 2. Worker bloccato
I worker potrebbero essere bloccati in attesa che il download completi, impedendo il processing di nuovi job.

### 3. Errori silenziosi
Gli errori potrebbero essere caught ma non loggati correttamente.

## Soluzioni da Implementare

### SOLUZIONE 1: Test Semplificato (IMMEDIATO)
Creare uno script che inserisce manualmente una email nel database per verificare che lo schema funzioni:

```typescript
await prisma.email.create({
  data: {
    tenantId: 'xxx',
    providerId: 'xxx',
    externalId: 'test-123',
    from: 'test@test.com',
    to: ['dest@test.com'],
    subject: 'Test Email',
    // ... altri campi
  }
});
```

### SOLUZIONE 2: Fix IMAP - Rimuovi Download Body (TEMPORANEO)
Commentare temporaneamente il download del body per vedere se le email vengono salvate senza contenuto:

```typescript
// Commenta righe 270-289 in imap-sync.service.ts
// let bodyText = '';
// let bodyHtml = '';
const bodyText = '';  // Empty for now
const bodyHtml = '';  // Empty for now
```

### SOLUZIONE 3: Fix Google Sync (PIÙ SEMPLICE)
Google sync è più affidabile perché usa API invece di IMAP. Testare quello prima:

```bash
curl -X POST "http://localhost:3000/email-sync/sync/cmhc66y3r0001u16zzou7qpfe"
```

### SOLUZIONE 4: Aumenta Timeout e Logging
- Aumentare timeout dei worker
- Aggiungere più logging nel processMessage
- Catturare e loggare TUTTI gli errori

## Test da Eseguire ORA

1. ✅ Verificato: database vuoto (0 email)
2. ✅ Verificato: Prisma client ha modello Email
3. ✅ Verificato: codice compilato ha upsert
4. ⏳ DA FARE: Inserimento manuale email nel DB
5. ⏳ DA FARE: Sync Google (più affidabile)
6. ⏳ DA FARE: Fix IMAP timeout

## Prossima Azione
Testare inserimento manuale nel database per confermare che lo schema funziona, poi procedere con fix del sync.
