# Mail Sync Bulk Strategy (Gmail/Microsoft) - Draft Plan

Obiettivo: evitare fetch/insert per messaggio e ridurre i webhook/emitting durante il primo import. Implementazione per provider Gmail e Microsoft con batching di fetch, upsert e embedding.

## Principi guida
1. **Batch fetch**: usare batchGet (Gmail) o paginazione `top`/delta batch (Graph) per recuperare più messaggi con una sola chiamata.
2. **Upsert bulk**: raggruppare i messaggi in blocchi (es. 50-100) e fare `createMany`/`upsertMany` (o transazioni con loop) per ridurre round-trip DB.
3. **Embedding bulk**: enqueue embedding in blocchi (già introdotto un buffer nell’`EmailEmbeddingQueueService`); estendere alla creazione batch dai servizi di sync.
4. **Realtime throttling**: emettere eventi solo a fine batch (es. `sync:status` e un event summary) invece che per ogni messaggio.
5. **Rate limit/fallback**: rispettare i limiti API (Gmail batchGet max 100) e inserire sleep tra i batch se necessario.

## Parametri consigliati
- `BATCH_FETCH_SIZE`: 100 (Gmail batchGet), 50-100 (Microsoft `message` list/delta)
- `BATCH_DB_SIZE`: 50-100 per upsert DB
- `EMBEDDING_ENQUEUE_BATCH`: già buffer interno (50/200ms), usarlo lato sync per aggiungere in bulk
- `REALTIME_BATCH_NOTIFY`: emit solo a fine batch

## Sequenza di lavoro (per provider)
1) **Gmail bulk**
   - `syncFull`/`syncIncremental`: accumula ids dalle list, processa in chunk da 100 via `batchGet` (format full/metadata).
   - `processMessageData`: accetta un message già completo; rimuovere fetch singolo in loop.
   - Upsert DB in blocchi da 50-100 (se Prisma non supporta upsert many, usare transazione con create/update per batch).
   - Enqueue embedding batch (passa array all’`EmailEmbeddingQueueService`, aggiungi `enqueueMany` per ottimizzare).
   - Ridurre `notifyMailboxChange` durante bulk: emettere un evento di riepilogo a fine batch (es. `email:batch_processed` o solo `sync:status`).

2) **Microsoft bulk**
   - `syncCalendar/Contacts` già disabilitati; per mail: usare `list`/`delta` con `top` 50-100; accumula chunk e processa per batch.
   - Upsert + embedding come per Gmail, con retry su rate limit (Graph 429).

3) **Embedding queue**
   - Aggiungere `enqueueMany(jobs: EmailEmbeddingJob[])` per ridurre addBulk chiamate multiple, usando il buffer esistente.
   - Hard cap progressivo sul concurrency (già 3) e limiter attuale 10/1s.

4) **Realtime**
   - Durante bulk iniziale: disabilitare gli eventi per singolo messaggio, emettere solo `sync:status` per batch (progress %).
   - Reintrodurre eventi granulari solo su webhook/incrementale.

5) **Testing/checklist**
   - Sync full Gmail con 200-500 mail: verificare numero chiamate batchGet e riduzione webhook.
   - Verificare conteggio record in DB e tempi (prima/dopo).
   - Nessun evento realtime “message-processed” durante bulk; solo `sync:status`.

## Steps implementativi (ordine)
1. Estendere `EmailEmbeddingQueueService` con `enqueueMany` (usa addBulk e buffer) — fatto in parte (buffer singolo enqueue).
2. Gmail: refactor `syncFull`/`syncIncremental` per usare `batchGet` e `processMessageData(message, ...)` (togli fetch per id); introdurre batch upsert DB e batch enqueue embedding.
3. Microsoft: analoghi batch fetch/upsert/enqueue.
4. Realtime throttling: flag per sopprimere eventi per singolo message durante full import; emettere summary/batch status.
5. Rate limit e sleep configurabili tra i batch.

## Note
- Gmail batchGet max 100 ids per call; Graph supporta `top` fino a 100 (ma è meglio 50 per non saturare).
- Prisma non ha upsertMany: valutare `createMany` con `skipDuplicates` + update in blocchi per esistenti, oppure transazioni per chunk.
- Con worker disabilitati, testare path DB/queue senza effetti collaterali, poi riabilitare solo worker embedding quando il bulk è stabile.
