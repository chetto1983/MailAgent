# PMSync — Sincronizzazione Realtime Multi-Tenant
**Server di Posta ↔ Backend ↔ Frontend (Email, Calendari, Contatti)**

Questo documento descrive l’intera architettura realtime multi-tenant di PMSync, incluse:
- sincronizzazione bidirezionale
- multi-provider (Google, Microsoft, IMAP, CalDAV, CardDAV)
- notifiche realtime al frontend
- orchestrazione con worker intelligenti
- sicurezza e isolamento tenant
- integrazione con agenti AI e HITL

Il file funge da blueprint per l’implementazione completa, mantenendo il progetto coerente e scalabile.

---

## 1. Obiettivi Fondamentali

- Ogni tenant sincronizza email, calendari e contatti indipendentemente dagli altri.
- La sincronizzazione deve avvenire in realtime quando possibile.
- Deve funzionare anche offline o con provider senza webhook (IMAP, CalDAV).
- Ogni modifica rilevante deve riflettersi immediatamente sul frontend.
- Il sistema supporta agenti AI che leggono e reagiscono ai cambiamenti.
- Il tutto deve essere isolato per tenant e sicuro.

---

## 2. Architettura Generale

```mermaid
flowchart LR
    subgraph Providers
        G[Google APIs<br/>Gmail, Calendar, People]
        M[Microsoft Graph<br/>Mail, Calendar, Contacts]
        I[IMAP/SMTP]
        C[CalDAV<br/>CardDAV]
    end

    subgraph Backend
        WH[Webhook API<br/>OAuth callbacks]
        Q[BullMQ Multi-Tenant Queues]
        W[Workers<br/>Email/Calendar/Contact Sync]
        DB[(Postgres + PgVector)]
        WS[WebSocket Gateway]
        AI[AI Orchestrator<br/>LangChain + Mistral]
    end

    subgraph Frontend
        UI[React/Next Dashboard<br/>Real-Time Client]
    end

    G --> WH
    M --> WH
    C --> WH

    WH --> Q
    Q --> W
    W --> DB
    W --> WS
    DB --> AI
    AI --> WS

    WS --> UI


---

3. Database Multi-Tenant

Ogni tabella (Email, Contact, Calendar, Sessions, WebhookSubscription, ecc.) contiene:

tenantId → isolamento totale

indici ottimizzati per sincronizzazione:

nextSyncAt

providerId

externalId



Questo permette ai worker di sapere:

cosa sincronizzare

per quale tenant

in quale ordine



---

4. Sincronizzazione Realtime – Visione Generale

4.1 Eventi che innescano sincronizzazioni

Origine	Meccanismo	Fornitori

Webhook provider	Notifica push immediata	Microsoft, in parte Google
Delta Sync	Token incrementale	Google, MS, CardDAV
Polling intelligente	Intervallo dinamico	IMAP, CalDAV, Google Contacts
Modifica lato utente	Azione → Job → Provider update	Frontend
AI Agent Action	Azione generata → Job	Sistema AI



---

5. Flusso Realtime End-To-End (Multi-Tenant)

sequenceDiagram
    autonumber
    participant Prov as Provider (MS/Google/IMAP/CalDAV)
    participant WH as Webhook API
    participant Q as Multi-Tenant Queue
    participant W as Sync Worker
    participant DB as Postgres
    participant WS as WebSocket
    participant FE as Frontend Client

    Prov-->>WH: Evento (nuova mail, update, delete)
    WH->>Q: enqueue({tenantId, providerId, delta})
    Q->>W: job start
    W->>Prov: fetch delta
    Prov-->>W: dati modificati
    W->>DB: upsert email/event/contatto
    W->>WS: send event (room: tenantId)
    WS-->>FE: update realtime


---

6. WebSocket Multi-Tenant

6.1 Isolamento tramite "stanze"

Quando un client si collega:

socket.join(`tenant:${tenantId}`);

Così ogni evento backend diventa:

ws.to(`tenant:${tenantId}`).emit("email:update", payload);

6.2 Eventi principali

Email

email:new

email:update

email:delete

email:unread_count_update

email:thread_update


Calendari

calendar:event_new

calendar:event_update

calendar:event_delete


Contatti

contacts:new

contacts:update

contacts:delete


AI / HITL

ai:classification_done

ai:task_suggest

hitl:approval_required



---

7. Worker Multi-Tenant

7.1 Code dedicate

Una queue per categoria:

email_sync
calendar_sync
contact_sync
webhook_ingestion
ai_processing
embedding

Ogni job contiene sempre:

{
  "tenantId": "...",
  "providerId": "...",
  "jobType": "email_sync",
  "payload": {...}
}


---

8. Sincronizzazione Bidirezionale

8.1 Backend → Provider

Quando un utente crea/aggiorna/cancella qualcosa nel frontend:

1. UI invia comando REST (o WS RPC).


2. Backend crea un job:

email_send

calendar_update

contact_update



3. Worker aggiorna il provider.


4. Il provider invia webhook o delta.


5. Worker riceve e aggiorna DB.


6. WebSocket notifica frontend.



→ Consistenza garantita.

8.2 Provider → Backend → Frontend

È il flusso naturale (webhook).


---

9. Polling Intelligente (IMAP/CalDAV/Google Contacts)

Ogni provider ha:

avgActivityRate

syncPriority

nextSyncAt


Il worker principale esegue:

SELECT * FROM provider_configs
WHERE isActive = true 
AND nextSyncAt <= now()
ORDER BY syncPriority ASC
LIMIT 200;


---

10. Frontend Realtime

10.1 Store reattivo

Ogni evento aggiorna lo stato locale:

socket.on("email:new", (email) => {
  emailStore.add(email);
});

10.2 Aggiornamento intelligente

Il frontend applica:

patch leggere

aggiornamento thread

update contatori

ricalcolo badge



---

11. Sicurezza Multi-Tenant

11.1 WS Auth

La connessione WS deve includere un JWT valido:

decodifica

verifica tenantId

setup eventi


11.2 Query DB sempre filtrate su tenant

Niente multi-tenant senza vincolo:

await prisma.email.findMany({
  where: { tenantId: session.tenantId }
});

11.3 Limitazioni per worker

Ogni job deve essere verificato:

if (!job.data.tenantId) throw new Error("Missing tenantId");


---

12. Integrare Agenti AI nel Realtime

Agenti AI possono:

classificare email

generare eventi calendario

suggerire task

identificare contatti importanti

rilevare follow-up mancati


Quando l’agente genera un output:

ws.to(`tenant:${tenantId}`).emit("ai:task_suggest", suggestion);

Se una decisione è delicata → HITL:

ws.to(`tenant:${tenantId}`).emit("hitl:approval_required", task);


---

13. Roadmap Implementativa Completa

Fase 1 — Backend & DB

strutturazione modelli multi-tenant

code worker multi-queue

webhook ingestion

normalizzazione email/calendar/contact


Fase 2 — Realtime

WebSocket multi-stanza

event emitter standardizzati

delta sync + webhook routing


Fase 3 — Frontend

store globale email/calendar/contact

UI reattiva per ogni evento


Fase 4 — AI & HITL

agenti che osservano stream eventi

task creation intelligente

sistema approvazione umana


Fase 5 — Ottimizzazione

adaptive polling

backoff errori provider

priorità dinamiche



---

14. Conclusione

Questo documento definisce l’intera strategia realtime multi-tenant per PMSync:

scalabile

consistente

robusta ai provider

ottimizzata per AI e HITL

altamente reattiva lato frontend
