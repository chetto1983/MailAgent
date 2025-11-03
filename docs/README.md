# MailAgent - Documentazione

Benvenuto nella documentazione di MailAgent! Questa cartella contiene tutta la documentazione organizzata per categoria.

---

## 📚 Indice per Categoria

### 🚀 [Setup](./setup/)
Guide per configurare e avviare il progetto

- [CONFIGURATION.md](./setup/CONFIGURATION.md) - Configurazione sistema
- [LOCAL_DEV_SETUP.md](./setup/LOCAL_DEV_SETUP.md) - Setup ambiente locale
- [QUICK_START.md](./setup/QUICK_START.md) - Guida rapida
- [SETUP_GUIDE.md](./setup/SETUP_GUIDE.md) - Guida setup completa
- [SETUP_COMPLETE.md](./setup/SETUP_COMPLETE.md) - Checklist setup
- [GETTING_STARTED_CHECKLIST.md](./setup/GETTING_STARTED_CHECKLIST.md) - Checklist iniziale

### 🔐 [OAuth](./oauth/)
Configurazione provider OAuth (Gmail, Microsoft)

- [OAUTH_GMAIL_SETUP.md](./oauth/OAUTH_GMAIL_SETUP.md) - Setup OAuth Gmail
- [OAUTH_MICROSOFT_SETUP.md](./oauth/OAUTH_MICROSOFT_SETUP.md) - Setup OAuth Microsoft
- [OAUTH_SETUP_GUIDE.md](./oauth/OAUTH_SETUP_GUIDE.md) - Guida generale OAuth
- [OAUTH_SETUP_INDEX.md](./oauth/OAUTH_SETUP_INDEX.md) - Indice setup OAuth
- [FIX_MICROSOFT_TOKEN_REFRESH.md](./oauth/FIX_MICROSOFT_TOKEN_REFRESH.md) - Fix token refresh Microsoft

### 💻 [Implementation](./implementation/)
Dettagli implementazione e architettura

- [EMAIL_SYNC_STRATEGY.md](./implementation/EMAIL_SYNC_STRATEGY.md) - Strategia sincronizzazione
- [EMAIL_SYNC_USAGE.md](./implementation/EMAIL_SYNC_USAGE.md) - Uso sistema sync
- [EMAIL_SYNC_FIX_PLAN.md](./implementation/EMAIL_SYNC_FIX_PLAN.md) - Piano fix sync
- [PROVIDER_INTEGRATION_GUIDE.md](./implementation/PROVIDER_INTEGRATION_GUIDE.md) - Guida integrazione provider
- [IMPLEMENTATION_SUMMARY.md](./implementation/IMPLEMENTATION_SUMMARY.md) - Riepilogo implementazione
- [CURRENT_STATUS.md](./implementation/CURRENT_STATUS.md) - Stato attuale sistema
- [DOCUMENTATION_INDEX.md](./implementation/DOCUMENTATION_INDEX.md) - Indice documentazione
- [QUICK_REFERENCE.md](./implementation/QUICK_REFERENCE.md) - Riferimento rapido
- [PROBLEM_DIAGNOSIS.md](./implementation/PROBLEM_DIAGNOSIS.md) - Diagnosi problemi
- [GOOGLE_AUTO_REFRESH_IMPLEMENTATION.md](./implementation/GOOGLE_AUTO_REFRESH_IMPLEMENTATION.md) - Auto-refresh Google
- [MICROSOFT_AUTO_REFRESH_IMPLEMENTATION.md](./implementation/MICROSOFT_AUTO_REFRESH_IMPLEMENTATION.md) - Auto-refresh Microsoft

### 🧪 [Testing](./testing/)
Risultati test e sessioni

- [TEST_RESULTS_2025-10-30_SESSION2.md](./testing/TEST_RESULTS_2025-10-30_SESSION2.md)
- [TEST_RESULTS_2025-11-02_EMAIL_SYNC_SUCCESS.md](./testing/TEST_RESULTS_2025-11-02_EMAIL_SYNC_SUCCESS.md)
- [TEST_RESULTS_TOKEN_REFRESH.md](./testing/TEST_RESULTS_TOKEN_REFRESH.md)
- [EMAIL_SYNC_TEST_RESULTS.md](./testing/EMAIL_SYNC_TEST_RESULTS.md)
- [SESSION_SUMMARY_2025-10-30.md](./testing/SESSION_SUMMARY_2025-10-30.md)

### 📈 [Scalability](./scalability/)
Analisi e ottimizzazioni scalabilità

- [SCALABILITY_ANALYSIS.md](./scalability/SCALABILITY_ANALYSIS.md) - Analisi completa
- [PLAN_B_IMPLEMENTATION.md](./scalability/PLAN_B_IMPLEMENTATION.md) - Piano B implementato
- [PLAN_B_TEST_RESULTS.md](./scalability/PLAN_B_TEST_RESULTS.md) - Risultati test Piano B

---

## 🔧 Script Utili

### Test API
Localizzazione: [`../scripts/test/`](../scripts/test/)

- `test-google-apis.js` - Test API Google
- `test-microsoft-apis.js` - Test API Microsoft
- `test-imap-provider.js` - Test provider IMAP
- `test-email-storage.js` - Test storage email

### Diagnostica
Localizzazione: [`../scripts/diagnostics/`](../scripts/diagnostics/)

- `check-db.js` - Verifica database
- `check-providers.js` - Verifica provider
- `check-microsoft-provider.js` - Verifica provider Microsoft
- `check-microsoft-sync.js` - Verifica sync Microsoft
- `test-database-direct.js` - Test database diretto

### Scalability
Localizzazione: [`../scripts/scalability/`](../scripts/scalability/)

- `test-scalability.js` - Test completo scalabilità
- `test-scalability-simple.js` - Test scalabilità semplificato

---

## 📖 Documentazione Root

File principali nella root del progetto:

- [README.md](../README.md) - Documentazione principale progetto
- [PROJECT_CHECKLIST.md](../PROJECT_CHECKLIST.md) - Checklist stato progetto
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) - Guida risoluzione problemi
- [PRIVACY.md](../PRIVACY.md) - Informativa privacy

---

## 🎯 Quick Links per Task Comuni

### Primo Setup
1. [Quick Start](./setup/QUICK_START.md) - Avvio rapido
2. [Local Dev Setup](./setup/LOCAL_DEV_SETUP.md) - Setup completo
3. [OAuth Setup](./oauth/OAUTH_SETUP_INDEX.md) - Configurazione OAuth

### Sviluppo
1. [Implementation Summary](./implementation/IMPLEMENTATION_SUMMARY.md) - Panoramica codice
2. [Provider Integration](./implementation/PROVIDER_INTEGRATION_GUIDE.md) - Integrare nuovo provider
3. [Email Sync Strategy](./implementation/EMAIL_SYNC_STRATEGY.md) - Capire sync

### Troubleshooting
1. [Troubleshooting Guide](../TROUBLESHOOTING.md) - Problemi comuni
2. [Problem Diagnosis](./implementation/PROBLEM_DIAGNOSIS.md) - Diagnosticare problemi
3. Script diagnostici in [`../scripts/diagnostics/`](../scripts/diagnostics/)

### Performance & Scalabilità
1. [Scalability Analysis](./scalability/SCALABILITY_ANALYSIS.md) - Analisi capacità
2. [Plan B Implementation](./scalability/PLAN_B_IMPLEMENTATION.md) - Ottimizzazioni
3. Test scalabilità in [`../scripts/scalability/`](../scripts/scalability/)

---

## 📊 Stato Attuale Sistema

### ✅ Features Implementate
- ✅ Email sync multi-provider (Gmail, Microsoft, IMAP)
- ✅ Auto-refresh token OAuth (Google + Microsoft)
- ✅ Sync incrementale e full
- ✅ Queue system con priorità (BullMQ + Redis)
- ✅ Database PostgreSQL + Prisma
- ✅ Frontend Next.js
- ✅ Backend NestJS

### 🚀 Capacità
- **Configurazione attuale**: 1,020-1,530 tenant attivi
- **Workers**: 34 concurrent (17 high + 10 normal + 7 low)
- **Throughput**: 204 provider/minuto
- **Batch size**: 200 provider/ciclo

### 📈 Performance
- Database query: < 30ms
- Token auto-refresh: Funzionante
- Email sincronizzate: 300 (100 per provider × 3 provider)

---

## 🤝 Contributing

Per contribuire al progetto:

1. Leggi [PROJECT_CHECKLIST.md](../PROJECT_CHECKLIST.md) per stato attuale
2. Consulta documentazione implementazione in [implementation/](./implementation/)
3. Esegui test con script in [`../scripts/`](../scripts/)
4. Aggiorna documentazione dopo modifiche

---

## 📞 Support

Per problemi o domande:

1. Consulta [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
2. Verifica [Testing Results](./testing/) per problemi noti
3. Esegui script diagnostici in [`../scripts/diagnostics/`](../scripts/diagnostics/)

---

**Ultima revisione**: 2025-11-02
**Versione documentazione**: 1.0
**Stato**: ✅ Produzione-ready
