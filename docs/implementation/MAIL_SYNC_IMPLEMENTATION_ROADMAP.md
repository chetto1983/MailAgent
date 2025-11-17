# Mail/Sync Implementation Roadmap

Sintesi esecutiva dei documenti:
- `CODE_CLEANUP_ROADMAP.md`
- `MODULE_CLEANUP_CHECKLIST.md`
- `EXTERNAL_REFERENCE_NOTES.md`

Obiettivo: completare il refactor bulk mail e allineare contatti/calendari, consolidando codebase e realtime.

## 1) Gmail Sync (full/incremental)
- ✅ Helper `fetchMessagesBatch(gmail, ids, format)` (batchGet + fallback) riusato.
- ✅ Pipeline unica `parseGmailMessage` + `processMessagesBatch` (createMany/update + enqueueMany); rimossa `processMessageData`.
- ✅ Label/Deletion in chunk con `Promise.allSettled`.
- ✅ Flag per sopprimere eventi granulari e summary finale (`email:batch_processed` quando suppression attiva).
- ✅ Config parziale: BATCH size e history pages leggono da config (default 100/25).
- ✅ Retry/backoff 429/5xx (config: GMAIL_RETRY_*).
- 🔜 Test: unit su parsing/batch; e2e full import 200–500 mail con realtime throttling.
- ✅ Cap messaggi full (config: GMAIL_FULL_MAX_MESSAGES, default 200 per test).

## 2) Microsoft Mail Sync (parità con Gmail + spunti Zero-main)
- ✅ Fetch in chunk (`/$batch` + fallback) + parse pipeline unica (createMany/update + enqueueMany).
- ✅ Normalizzazione cartelle (mapping da parentId/specialUse).
- ✅ Config parziale: batch fetch size da config (default 20).
- ✅ Batch operations (read/unread) via Graph `/$batch` + update locale.
- ✅ Helper per move bulk via Graph `/$batch` + update locale (integrazione frontend ancora da collegare).
- ✅ Retry/backoff 429/5xx centralizzato via wrapper `msRequestWithRetry`.
- ✅ Realtime throttling identico a Gmail (suppress granular + batch summary/status quando attivo).
- ✅ Cap messaggi full (config: MS_FULL_MAX_MESSAGES, default 200 per test).

## 3) Embedding Pipeline
- ✅ Unificato `enqueue`/`enqueueMany` con `scheduleFlush` e dedupe per `emailId`.
- ✅ Parametri BULK_SIZE/FLUSH_MS da config (default 50/200); metriche/log a livello verbose.

## 4) Realtime Events
- ✅ Emit helper unificato (via `emitInternal`), buffer email.
- ✅ Buffer configurabile da config (REALTIME_EMAIL_BUFFER_MS/REALTIME_EMAIL_BUFFER_MAX).
- ✅ Config flag per sopprimere eventi granulari (`REALTIME_SUPPRESS_MESSAGE_EVENTS`).
- ✅ Evento summary `email:batch_processed` emesso quando suppression attiva.
- ✅ Sync status progress (processed count) inviato quando suppression attiva.
- 🔜 Log a livello verbose/summary per progress.

## 5) QueueService (email sync queues)
- ✅ Estrarre config queue (attempts, backoff, removeOn*) in costanti/config.
- ✅ Dedupe job per provider/tenant (soft+hard guard su queue/redis).
- ✅ Metriche arricchite (lastJobId, tracking completati/falliti).

## 6) CrossProviderConflict
- ✅ Priorità provider configurabile (CROSS_PROVIDER_PRIORITY_JSON) e fallback google/microsoft/generic.
- ✅ Helper elenco conflitti recenti per tenant (listRecentConflicts).

## 7) Contatti & Calendari
- 🔜 Applicare pipeline bulk (list chunk → parse → createMany/update) a Google/Microsoft contacts/calendar.
- 🔜 Normalizzazione campi e dedupe; retry 429/5xx condiviso.
- 🔜 Realtime throttling per import iniziale.

## 8) Error Handling & Logging
- 🔜 Wrapper comune `withErrorHandler` (Google/Microsoft) con contesto provider/tenant, fatal handling, backoff hint.
- 🔜 Ridurre logging rumoroso su emit/loop grandi; usare livelli debug/verbose coerenti.

## 9) Config & Constants
- 🔜 Centralizzare in config/env: batch sizes, buffer ms, retry/backoff, queue options, realtime buffer.
- 🔜 Documentare le variabili in README modulo sync/realtime.

## 10) Test & Docs
- 🔜 Unit: parseGmailMessage, batch pipeline, enqueueMany dedupe, realtime buffer flush.
- 🔜 Funzionali: bulk import mail, bulk move/delete (realtime throttling), Microsoft batch read/unread/move.
- 🔜 Aggiornare i doc (strategy/roadmap) quando i passi vengono implementati.
