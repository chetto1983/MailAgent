# 🛠️ Roadmap Fix - 22 Novembre 2025 (Sera)

## 📋 Analisi Problemi Segnalati

### Stato Dopo Analisi Codice:

| Problema | Stato Reale | Priorità | Effort |
|----------|-------------|----------|--------|
| 1. Scrollbar non visibili | ❌ **PROBLEMA REALE** | 🔥 P0 | 15min |
| 2. Pulsanti Reply/Forward mancanti | ⚠️ **GIÀ PRESENTI** - ma non collegati | 🔥 P0 | 10min |
| 3. Selezione provider nel compose | ✅ **GIÀ IMPLEMENTATA** | ✅ OK | - |
| 4. Traduzioni mancanti | ✅ **GIÀ COMPLETE** (EN/IT) | ✅ OK | - |

---

## ✅ Problemi GIÀ Risolti

### 3. Selezione Provider nel Compose
**File**: `frontend/pages/dashboard/email/compose/index.tsx`

**Status**: ✅ **COMPLETO**

**Implementazione Esistente** (lines 358-371):
```typescript
<FormControl fullWidth>
  <InputLabel>{composerCopy.from}</InputLabel>
  <Select
    value={providerId}
    label={composerCopy.from}
    onChange={handleProviderChange}
  >
    {fromOptions.map((opt) => (
      <MenuItem key={opt.id} value={opt.id}>
        {opt.label}
      </MenuItem>
    ))}
  </Select>
</FormControl>
```

**Features Presenti**:
- ✅ Select dropdown con tutti i provider
- ✅ Supporto aliases (email aggiuntive)
- ✅ Handler per cambio provider
- ✅ Validazione (alert se nessun provider selezionato)
- ✅ Autosave nel localStorage

**Conclusione**: Nessun intervento necessario

---

### 4. Sistema Traduzioni
**File**: `frontend/locales/index.ts`, `frontend/locales/app-translations.ts`

**Status**: ✅ **COMPLETO**

**Implementazione Esistente**:
- ✅ Hook `useTranslations()` funzionante
- ✅ Lingue supportate: EN (Inglese), IT (Italiano)
- ✅ 800+ linee di traduzioni complete
- ✅ Copertura completa:
  - Landing page
  - Auth (login, register, OTP, password reset)
  - Dashboard (home, email, calendar, contacts, settings)
  - Email (composer, list, viewer, bulk actions, labels)
  - Calendar (eventi, dialogs)
  - Contacts (lista, dettagli, form)
  - Settings (general, AI, accounts, notifications)
  - Errori (404, 500)

**Locale Detection**:
```typescript
export const resolveLocale = (value?: string | null): LocaleKey => {
  if (value?.toLowerCase().startsWith('it')) {
    return 'it';
  }
  return 'en';
};
```

**Conclusione**: Sistema i18n completamente funzionante. Nessun intervento necessario.

---

## 🔧 Fix Necessari

### 1. Scrollbar Non Visibili ❌

**Problema**:
Le scrollbar personalizzate implementate nella sessione precedente **non sono visibili** perché:
1. Gli stili webkit funzionano solo su Chrome/Edge/Safari
2. Manca fallback per Firefox
3. Potrebbero esserci problemi con l'altezza dei container

**File Coinvolti**:
- ✅ `frontend/components/email/EmailSidebar/EmailSidebar.tsx` (lines 470-488)
- ✅ `frontend/components/email/ThreadDisplay.tsx` (lines 250-262)
- ✅ `frontend/components/email/EmailLayout.tsx` (lines 101-102, 140-141, 157-158)

**Causa Root**:
1. Gli stili CSS sono corretti MA potrebbero non mostrare scrollbar se:
   - Il contenuto non è abbastanza lungo
   - L'altezza del container non è fissa
   - Firefox usa sintassi diversa

**Soluzione**:

#### Opzione A: Aggiungere Scrollbar Firefox (Preferred)
```css
/* Scrollbar per browser WebKit (Chrome, Safari, Edge) */
'&::-webkit-scrollbar': {
  width: '8px',
},
/* ... resto stili webkit */

/* Scrollbar per Firefox */
scrollbarWidth: 'thin',
scrollbarColor: 'divider background.paper',
```

#### Opzione B: Forzare sempre scrollbar visibili
```css
overflowY: 'scroll' // Invece di 'auto'
```

**Implementazione**:
1. Aggiungere `scrollbarWidth: 'thin'` e `scrollbarColor` per Firefox
2. Testare su Chrome, Firefox, Safari
3. Verificare che scrollbar appaiano quando contenuto è lungo

---

### 2. Pulsanti Reply/Forward Non Funzionanti ⚠️

**Problema**:
I pulsanti **ESISTONO** in `ThreadDisplay.tsx` ma probabilmente i callback `onReply`, `onReplyAll`, `onForward` **non sono implementati** nel componente parent (Mailbox).

**File Coinvolti**:
- ✅ `frontend/components/email/ThreadDisplay.tsx` (pulsanti già presenti lines 353-357)
- ❌ `frontend/components/dashboard/Mailbox.tsx` (callbacks probabilmente mancanti)

**Pulsanti Esistenti** (ThreadDisplay.tsx):
```tsx
{/* Action Bar */}
<Paper elevation={0} sx={{ ... }}>
  <IconButton size="small" onClick={() => onReply?.(email)} title="Reply">
    <Reply size={18} />
  </IconButton>
  <IconButton size="small" onClick={() => onReplyAll?.(email)} title="Reply All">
    <ReplyAll size={18} />
  </IconButton>
  <IconButton size="small" onClick={() => onForward?.(email)} title="Forward">
    <Forward size={18} />
  </IconButton>
</Paper>
```

**Soluzione**:
1. Leggere `Mailbox.tsx` per vedere se passa i props
2. Se mancano, implementare:
   ```typescript
   const handleReply = (email: Email) => {
     router.push({
       pathname: '/dashboard/email/compose',
       query: { replyTo: email.id }
     });
   };

   const handleReplyAll = (email: Email) => {
     router.push({
       pathname: '/dashboard/email/compose',
       query: { replyTo: email.id, replyAll: 'true' }
     });
   };

   const handleForward = (email: Email) => {
     router.push({
       pathname: '/dashboard/email/compose',
       query: { forwardFrom: email.id }
     });
   };
   ```
3. Passare callbacks a ThreadDisplay:
   ```tsx
   <ThreadDisplay
     email={selectedEmail}
     onReply={handleReply}
     onReplyAll={handleReplyAll}
     onForward={handleForward}
     // ... altri props
   />
   ```

---

## 📋 Implementation Plan

### Task 1: Fix Scrollbar Visibility (15 min)
**Priority**: 🔥 P0
**Files**:
- `EmailSidebar.tsx`
- `ThreadDisplay.tsx`

**Steps**:
1. ✅ Leggere EmailSidebar.tsx per vedere stili attuali
2. ✅ Aggiungere supporto Firefox: `scrollbarWidth: 'thin'`, `scrollbarColor`
3. ✅ Verificare che `overflow: 'auto'` sia corretto
4. ✅ Testare scrollbar su contenuti lunghi
5. ✅ Applicare stessa fix a ThreadDisplay.tsx

**Acceptance Criteria**:
- [ ] Scrollbar visibili su Chrome
- [ ] Scrollbar visibili su Firefox
- [ ] Scrollbar appaiono solo quando contenuto overflow
- [ ] Stile coerente in entrambi i componenti

---

### Task 2: Collegare Callbacks Reply/Forward (10 min)
**Priority**: 🔥 P0
**Files**:
- `Mailbox.tsx`

**Steps**:
1. ✅ Leggere Mailbox.tsx per vedere se callbacks esistono
2. ✅ Implementare handleReply, handleReplyAll, handleForward
3. ✅ Passare callbacks a ThreadDisplay component
4. ✅ Testare: click Reply → redirect a compose con query param
5. ✅ Testare: compose carica email e popola campi

**Acceptance Criteria**:
- [ ] Click Reply apre compose in modalità reply
- [ ] Click Reply All apre compose con tutti i destinatari
- [ ] Click Forward apre compose con email originale
- [ ] Compose page carica correttamente l'email di riferimento

---

## 🧪 Testing Checklist

### Scrollbar Testing:
- [ ] Chrome: Scrollbar visibili e stilizzate
- [ ] Firefox: Scrollbar visibili (thin style)
- [ ] Safari: Scrollbar visibili
- [ ] Scrollbar appaiono solo con overflow
- [ ] Hover effect funziona su scrollbar thumb

### Reply/Forward Testing:
- [ ] Click Reply → compose aperto con `replyTo` query param
- [ ] Compose carica email e popola To, Subject
- [ ] Click Reply All → stessi destinatari + CC
- [ ] Click Forward → subject inizia con "Fw:"
- [ ] Compose mostra corpo email originale citato

---

## ⏱️ Time Estimate

| Task | Estimate | Priority |
|------|----------|----------|
| 1. Fix Scrollbar | 15 min | P0 |
| 2. Reply/Forward Callbacks | 10 min | P0 |
| **TOTAL** | **25 min** | - |

---

## 📝 Principi da Seguire

### ✅ DO:
1. **Leggere sempre prima di modificare**
   - Usare Read tool per vedere codice esistente
   - Verificare cosa c'è già implementato
   - Evitare duplicazioni

2. **Modifiche minimali**
   - Solo il codice strettamente necessario
   - No refactoring se non richiesto
   - Mantenere stile esistente

3. **Testing dopo ogni modifica**
   - Verificare che il fix funzioni
   - Non introdurre regressioni
   - Testare su browser diversi

4. **Codice pulito**
   - Commentare solo se necessario
   - Variabili con nomi chiari
   - Seguire convenzioni esistenti

### ❌ DON'T:
1. ❌ Non creare codice inutile
2. ❌ Non aggiungere funzionalità extra
3. ❌ Non modificare file non necessari
4. ❌ Non rompere funzionalità esistenti
5. ❌ Non copiare codice senza capire

---

## 🎯 Success Criteria

### Completamento:
- ✅ Scrollbar visibili su tutti i browser
- ✅ Pulsanti Reply/Forward funzionanti
- ✅ Nessuna regressione
- ✅ Codice pulito e minimal
- ✅ Testing completo

### Documentazione:
- ✅ Aggiornare questo documento con risultati
- ✅ Aggiungere note su eventuali problemi trovati
- ✅ Screenshot delle scrollbar funzionanti

---

## 📊 Current Status

**Analysis**: ✅ **COMPLETED**

**Implementation**: ⏳ **PENDING**

**Next Step**: Fix Scrollbar Visibility

---

**Created**: 2025-11-22 21:30
**Status**: Draft
**Version**: 1.0
