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
- Alias (stub): endpoint `GET /providers/:id/aliases` restituisce per ora solo l’email primaria; compose popola il Select “Da” con alias se disponibili e ricarica alias al cambio provider. Build backend/frontend OK.
- Bozze con allegati in metadata: autosave invia anche la lista allegati (base64) a `saveDraft` e ripristina draft/alias; build/lint frontend OK. Gli allegati restano in metadata, non ancora in storage definitivo.
- Alias: `getAliases` ora legge eventuali alias in `providerConfig.metadata.aliases` (array {email,name}); fallback alla mail primaria. Necessario supporto real send-as/identities da Gmail/Graph in futuro.
- Alias reali: `getAliases` prova a recuperare alias reali da Gmail (sendAs list) e Microsoft (Graph /me mail/userPrincipalName/otherMails), poi li salva in metadata.aliases; fallback alla mail primaria. Compose continua a usarli tramite API `/providers/:id/aliases`. Build backend/front OK.
- Coda sync: dedup dei job per providerId+syncType e jobId stabile nei bulk per evitare burst da webhook/az bulk; log più chiaro sul jobId. Build backend OK.
- Webhook Gmail: persiste `historyId` in metadata e lo usa per decidere se schedulare sync `full` in caso di gap (historyId regressiva); metadata aggiornata a ogni notifica. Build backend OK.
- Microsoft sync: introdotto helper `getTokenOrRefresh` (MicrosoftOAuthService) e usato in sync; delta sync ha catch con fallback a timestamp/full invece di lanciare; build backend OK.
- Coda/Gestione bulk: rimosso limiter non supportato e aggiunto guard soft (skip enqueue se esiste già job waiting/active per provider) sia in addSyncJob sia nei bulk; dedup per provider+syncType già presente. Build backend OK.
## Avanzamento (2025-11-17)
- Realtime backend: refactor ispirato a Zero con handshake centralizzato (token+tenant) che popola metadata socket e usa helper per comporre le room `tenant:*`; eventi tipizzati (email/calendar/contact/AI/HITL/sync) con payload map unificata e logging uniforme. Gateway piu snello, niente `any` nei payload realtime.
- Prossimi passi: applicare la stessa mappa tipizzata agli emettitori usati da email-sync/providers/auth, riallineare le chiamate per usare i nuovi helper `buildTenantRoom/buildTenantScopedRoom`, e portare lo stesso pattern di validazione token nei webhook/worker (guardando driver/connection pattern di Zero).
- Pulizia lint backend: variabili inutilizzate rimosse (auth/calendar/email/email-sync), FolderInfo IMAP arricchito con isSelectable e log più espliciti per rinnovo webhooks Gmail/Microsoft; lint/build backend OK.
- Tipizzazione eventi email-sync: IMAP/Gmail/Microsoft sync ora usano la EmailEventReason centralizzata di realtime; introdotto SyncAuthService per validare token (se configurati) su webhook esterni e job worker con propagazione automatica del token nelle enqueue dei job; lint/build backend OK.
- CORS hardening: main usa origin callback con allowlist + regex (localhost/ngrok/vercel) e toggle CORS_ALLOW_ALL; header ammessi estesi e preflight 204 per evitare drop su frontend. Config espansa con regex CORS e flag allow-all; lint/build backend OK.
- Testing: aggiunta variabile EMAIL_SYNC_WORKERS_ENABLED (default true) per fermare i worker durante test/cleanup provider; se false, i worker non partono e lo shutdown viene saltato. Build/lint backend OK.
