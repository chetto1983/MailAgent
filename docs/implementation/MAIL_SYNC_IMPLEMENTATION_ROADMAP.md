# Mail/Sync Implementation Roadmap

Sintesi esecutiva dei documenti:
- `CODE_CLEANUP_ROADMAP.md`
- `MODULE_CLEANUP_CHECKLIST.md`
- `EXTERNAL_REFERENCE_NOTES.md`

Obiettivo: completare il refactor bulk mail e allineare contatti/calendari, consolidando codebase e realtime.

## 1) Gmail Sync (full/incremental)
- Estrarre helper `fetchMessagesBatch(gmail, ids, format)` (batchGet + fallback) e riuso in full/incremental.
- Creare `parseGmailMessage` unico; usare pipeline batch (parse → createMany/update → enqueueMany) per tutti i path; deprecare `processMessageData`.
- Label/Deletion: processare set in chunk con `Promise.allSettled` + backoff; flag per sopprimere eventi granulari in bulk e summary finale (`sync:status`).
- Config: spostare costanti (BATCH size, history max pages, buffer ms) in config/env.
- Test: unit su parsing e batch pipeline; e2e su full import 200–500 mail con realtime throttling.

## 2) Microsoft Mail Sync (parità con Gmail + spunti Zero-main)
- Fetch in chunk (`top` 50–100) + parse pipeline unica (createMany/update + enqueueMany).
- Batch operations: usare Graph `/$batch` per read/unread/move bulk (spunto Zero-main).
- Normalizzazione cartelle (Inbox/Sent/Drafts/Bin/Archive/Spam) e cache id.
- Retry/backoff 429/5xx centralizzato; error wrapper comune.
- Realtime throttling identico a Gmail; summary per bulk move/delete dal frontend.

## 3) Embedding Pipeline
- Unificare `enqueue`/`enqueueMany` con `scheduleFlush` e dedupe per `emailId` prima di `addBulk`.
- Metriche/log ridotti (verbose) per flush; parametri BULK_SIZE/FLUSH_MS da config.

## 4) Realtime Events
- Unificare emit helper (`emitToTenant` vs immediate) e rendere configurabile il buffer (ms, max) da config.
- Considerare evento summary `email:batch_processed` per full import/move bulk; log a livello verbose.

## 5) QueueService (email sync queues)
- Estrarre config queue (attempts, backoff, removeOn*) in costanti/config.
- Dedupe job per provider/tenant centralizzato; helper per metriche durata (evitare codice duplicato).

## 6) CrossProviderConflict
- Spostare priorità provider in config/tipo; validare input (strategy/states).
- Helper condivisi per log conflitti e stats (riuso per report).

## 7) Contatti & Calendari
- Applicare pipeline bulk (list chunk → parse → createMany/update) a Google/Microsoft contacts/calendar.
- Normalizzazione campi (email/phone) e dedupe; retry 429/5xx condiviso.
- Realtime throttling per import iniziale.

## 8) Error Handling & Logging
- Wrapper comune `withErrorHandler` (Google/Microsoft) con contesto provider/tenant, fatal handling, backoff hint.
- Ridurre logging rumoroso su emit e su loop grandi; usare livelli debug/verbose coerenti.

## 9) Config & Constants
- Centralizzare in config/env: batch sizes, buffer ms, retry/backoff, queue options, realtime buffer.
- Documentare le variabili in README modulo sync/realtime.

## 10) Test & Docs
- Unit: parseGmailMessage, batch pipeline, enqueueMany dedupe, realtime buffer flush.
- Funzionali: bulk import mail, bulk move/delete (realtime throttling), Microsoft batch read/unread/move.
- Aggiornare i doc (strategy/roadmap) quando i passi vengono implementati.
