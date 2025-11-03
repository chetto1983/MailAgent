# MailAgent - Script di Test e Diagnostica

Script organizzati per testare e diagnosticare il sistema MailAgent.

---

## 📁 Struttura

```
scripts/
├── test/            # Test API e funzionalità
├── diagnostics/     # Script diagnostici
└── scalability/     # Test scalabilità
```

---

## 🧪 Test API (`test/`)

Script per testare le API dei vari provider.

### Google APIs

**File**: `test-google-apis.js`

```bash
node scripts/test/test-google-apis.js
```

Testa:
- Gmail API (labels, messages)
- Calendar API (calendars, events)
- Contacts API (people)

### Microsoft APIs

**File**: `test-microsoft-apis.js`

```bash
node scripts/test/test-microsoft-apis.js
```

Testa:
- Graph API Mail (folders, messages)
- Calendar API (calendars, events)
- Contacts API (people)

### IMAP Provider

**File**: `test-imap-provider.js`

```bash
node scripts/test/test-imap-provider.js
```

Testa:
- Connessione IMAP
- Lista cartelle
- Fetch messaggi

### Email Storage

**File**: `test-email-storage.js`

```bash
node scripts/test/test-email-storage.js
```

Testa:
- Salvataggio email nel database
- Query email
- Statistiche

### Altri Test

- `test-microsoft-delta.js` - Test sync delta Microsoft
- `test-microsoft-detailed.js` - Test dettagliato Microsoft
- `test-microsoft-direct.js` - Test diretto API Microsoft
- `test-inbox-delta.js` - Test delta inbox
- `test-microsoft-auto-refresh.js` - Test auto-refresh token Microsoft

---

## 🔍 Diagnostica (`diagnostics/`)

Script per diagnosticare problemi.

### Check Database

**File**: `check-db.js`

```bash
node scripts/diagnostics/check-db.js
```

Verifica:
- Connessione database
- Tabelle esistenti
- Dati presenti

### Check Providers

**File**: `check-providers.js`

```bash
node scripts/diagnostics/check-providers.js
```

Verifica:
- Provider configurati
- Token validi
- Ultime sincronizzazioni

### Check Microsoft Provider

**File**: `check-microsoft-provider.js`

```bash
node scripts/diagnostics/check-microsoft-provider.js
```

Diagnostica specifica per Microsoft:
- Token scadenza
- Refresh token disponibilità
- Configurazione provider

### Check Microsoft Sync

**File**: `check-microsoft-sync.js`

```bash
node scripts/diagnostics/check-microsoft-sync.js
```

Verifica:
- Stato sincronizzazione Microsoft
- Email sincronizzate
- Errori recenti

### Test Database Direct

**File**: `test-database-direct.js`

```bash
node scripts/diagnostics/test-database-direct.js
```

Test diretto database senza API:
- Query dirette Prisma
- Performance database
- Integrità dati

---

## 📈 Scalability (`scalability/`)

Script per testare capacità e performance.

### Test Scalability Completo

**File**: `test-scalability.js`

```bash
node scripts/scalability/test-scalability.js
```

Test completo con:
- Stato sistema
- Calcolo capacità teorica
- Provider attuali
- Trigger sync multipli
- Monitoring code
- Performance database

**Richiede**: axios (npm install axios)

### Test Scalability Semplificato

**File**: `test-scalability-simple.js`

```bash
node scripts/scalability/test-scalability-simple.js
```

Test semplificato (solo moduli nativi Node.js):
- Stato sistema
- Calcolo capacità
- Provider attuali
- Performance database
- Raccomandazioni

**No dipendenze esterne**

---

## 🔧 Configurazione

### JWT Token

Molti script richiedono un JWT token valido. Ottienilo:

1. Login tramite frontend o API
2. Copia il token dalla risposta
3. Passa come argomento o modifica nello script

Esempio:
```bash
node scripts/test/test-google-apis.js YOUR_JWT_TOKEN
```

### Environment Variables

Alcuni script leggono variabili d'ambiente:

```bash
DATABASE_URL=postgresql://...
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 📊 Output Examples

### Test Successo ✅
```
✅ Sistema online e funzionante
📊 Statistiche Sync:
  - Provider totali: 3
  - Sincronizzati oggi: 3
✅ Query database: 23 ms
```

### Test Fallito ❌
```
❌ Errore: Request failed with status code 401
  Provider: chetto983@hotmail.it
  Causa: Token expired
  Soluzione: Refresh token
```

---

## 🎯 Workflow Comuni

### Debug Problema Sync
```bash
# 1. Verifica database
node scripts/diagnostics/check-db.js

# 2. Verifica provider
node scripts/diagnostics/check-providers.js

# 3. Test API specifico
node scripts/test/test-microsoft-apis.js

# 4. Verifica sync
node scripts/diagnostics/check-microsoft-sync.js
```

### Test Nuova Feature
```bash
# 1. Test API diretta
node scripts/test/test-microsoft-apis.js

# 2. Test storage
node scripts/test/test-email-storage.js

# 3. Test performance
node scripts/diagnostics/test-database-direct.js
```

### Verifica Scalabilità
```bash
# Test rapido
node scripts/scalability/test-scalability-simple.js

# Test completo
node scripts/scalability/test-scalability.js
```

---

## 📝 Note

### Sicurezza
- ⚠️ **NON committare** script con token hardcoded
- ⚠️ **NON eseguire** script in produzione senza backup
- ✅ Usa sempre variabili d'ambiente per credenziali

### Performance
- Script di test possono generare carico sul sistema
- Test scalability possono triggerare molte API calls
- Monitoring script non bloccano altri processi

### Manutenzione
- Aggiorna token scaduti prima di testare
- Verifica connessione database prima di test storage
- Controlla limiti rate API provider

---

## 🤝 Contributing

Per aggiungere nuovi script:

1. Metti nella cartella appropriata (`test/`, `diagnostics/`, `scalability/`)
2. Segui naming convention: `test-feature.js` o `check-component.js`
3. Aggiungi commenti header con descrizione e usage
4. Aggiorna questo README
5. Testa lo script prima di committare

---

## 📞 Support

Per problemi con gli script:

1. Verifica hai le dipendenze necessarie (`npm install`)
2. Controlla token valido e non scaduto
3. Verifica backend in esecuzione (http://localhost:3000)
4. Consulta [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)

---

**Ultima revisione**: 2025-11-02
