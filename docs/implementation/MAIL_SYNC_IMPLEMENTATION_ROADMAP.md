# Mail/Sync Implementation Roadmap

Sintesi refactor e stato attuale (Nov 2025) per la sincronizzazione mail.

## Snapshot stato attuale
- Sync email: Gmail e Microsoft full+incremental con batching (fetch) e retry/backoff. Sync-back in batch: Gmail usa batchModify/batchDelete; Microsoft usa Graph `/$batch`.
- Embedding: bulk buffer con rate limit conservativo e lock esteso; gestione 429 con backoff.
- Folder: contatori basati su `specialUse` (se presente) altrimenti `name` originale; nessuna rinomina lato backend. Normalizzazione solo lato frontend per le query; display usa il nome originale.
- Realtime: buffer eventi email; dedupe/buffer su folder_counts_update; suppression eventi granulari durante batch; summary `email:batch_processed` e status di sync.
- Worker: lock/stalled configurabili via env; worker sync ripuliti dai “missing lock”.
- Contatti/Calendari: disabilitati in `.env` per ora.
- Script utili: `mail-sync-snapshot.ts` per stato provider/email; `normalize-ms-folders.ts` per ricontare folder senza rinomina.

## Gmail Sync (full/incremental)
- ✅ Helper `fetchMessagesBatch` (batchGet + fallback).
- ✅ Pipeline unica `parseGmailMessage` → `processMessagesBatch` (createMany/update + enqueueMany).
- ✅ Label/deletion in chunk; flag per sopprimere eventi granulari e summary finale.
- ✅ Config: batch size/history pages da env (default 100/25); retry/backoff 429/5xx; cap full (default 200 per test).

## Microsoft Mail Sync
- ✅ Fetch in chunk (`/$batch` + fallback), parse pipeline unica (createMany/update + enqueueMany).
- ✅ Normalizzazione cartelle tramite `specialUse`; nomi originali preservati.
- ✅ Batch operations (read/unread/move) via Graph `/$batch`; retry/backoff centralizzato.
- ✅ Cap full (default 200 per test).
- ✅ Sync-back Microsoft: Graph `/$batch` per delete/hardDelete/read/unread/star/unstar/move (folder note mappate).

## Embedding Pipeline
- ✅ Bulk enqueue con flush programmato e dedupe per `emailId`.
- ✅ Parametri da env (BULK_SIZE/FLUSH_MS/rate/lock); backoff per 429.

## Realtime Events
- ✅ Emit helper unificato, buffer email.
- ✅ Buffer configurabile (REALTIME_EMAIL_BUFFER_MS/MAX); suppression granulari; summary `email:batch_processed`; sync status progress.
- ✅ Folder counts: dedupe/buffer, niente spam di eventi.

## QueueService (email sync)
- ✅ Config queue estratta (attempts, backoff, removeOn*).
- ✅ Dedupe job per provider/tenant (guard queue + Redis).
- ✅ Metriche arricchite; lock/stalled worker configurabili.

## CrossProviderConflict
- ✅ Priorità provider configurabile (CROSS_PROVIDER_PRIORITY_JSON) e helper conflitti recenti.

## Contatti & Calendari
- 🔜 Portare pipeline bulk (list → parse → create/update) a Google/Microsoft; retry condiviso; realtime throttling import iniziale.

## Error Handling & Logging
- 🔜 Wrapper comune `withErrorHandler` per Google/Microsoft con contesto provider/tenant; ridurre logging rumoroso; livelli debug/verbose coerenti.

## Config & Constants
- 🔜 Centralizzare ulteriormente: batch sizes, buffer ms, retry/backoff, queue options, realtime buffer; documentare in README modulo sync/realtime.

## Test & Docs
- 🔜 Unit: parseGmailMessage, batch pipeline, enqueueMany dedupe, realtime buffer flush.
- 🔜 Funzionali: bulk import mail, bulk move/delete/read/unread (realtime throttling), Microsoft batch move/read/unread.
- ✅ Script snapshot per debug stato sync.

## Azioni prossime
- Verificare contatori folder post-sync (MS/Gmail) con updateCounts; frontend normalizza solo per query.
- QA bulk actions end-to-end con batch sync-back e realtime.
- Pulizia script temporanei `tmp_*` (fatto) e allineamento `.env` (rimuovere variabili inutilizzate).
