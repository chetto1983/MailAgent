# Debug Steps - Mail Non Compaiono

## 1. Verifica Console Browser
Apri DevTools (F12) e controlla:
- Ci sono errori JavaScript?
- Vengono fatte le chiamate API a `/folders` e `/emails`?
- Cosa restituiscono queste API?

## 2. Verifica Network Tab
- La chiamata a `GET /folders` viene fatta all'avvio?
- La chiamata a `GET /emails?folder=INBOX` viene fatta?
- Quale status code ritornano?

## 3. Verifica Console Logs
Dovresti vedere questi log (li ho aggiunti nel codice):
```
Loading emails for folder: Posta in arrivo with params: {...}
API returned X emails
First 5 emails: [...]
```

## 4. Problema Identificato

**Backend: ✅ Funziona**
- API `/folders` ritorna le cartelle
- API `/emails` ritorna le email

**Possibile Problema Frontend:**
1. Le cartelle potrebbero non caricarsi (`loadFolderMetadata` non viene chiamato)
2. Layout responsive potrebbe nascondere gli elementi
3. Errore JavaScript blocca il rendering

## 5. Test Rapido

Apri la console e digita:
```javascript
// Verifica se ci sono cartelle caricate
console.log(window.location.href);
// Dovrebbe essere su /dashboard/email

// Fai refresh e guarda i log
```

## 6. Fix Temporaneo

Se il problema persiste, prova:
1. Pulisci cache browser (Ctrl+Shift+Del)
2. Ricarica pagina (Ctrl+F5)
3. Verifica che il server backend sia attivo (localhost:3000)
