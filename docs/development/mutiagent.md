# README.dev.md – Roadmap Multi-Agent System con HITL per MailAgent

Questo documento guida passo dopo passo lo sviluppo di un **sistema multi-agente con orchestrazione centralizzata e modulo Human-in-the-Loop (HITL)** da integrare nel backend NestJS di MailAgent.

---

## ✅ Obiettivi
- Automatizzare operazioni su email, calendario, contatti.
- Utilizzare agenti specializzati coordinati da un orchestratore centrale.
- Implementare un modulo HITL per approvazioni manuali.
- Estendere in modo non intrusivo la struttura modulare esistente (NestJS).

---

## 🧠 Componenti Principali

| Componente         | Funzione                                              |
|--------------------|--------------------------------------------------------|
| `RouterAgent`      | Decide a quale agente inviare l'input dell'utente     |
| `EmailAgent`       | Risposte automatiche, triage, gestione thread         |
| `CalendarAgent`    | Scheduling, gestione eventi                           |
| `ContactsAgent`    | Deduplicazione, arricchimento contatti                |
| `KnowledgeAgent`   | Recupero da RAG/email per supportare gli altri agenti |
| `HitlService`      | Gestione approvazioni/azioni dell'utente              |
| `AiMultiAgentController` | Orchestrazione conversazionale degli agenti      |

---

## 🗂 Struttura Directory Consigliata

```bash
src/
  ai/
    agents/
      base-agent.interface.ts
      router.agent.ts
      email.agent.ts
      calendar.agent.ts
      contacts.agent.ts
      knowledge.agent.ts
    multi-agent/
      multi-agent.controller.ts
      multi-agent.service.ts
    hitl/
      hitl.service.ts
      hitl.controller.ts
  prisma/
    migrations/
      <add agent_pending_actions table>
🔄 Roadmap Passo-Passo
FASE 0 – Pianificazione (Giorno 1–2)
 Definisci use case MVP:

Smart reply email

Scheduling riunioni da testo

Deduplicazione contatti

 Identifica policy HITL (soglie confidence, type, severity)

 Crea branch feature/multi-agent-orchestrator

FASE 1 – Setup Agenti (Giorno 3–7)
 Crea BaseAgent interface

 Crea stub: EmailAgent, CalendarAgent, ContactsAgent, KnowledgeAgent

 Implementa RouterAgent (prompt + LLM call a mistral)

FASE 2 – Orchestratore Conversazionale (Giorno 8–14)
 Crea AiMultiAgentController con 3 endpoint:

POST /ai/multi-agent/session

POST /ai/multi-agent/message

GET /ai/multi-agent/session/:id

 Salva agent_session con cronologia conversazione

 Chiama RouterAgent → invoca agente → raccoglie AgentResult

 Salva AgentResult in DB (testo + azioni HITL)

FASE 3 – HITL e Revisione Azioni (Giorno 15–22)
 Crea tabella agent_pending_actions (Prisma):

type, payload, confidence, status, severity, userId, tenantId

 Crea HitlService con API:

GET /hitl/actions

POST /hitl/actions/:id/approve

POST /hitl/actions/:id/reject

 Frontend React:

Pagina “AI Review”: mostra, approva, modifica o rifiuta

FASE 4 – Agenti Specializzati (Giorno 23–35)
 EmailAgent: suggerisce risposta, propone archiviazione thread

 CalendarAgent: suggerisce slot disponibili, crea evento bozza

 ContactsAgent: trova duplicati e propone merge

 KnowledgeAgent: effettua RAG su email/documenti precedenti

FASE 5 – Test & Sicurezza (Giorno 36–42)
 Test unitari su agenti (canHandle, handle)

 Test integrazione: conversazione → azione → HITL → esecuzione

 Validazione multi-tenant (ogni chiamata usa tenantId, userId)

 Logging: Prometheus metrics, audit log, DLQ BullMQ

FASE 6 – Rollout Graduale (Giorno 43–49)
 Attiva solo per utenti beta

 Modalità solo suggerimento (no azioni automatiche)

 Raccogli feedback e migliora prompt/router

FASE 7 – Iterazione Continua (Settimana 8+)
 Auto-esecuzione per azioni low-risk

 Agent: FollowUpAgent, DigestAgent

 UI: task inbox AI, modalità giornaliera

📊 PendingAction Schema (Prisma)
prisma
Copia codice
model AgentPendingAction {
  id           String   @id @default(uuid())
  sessionId    String
  userId       String
  tenantId     String
  type         String   // es: SEND_EMAIL, CREATE_EVENT
  payload      Json
  confidence   Float
  severity     String   // LOW, MEDIUM, HIGH
  status       String   // PENDING, APPROVED, EXECUTED, REJECTED
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
🧩 Esempio di AgentResult
ts
Copia codice
{
  messages: ["Ho trovato una bozza di risposta pronta."],
  actions: [
    {
      type: "SEND_EMAIL",
      payload: { to: "marco@example.com", subject: "Conferma call", body: "..." },
      confidence: 0.83,
      severity: "MEDIUM"
    }
  ]
}
🔐 Note Sicurezza
Tutti gli agenti operano nel contesto del tenantId e userId

Le azioni HITL devono essere approvate da utenti con autorizzazione esplicita

Loggatura di tutte le azioni automatizzate, anche rifiutate

📎 Link Utili
/api/docs – OpenAPI Swagger (dev env)

/health/queues – Stato delle code BullMQ

src/ai/agent.ts – Implementazione agenti AI esistenti