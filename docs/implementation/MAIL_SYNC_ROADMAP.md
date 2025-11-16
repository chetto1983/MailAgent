# Mail Sync Roadmap (Server ↔ Backend ↔ Postgres ↔ Frontend)

Obiettivo: allineare la pipeline di sincronizzazione email con funzionalità simili al repo di esempio (Zero) mantenendo coerenza con l’architettura attuale.

## 1) Bozze e identità di invio
- Backend: aggiungere CRUD draft (`POST/PUT/GET/DELETE /emails/drafts`), schema Postgres con `providerId`, `tenantId`, `content/bodyHtml`, `to/cc/bcc`, `attachments (base64 + metadata)`, `updatedAt`.
- Alias: endpoint `GET /providers/:id/aliases` (Gmail sendAs, Graph identities, IMAP opzionale). Salvare alias in cache/DB.
- Frontend compose: usare draftId in query, autosave via API (non solo LocalStorage), Select “Da” popolato con alias/provider, normalizzazione indirizzi.

## 2) Webhook & delta sync hardening
- Gmail: gestire `historyId` gap (fallback finestra limitata), rinnovo subscription, persistenza `lastHistoryId` in `providerConfig.metadata`.
- Microsoft Graph: usare `deltaLink/skipToken`, rinnovo subscription, persistenza `lastDeltaLink`, gestione duplice evento via `internetMessageId/changeKey`.
- IMAP: UID validity e sync incrementale per cartella, con fallback full per invalida UID.

## 3) Queue, concorrenza e resilienza
- Worker: rate-limit per providerId, max 1 job per provider in esecuzione; backoff esponenziale su 429/5xx; incrementare `errorStreak` e degradare priorità.
- Stati provider: traccia `lastSyncedAt`, `lastWebhookAt`, `notificationCount`, `errorCount`, `jobDuration`, `queueLag`; esporre in `/email-sync/status`.

## 4) Dedup e upsert sicuro
- Chiavi naturali: Gmail/Graph `internetMessageId`, IMAP `uid+folder`; upsert con unique constraint in DB.
- Prevenire doppio inserimento (webhook + poll) con lock per messageId.

## 5) Realtime e contatori
- Backend: emettere `email:message_update` (isRead/isStarred/folder change), `email:folder_counts_update` già presente; opzionale `draft_saved`.
- Frontend: listener WS per `email:message_update` per aggiornare lista/thread e badge; toast su `sync:status`; refresh soft di conteggi.

## 6) UI mailbox
- Hotkey complete (già base): reply/reply-all/forward, archive/delete, mark read/unread, next/prev.
- Reply inline nel thread, azioni rapide su item, filtri rapidi (unread/star/attachment), focus search con `/`.
- Memorizzare scroll per cartella; cache lista/thread (React Query) con optimistic update di isRead/star/folder.

## 7) Attachments & fetch
- Fetch on-demand per archiviati: marca `needsRefetch` e job di retry; valida path locale; gestire link scaduti (cloud) con rigenera URL.

## Sequenza consigliata
1. Draft + alias (backend + compose) → 2. Hardening webhook/delta + metadati → 3. Realtime message_update + toast sync → 4. UI productivity (reply inline, hotkey complete, filtri) → 5. Dedup/lock + queue limiter → 6. Fetch/attachments resilienza.

## Avanzamento (2025-11-16)
- Aggiornato backend `updateEmail` per emettere eventi realtime (`email:update` con reason `message-processed`) e aggiornare in tempo reale i conteggi non letti per cartella, includendo il caso di spostamento cartella.
- Frontend: listener `email:update` aggiorna lo store email e, se l’evento indica cambio cartella, rimuove l’email dalla lista corrente per evitare UI stantia; build e lint frontend OK.
- Aggiunto store `sync-store` e snackbar UI: gli eventi `sync:status` (WebSocket) sono mostrati come toast nel layout, per rendere visibili gli stati di sincronizzazione lato frontend.
- Bozze (backend): aggiunti endpoint draft (`POST/GET/DELETE /emails/drafts*`) e logica in `EmailsService.saveDraft/getDraft/deleteDraft` basata su `Email` con `isDraft=true`; build backend OK. Nessun supporto allegati/alias ancora.
- Bozze (frontend): compose ora autosalva su backend via `emailApi.saveDraft` (usa `draftId` da query se presente, altrimenti crea) e cancella la bozza dopo l’invio; build/lint frontend OK. Attachments non ancora persistiti lato bozza.
- Bozze: compose carica draft da backend se `draftId` è in query (imposta form e providerId); build/lint frontend OK.
