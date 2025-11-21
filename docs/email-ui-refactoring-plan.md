# Email UI Refactoring Plan

**Data:** 2025-11-21
**Obiettivo:** Rifattorizzare completamente l'UI email per renderla flessibile, pulita e completa

## 🎯 Problemi Attuali

1. **Pulsanti Mancanti:**
   - Star/Unstar (già presente ma non ottimale)
   - Mark as Important
   - Archive
   - Quick delete

2. **Codice Ridondante:**
   - Logica duplicata tra EmailList e ConversationList
   - Nessun componente riutilizzabile per azioni

3. **UX Non Intuitiva:**
   - Azioni non facilmente accessibili
   - Nessuna action bar al hover
   - Layout confuso

## ✨ Soluzione Ispirata a Zero-main

### Struttura Componenti

```
email/
├── shared/
│   ├── ThreadActionBar.tsx      # Barra azioni fluttuante (⭐ ❗ 📦 🗑️)
│   ├── ThreadListItem.tsx       # Item riutilizzabile per list/conversation
│   ├── ThreadAvatar.tsx         # Avatar con BIMI support
│   └── ThreadLabels.tsx         # Labels/tags display
├── EmailList/
│   ├── EmailList.tsx            # Container principale
│   ├── EmailListToolbar.tsx     # Toolbar con search, filters, toggle
│   └── VirtualizedList.tsx      # Lista virtualizzata
└── ConversationList/
    ├── ConversationList.tsx     # Container principale
    ├── ConversationListToolbar.tsx  # Toolbar identica a EmailList
    └── VirtualizedList.tsx      # Lista virtualizzata
```

### ThreadActionBar Component

**Props:**
```typescript
interface ThreadActionBarProps {
  threadId: string;
  isStarred: boolean;
  isImportant: boolean;
  onToggleStar: () => void;
  onToggleImportant: () => void;
  onArchive: () => void;
  onDelete: () => void;
  showOnHover?: boolean;  // default true
  position?: 'top' | 'center';  // posizione verticale
}
```

**Features:**
- Appare al hover (opzionale)
- Floating con shadow e border
- Icone con tooltip
- Animazioni smooth
- Ottimistic updates

### ThreadListItem Component

**Props:**
```typescript
interface ThreadListItemProps {
  thread: Thread | Email;
  isSelected: boolean;
  isMultiSelected: boolean;
  onSelect: () => void;
  onToggleMultiSelect: () => void;
  onClick: () => void;

  // Actions
  onToggleStar: () => void;
  onToggleImportant: () => void;
  onArchive: () => void;
  onDelete: () => void;

  // Display
  showAvatar?: boolean;
  showLabels?: boolean;
  showSnippet?: boolean;

  // Render customization
  renderActions?: (props: ActionRenderProps) => React.ReactNode;
}
```

**Features:**
- Riutilizzabile per email singole E conversazioni
- Supporta virtualizzazione
- Hover states
- Selection states
- Keyboard navigation

## 🔄 Migration Steps

### Phase 1: Creare Componenti Base (2-3 ore)
1. `ThreadActionBar.tsx` - barra azioni fluttuante
2. `ThreadAvatar.tsx` - avatar migliorato
3. `ThreadLabels.tsx` - display labels

### Phase 2: Refactorare EmailList (2-3 ore)
1. Estrarre `EmailListToolbar.tsx`
2. Creare nuovo `EmailListItem.tsx` usando ThreadActionBar
3. Integrare con virtualizzazione esistente
4. Test e validazione

### Phase 3: Refactorare ConversationList (2 ore)
1. Riutilizzare componenti da Phase 1 e 2
2. Creare `ConversationListItem.tsx` (wrapper di ThreadListItem)
3. Toolbar identica a EmailList
4. Test e validazione

### Phase 4: Polish & Testing (1-2 ore)
1. Animazioni e transizioni
2. Mobile responsive
3. Keyboard shortcuts
4. Performance testing

## 📝 Code Examples

### ThreadActionBar Usage

```typescript
<ThreadActionBar
  threadId={email.id}
  isStarred={email.isStarred}
  isImportant={email.isImportant}
  onToggleStar={() => handleToggleStar(email.id)}
  onToggleImportant={() => handleToggleImportant(email.id)}
  onArchive={() => handleArchive(email.id)}
  onDelete={() => handleDelete(email.id)}
  showOnHover
  position="center"
/>
```

### ThreadListItem Usage

```typescript
<ThreadListItem
  thread={email}
  isSelected={selectedId === email.id}
  isMultiSelected={multiSelectedIds.has(email.id)}
  onSelect={() => setSelectedId(email.id)}
  onToggleMultiSelect={() => toggleMultiSelect(email.id)}
  onClick={() => handleEmailClick(email)}

  onToggleStar={() => handleToggleStar(email.id)}
  onToggleImportant={() => handleToggleImportant(email.id)}
  onArchive={() => handleArchive(email.id)}
  onDelete={() => handleDelete(email.id)}

  showAvatar
  showLabels
  showSnippet
/>
```

## 🎨 Design Principles

1. **DRY (Don't Repeat Yourself)**
   - Componenti riutilizzabili
   - Logica condivisa in hooks
   - Props flessibili

2. **Composition over Inheritance**
   - Componenti piccoli e composibili
   - Render props per customization
   - Higher-order components quando necessario

3. **Accessibility First**
   - ARIA labels
   - Keyboard navigation
   - Focus management
   - Screen reader support

4. **Performance**
   - Virtualizzazione
   - Memoization
   - Lazy loading
   - Optimistic updates

## ✅ Success Criteria

- [ ] Tutti i pulsanti presenti e funzionanti
- [ ] Codice ridotto del 30%+
- [ ] Nessuna duplicazione tra EmailList e ConversationList
- [ ] UX fluida e intuitiva
- [ ] Test coverage > 80%
- [ ] Performance: <200ms render con 1000 email
- [ ] Mobile responsive
- [ ] Keyboard shortcuts funzionanti

## 📚 References

- Zero-main: `/d/MailAgent/esempio/Zero-main/apps/mail/components/mail/`
- Material-UI: https://mui.com/components/
- React Virtual: https://tanstack.com/virtual/latest
- Gmail UX patterns (for reference)

---

**Next Steps:**
1. Review and approve this plan
2. Start Phase 1: Base components
3. Iterate and test
4. Deploy incrementally
