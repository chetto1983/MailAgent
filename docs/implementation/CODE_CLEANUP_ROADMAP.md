# Code Cleanup Roadmap (Email/Realtime modules)

Obiettivo: ridurre ridondanza, migliorare leggibilità e avere punti unici di logica per sync, embedding, realtime e queue.

## GoogleSyncService
- **Fetch batch helper**: estrarre `fetchMessagesBatch(gmail, ids, format)` (riuso in full/incremental) con logging del fallback e tipizzazione forte; elimina duplicati di `batchGet` vs `Promise.all`.
- **Parsing unico**: creare `parseGmailMessage(message)` che restituisce l’entity mappata usata sia da `processMessagesBatch` sia dai percorsi singoli; deprecate `processMessageData` se possibile.
- **Label/Deletion handling**: per label refresh e deletions usare chunk + `Promise.allSettled` con backoff; evita loop sequenziali su set grandi.
- **Config costanti**: spostare `GMAIL_BATCH_GET_SIZE`, limiti history, ecc. in config (env o constants) per visibilità e per test.
- **Realtime throttle flag**: nei full import (e bulk move/delete) usare un flag per sopprimere eventi granulari e inviare solo summary/progress via realtime.

## Microsoft mail sync (parità con Gmail)
- Introdurre fetch in chunk (`top` 50–100) e pipeline unica (parse → createMany/update → enqueueMany embeddings).
- Gestire 429/5xx con retry/backoff centralizzato.
- Applicare lo stesso realtime throttling e l’uso di `enqueueMany`.

## EmailEmbeddingQueueService
- Unificare `enqueue`/`enqueueMany` con una `scheduleFlush()` privata; dedup su `emailId` prima di `addBulk` (Set).
- Esporre un unico entrypoint (es. `addJobs(jobs | job)`) per ridurre API surface.
- Metriche opzionali su flush (conteggio, scarti duplicati).

## RealtimeEventsService
- Ridurre duplicazione tra `emitToTenant` e `emitToTenantImmediate` portando la logica di emit in una sola funzione; lasciare il buffer per email events configurabile (ms, max) via config.
- Valutare un evento di summary batch (`email:batch_processed`) per import/move massivi invece di flush di n eventi.
- Log level: usare `verbose` per i flush per evitare rumore in `debug`.

## QueueService (email sync queues)
- Estrarre configurazione code (attempts, backoff, removeOn*) in un oggetto condiviso o config service; ridurre boilerplate di init code.
- Dedup di job per provider/tenant centralizzato (oggi la logica è sparsa).
- Metriche: raccogliere calcolo durata in helper, usare `Promise.allSettled` quando si rimuovono job.

## CrossProviderConflictService
- Estrarre la tabella di priorità provider in config e tipizzarla; ridurre sort inline.
- Centralizzare la costruzione del payload di log conflitti ed il calcolo statistiche in util condivisi per riuso lato report.
- Valutare input validation (zod/DTO) per `states` e `strategy`.

## Documentazione e test
- Aggiornare README interno del modulo sync con configurazioni di batch/limiti.
- Aggiungere test unit per `parseGmailMessage` e `processMessagesBatch` (mock Prisma) e per `enqueueMany` dedupe.
- Test funzionali: scenari bulk import + bulk move/delete per verificare realtime throttling e riduzione di webhook/eventi.
