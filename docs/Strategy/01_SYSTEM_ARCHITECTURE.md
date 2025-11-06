# 🧱 System Architecture

## Obiettivo
Descrivere la struttura tecnica generale del sistema PMSync.

### Componenti principali
- **API Gateway** → gestisce autenticazione, routing e orchestrazione agentica
- **Worker Layer** → elabora task asincroni (email, calendari, embedding)
- **AI Layer** → gestisce modelli Mistral e LangChain agents
- **DB Layer** → PostgreSQL + pgvector
- **Frontend** → dashboard e interfaccia vocale

### Flusso generale
Frontend → API Gateway → Agents → Workers → Provider APIs → DB → Frontend

### Microservizi
- `auth-service`
- `sync-worker-service`
- `ai-agent-service`
- `report-service`
