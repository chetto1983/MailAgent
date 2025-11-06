# 📦 PMSync — AI Operational Assistant

## Descrizione
PMSync è una piattaforma SaaS multi-tenant che integra email, calendari e strumenti AI per fornire un assistente aziendale cognitivo.  
Obiettivo: gestire comunicazioni e attività con automazione intelligente e rispetto del GDPR.

## Funzionalità chiave
- Sincronizzazione bidirezionale Gmail, Outlook, IMAP
- Gestione calendari con eventi e conflitti
- Agenti AI per analisi, pianificazione e riassunti
- Report giornalieri e alert follow-up
- Dashboard web responsive
- Architettura GDPR-by-design

## Stack tecnologico
- **Backend**: Node.js (TypeScript)
- **Database**: PostgreSQL + pgvector
- **AI Layer**: Mistral API + LangChain
- **Frontend**: Next.js + Tailwind
- **Workers**: BullMQ / Redis
- **Deployment**: Docker + Hetzner Cloud
