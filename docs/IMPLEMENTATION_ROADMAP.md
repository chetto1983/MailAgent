# MailAgent Backend – Implementation Roadmap

## 1. Contesto Attuale
- Il nuovo stack `providers`/`email-sync` è operativo: gestisce OAuth Google/Microsoft, cifratura credenziali e sincronizzazione incrementale con persistenza ed embedding (`backend/src/modules/email-sync/**`, `backend/src/modules/providers/**`).
- Componenti legacy rimossi: il modulo `email-config` e la tabella `EmailConfig` sono stati migrati; resta da verificare che non esistano client obsoleti che chiamano le vecchie rotte.
- I metodi `handleGoogleOAuth`/`handleMicrosoftOAuth` in `AuthService` restano stub ma non sono più usati: le route reali passano da `/providers/...`; servono decisioni su rimozione o reindirizzamento.
- Il health check Mistral (`backend/src/modules/health/services/health.service.ts:45`) simula l’esito senza effettuare richieste reali; manca visibilità sull’API AI.
- La documentazione deve descrivere chiaramente la migrazione verso il nuovo modulo provider e segnalare i componenti deprecati.
- Le chat AI vengono ora salvate in `chat_sessions` (FIFO per tenant/utente) con titoli generati da Mistral; monitorare eventuali estensioni (es. soft delete, ricerca full-text).

## 2. Workstream Prioritari

### A. Migrazione API Provider & Pulizia Legacy
1. **Verifica post-migrazione**
   - Cercare e bonificare eventuali client/cron job che puntavano alle vecchie API `email-configs`.
   - Pulire le ultime dipendenze dal modulo `email` tradizionale (es. documentazione/shell script).
2. **Riallineare AuthController**
   - Decidere se rimuovere `POST /auth/google|microsoft/callback` o farli delegare a `ProviderConfigService`.
   - Aggiornare test e documentazione (`docs/oauth/*`) ai nuovi endpoint `/providers/...`.
3. **Convergere Frontend & SDK**
   - Verificare che l’app web, CLI o integrazioni usino solo `providersApi`.
   - Fornire guida di migrazione in `docs/implementation/PROVIDER_INTEGRATION_GUIDE.md`.

### B. Health & Osservabilità
1. **Esposizione esterna**
   - Collegare l'endpoint `/health/metrics` a Prometheus/Grafana nell'infrastruttura target.
   - Valutare l'aggiunta di metriche aggiuntive (lag coda, rate limit, errori per provider).
2. **Alerting**
   - Definire soglie e regole di alert per job falliti e tempi di risposta Mistral.
   - Documentare le runbook per la gestione incidenti.

### C. Allineamento Stub & Documentazione
1. **Ripulire Codice Inutile**
   - Rimuovere stub ormai superflui (`AuthService.handleGoogleOAuth`, `handleMicrosoftOAuth`, TODO vecchi nel modulo `email`).
   - Aggiornare le eccezioni o sostituire con redirect informativi finché non eliminati.
2. **Aggiornare Documentazione**
   - `docs/implementation/CURRENT_STATUS.md` e `IMPLEMENTATION_SUMMARY.md`: evidenziare che la sincronizzazione passa dal modulo `email-sync` e notare componenti legacy in fase di decomissioning.
   - `docs/implementation/EMAIL_SYNC_STRATEGY.md`: aggiungere sezione “Stato attuale” con riferimenti a `queue.service.ts`, `sync.worker.ts`.
   - Annotare in `docs/oauth/OAUTH_GMAIL_SETUP.md` e `OAUTH_MICROSOFT_SETUP.md` l’uso degli endpoint `/providers`.

## 3. Sequenza Consigliata
1. Consolidare le API provider rimuovendo dipendenze legacy (Workstream A).
2. Implementare l’health check reale su Mistral e predisporre metriche minime (Workstream B).
3. Ripulire gli stub residui e aggiornare la documentazione per riflettere la nuova architettura (Workstream C).

## 4. Documentazione da Aggiornare
- `docs/implementation/CURRENT_STATUS.md` – marcare il modulo `email` tradizionale come legacy e descrivere lo stato attuale della sync.
- `docs/implementation/IMPLEMENTATION_SUMMARY.md` – integrare sezione “Migrazione Provider” con link ai nuovi endpoint.
- `docs/implementation/PROVIDER_INTEGRATION_GUIDE.md` – spostare le istruzioni sui vecchi endpoint in appendice “Legacy”.
- `docs/implementation/EMAIL_SYNC_STRATEGY.md` – includere progressi della pipeline BullMQ e indicare la deprecazione dei worker storici.
- `docs/oauth/*` – indicare esplicitamente che la gestione del codice di autorizzazione passa per `/providers/...`.

## 5. Dipendenze & Considerazioni
- Validare che la migrazione di `EmailConfig` sia stata eseguita su tutti gli ambienti (prisma migrate `20251104120000_remove_email_configs`).
- Coordinare con il team frontend per eliminare reference legacy a `/email-configs`.
- Pianificare test (unit/integration) per confermare che la rimozione dei componenti legacy non interrompe flussi esistenti.
- Aggiornare gli script di setup locale per avviare solo il worker moderno (`email-sync`).

---
_Ultimo aggiornamento: 2025-11-04_
