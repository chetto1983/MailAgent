# Privacy Policy & GDPR Compliance

## Data Processing

MailAgent è un'applicazione multi-tenant che elabora dati personali secondo il Regolamento Generale sulla Protezione dei Dati (GDPR - Regolamento UE 2016/679).

## Principi di Privacy by Design

1. **Minimizzazione dei Dati**: Raccogliamo solo i dati necessari
2. **Crittografia**: I dati sensibili sono crittografati a riposo (AES-256)
3. **Isolation**: Ogni tenant è completamente isolato
4. **Audit Log**: Tutte le azioni critiche sono registrate
5. **Retention**: I dati vengono cancellati secondo policy definita

## Dati Raccolti

### Dati di Account
- Email
- Nome e cognome (opzionali)
- Password (hashed con bcrypt)
- Data di iscrizione e ultimo login

### Dati di Email
- Mittente, destinatario, oggetto, corpo (se sincronizzati)
- Token OAuth (per Gmail/Outlook)
- Cronologia di sync

### Dati di Interazione
- Messaggi con l'AI assistant
- Embeddings di documenti (per RAG)
- Storico IP address e User Agent (nei log)

## Diritti dell'Utente

### Diritto di Accesso
Puoi richiedere una copia di tutti i tuoi dati tramite l'account settings.

### Diritto di Rettifica
Puoi correggere le informazioni del tuo profilo via dashboard.

### Diritto all'Oblio (Right to be Forgotten)
Puoi richiedere la cancellazione completa del tuo account e relativi dati.

**Procedura**:
1. Vai a `/dashboard/settings`
2. Seleziona "Delete Account"
3. Conferma la cancellazione
4. I tuoi dati verranno cancellati entro 30 giorni

### Diritto di Portabilità
Puoi esportare i tuoi dati in formato JSON.

## Sicurezza

- **HTTPS/TLS**: Tutta la comunicazione è crittografata
- **OTP/MFA**: Seconda autenticazione obbligatoria
- **Crittografia a Riposo**: AES-256 per credenziali email e dati sensibili
- **CORS**: Protezione da attacchi cross-origin
- **Rate Limiting**: Protezione da brute force
- **Session Timeout**: Sessioni scadono dopo 24 ore

## Cookies

L'applicazione utilizza cookies solo per:
- Autenticazione (JWT in localStorage)
- Preferenze tema (dark/light mode)
- Tracking sessione

Non utilizziamo cookies di tracking di terze parti.

## Condivisione Dati

I tuoi dati vengono condivisi con:
- **Mistral AI**: Per risposte intelligenti (anonimizzate quando possibile)
- **Provider Email**: Per sincronizzazione Gmail/Outlook (solo token)
- **Fornitori Infrastruttura**: Server hosting, database, Redis

Tutti i fornitori sono conformi al GDPR.

## Retention Policy

| Dato | Periodo | Azione |
|------|---------|--------|
| Account attivo | Indefinito | Mantenuto |
| Account inattivo (1 anno) | Esteso | Notifica per cancellazione |
| Messaggi | 2 anni | Archiviati |
| Log accesso | 90 giorni | Cancellati |
| Audit log | 1 anno | Cancellati |

## Contatti DPO

Per domande sulla privacy:
- Email: privacy@mailagent.local
- Modulo: Contattaci via dashboard

## Aggiornamenti Policy

Questa policy può essere aggiornata. Notificheremo via email gli utenti di cambiamenti significativi.

Ultimo aggiornamento: 2025-10-28

---

**MailAgent** - Privacy by Design 🔒
