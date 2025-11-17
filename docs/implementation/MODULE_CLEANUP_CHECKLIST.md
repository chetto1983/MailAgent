# Module Cleanup Checklist (backend)

Auditing dei moduli principali con suggerimenti di pulizia e consolidamento. Obiettivo: ridurre ridondanza, centralizzare costanti/config, migliorare testabilità e logging.

## ai
- EmailEmbeddingQueue: dedupe/schedule helper per `enqueue`/`enqueueMany`, set per evitare job duplicati, metriche di flush opzionali.
- KnowledgeBase/Embeddings: centralizzare gestione errori rate-limit e backoff; validare input (tenant/provider/emailId).
- Documentare parametri di embedding (model, max tokens) e dove sono configurati.

## audit / compliance
- Verificare che i logger usino livelli coerenti (warn vs debug) e abbiano campi tenant/provider.
- Estrarre costanti di retention/TTL in config; aggiungere DTO/validation per payload audit.

## auth
- Guard/Interceptor: unificare gestione tenant (TenantGuard) e debug middleware; documentare header/cookie accettati.
- Configurare in un unico punto le durate token/OTP; aggiungere test per edge case (token mancante, cookie invalido).

## calendar
- Google/Microsoft sync: uniformare pipeline (batch fetch, upsert), backoff 429, riuso di helpers comuni con email-sync dove possibile.
- Realtime emission: usare throttling analogo alla posta per bulk import.
- Documentare mapping folder/event status in README modulo.

## contacts
- Google/Microsoft sync: centralizzare normalizzazione contatti (case, telefoni, emails) e dedupe; usare helper di batch upsert.
- Webhook services: uniformare validazioni e logging.

## email
- Thread/message operations: assicurare che DTO siano tipizzati e validati; centralizzare mapping folder/labels.
- Move/Delete bulk dal frontend: considerare routing tramite queue per evitare spike realtime.

## email-sync
- **Google**: helper `fetchMessagesBatch(gmail, ids, format)` condiviso; parsing unico `parseGmailMessage`; config costanti batch; label/deletion handling con chunk `Promise.allSettled`; flag per suppress eventi granulari in bulk e summary finale.
- **Microsoft**: portare stessa pipeline (list/delta chunk, parse→createMany/update→enqueueMany, retry 429).
- QueueService: estrarre config code (attempts/backoff/removeOn*) e dedupe job per tenant/provider; metriche raccolte in helper.
- CrossProviderConflict: spostare priorità provider in config; validare input; helper per log/stats.

## health
- Minimizzare logging rumoroso; documentare dipendenze (DB, Redis) e timeouts in config.

## providers
- OAuth services: centralizzare gestione errori invalid_grant/expired_code; configurare redirect URIs in un unico file/env; aggiungere test per refresh token.
- ProviderConfigService: validare metadata schema; dedupe su connect/disconnect con transazioni.

## realtime
- Buffer per email events già introdotto; unificare emit helper (avoid duplicati `emitToTenant`/`emitToTenantImmediate`).
- Parametri buffer (ms, max) da config; valutare evento summary batch.
- Ridurre logging di emit a livello verbose.

## tenants / users
- DTO validation per creazione/aggiornamento; normalizzazione costante per email/tenant ids.
- Documentare policy di soft-delete/hard-delete in README modulo.

## test e docs
- Aggiungere unit per: parseGmailMessage/batch pipeline; enqueueMany dedupe; realtime buffer flush; queue dedupe per provider.
- Aggiornare README interni dei moduli con variabili env rilevanti (batch sizes, buffer ms, retry/backoff).
