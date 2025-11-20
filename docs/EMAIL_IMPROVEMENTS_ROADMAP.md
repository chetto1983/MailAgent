# Email System Improvements Roadmap

> **Ispirazione**: [Mail-0/Zero](https://github.com/Mail-0/Zero)
> **Obiettivo**: Rendere il sistema email fluido, moderno e performante come Mail-0

---

## 📊 Stato Attuale

### ✅ Componenti Esistenti (Ben Fatti)

Il sistema email attuale è già ben strutturato con:

- **EmailLayout** - Layout responsivo a 3 colonne (sidebar, list, detail)
- **EmailSidebar** - Navigazione folders con accordions per provider
- **EmailList** - Lista virtualizzata con react-window per performance
- **EmailListItem** - Item email memoizzato con React.memo
- **EmailDetail** - Vista dettaglio con sanitizzazione HTML (DOMPurify)
- **Mailbox** - Container principale con hooks personalizzati

### 🔒 Sicurezza Implementata

- ✓ Sanitizzazione HTML con DOMPurify
- ✓ XSS protection su body email
- ✓ Validation su attachment downloads

### ⚡ Performance

- ✓ React.memo per EmailListItem
- ✓ Virtualizzazione lista con react-window
- ✓ Lazy loading componenti
- ✓ Memoizzazione con useMemo/useCallback

### 📦 API Complete

- ✓ CRUD email completo
- ✓ Bulk operations
- ✓ Draft system (API ready, non usate in UI)
- ✓ Threading/Conversations (API ready)
- ✓ Attachments download
- ✓ Send/Reply/Forward

---

## 🎯 Roadmap Implementazione

### **FASE 1: UX Fluidity** ⏱️ ~2 ore

> Rendere il sistema immediatamente più fluido e piacevole da usare

#### 1.1 Skeleton Loaders
**File da modificare**:
- `frontend/components/email/EmailList/EmailList.tsx`
- `frontend/components/email/EmailSidebar/EmailSidebar.tsx`
- `frontend/components/dashboard/Mailbox.tsx`

**Implementazione**:
```typescript
// Sostituire CircularProgress con Skeleton
import { Skeleton } from '@mui/material';

// EmailList skeleton
<Box sx={{ px: 2 }}>
  {[...Array(5)].map((_, i) => (
    <Box key={i} sx={{ mb: 2 }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="80%" />
    </Box>
  ))}
</Box>

// EmailSidebar skeleton
<List>
  {[...Array(8)].map((_, i) => (
    <ListItem key={i}>
      <Skeleton variant="rectangular" width="100%" height={32} />
    </ListItem>
  ))}
</List>
```

**Benefici**:
- Loading più fluido
- Riduzione perceived latency
- User experience moderna

---

#### 1.2 Snackbar Notifications
**File da modificare**:
- `frontend/components/dashboard/Mailbox.tsx`
- `frontend/hooks/use-email-actions.ts`

**Implementazione**:
```typescript
// Aggiungere snackbar state
const [snackbar, setSnackbar] = useState<{
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}>({
  open: false,
  message: '',
  severity: 'info',
});

// Notifiche per azioni:
- Email deleted ✓
- Email archived ✓
- Email starred/unstarred ✓
- Email marked as read/unread ✓
- Bulk actions completed ✓
- Sync completed ✓
- Error handling con retry suggestions
```

**Pattern da seguire**: Come implementato in Calendar.tsx e Contacts.tsx (commit 432c63c)

---

#### 1.3 Smart Filters
**File da creare/modificare**:
- `frontend/components/email/EmailSidebar/SmartFilters.tsx` (nuovo)
- `frontend/components/email/EmailSidebar/EmailSidebar.tsx`

**Smart Filters da implementare**:
```typescript
const SMART_FILTERS = [
  {
    id: 'today',
    label: 'Today',
    icon: <CalendarToday />,
    queryOverrides: {
      startDate: new Date().toISOString().split('T')[0]
    }
  },
  {
    id: 'this-week',
    label: 'This Week',
    icon: <DateRange />,
    queryOverrides: {
      startDate: getStartOfWeek().toISOString()
    }
  },
  {
    id: 'unread',
    label: 'Unread',
    icon: <MailOutline />,
    count: unreadCount,
    queryOverrides: { isRead: false }
  },
  {
    id: 'attachments',
    label: 'Has Attachments',
    icon: <AttachFile />,
    queryOverrides: { hasAttachments: true }
  },
  {
    id: 'important',
    label: 'Important',
    icon: <Label />,
    queryOverrides: { isStarred: true }
  }
];
```

**UI Location**: Sopra i folder providers nell'EmailSidebar

---

#### 1.4 Quick Actions Toolbar
**File da modificare**:
- `frontend/components/email/EmailList/EmailList.tsx`
- `frontend/components/email/EmailDetail/EmailDetail.tsx`

**Azioni da aggiungere**:

**Nella EmailList toolbar**:
```typescript
<Box sx={{ display: 'flex', gap: 1 }}>
  <IconButton tooltip="Mark as read">
    <MarkEmailRead />
  </IconButton>
  <IconButton tooltip="Archive">
    <Archive />
  </IconButton>
  <IconButton tooltip="Move to folder">
    <FolderMove />
  </IconButton>
  <IconButton tooltip="Add label">
    <Label />
  </IconButton>
  <Divider orientation="vertical" />
  <IconButton tooltip="Sync now" onClick={handleSync}>
    <Sync className={syncing ? 'animate-spin' : ''} />
  </IconButton>
</Box>
```

**Nella EmailDetail**:
- Reply All button
- Print button
- Move to folder dropdown
- Labels quick assign

---

### **FASE 2: Advanced Features** ⏱️ ~3 ore

#### 2.1 Threading/Conversazioni View
**File da creare**:
- `frontend/components/email/ThreadView/ThreadView.tsx`
- `frontend/components/email/ThreadView/ThreadItem.tsx`
- `frontend/hooks/use-thread.ts`

**Implementazione**:
```typescript
// Hook per caricare thread
export function useThread(threadId: string) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!threadId) return;

    setLoading(true);
    emailApi.getThread(threadId)
      .then(res => setEmails(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [threadId]);

  return { emails, loading };
}

// ThreadView component
export function ThreadView({ threadId }: { threadId: string }) {
  const { emails, loading } = useThread(threadId);

  return (
    <Box>
      {emails.map((email, index) => (
        <ThreadItem
          key={email.id}
          email={email}
          isLast={index === emails.length - 1}
          isExpanded={index === emails.length - 1}
        />
      ))}
    </Box>
  );
}
```

**Toggle View**: Aggiungere switch "Group by conversation" nella toolbar

---

#### 2.2 Compose Dialog Migliorato
**File da creare**:
- `frontend/components/email/ComposeDialog/ComposeDialog.tsx`
- `frontend/components/email/ComposeDialog/RichTextEditor.tsx`
- `frontend/components/email/ComposeDialog/RecipientInput.tsx`
- `frontend/components/email/ComposeDialog/AttachmentUploader.tsx`

**Stack tecnologico**:
- **Rich Editor**: Draft.js o Tiptap
- **Recipient autocomplete**: Material-UI Autocomplete con contacts API
- **File upload**: React Dropzone
- **Email validation**: Yup schema

**Features**:
```typescript
interface ComposeDialogProps {
  open: boolean;
  mode: 'compose' | 'reply' | 'forward';
  replyTo?: Email;
  onClose: () => void;
  onSend: (data: SendEmailPayload) => void;
}

// Features da implementare:
- Rich text formatting (bold, italic, lists, links)
- Recipient chips con validation
- CC/BCC toggle
- Attachment upload con preview
- Draft autosave ogni 30 secondi
- Template selection
- Signature insertion
- Send later scheduling
```

---

#### 2.3 Draft Autosave
**File da modificare**:
- `frontend/components/email/ComposeDialog/ComposeDialog.tsx`
- `frontend/hooks/use-draft-autosave.ts` (nuovo)

**Implementazione**:
```typescript
export function useDraftAutosave(
  formData: ComposeFormData,
  draftId: string | null,
  debounceMs = 30000 // 30 secondi
) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!formData.to.length && !formData.subject && !formData.body) {
        return; // Non salvare bozze vuote
      }

      setIsSaving(true);
      try {
        const result = await emailApi.saveDraft({
          id: draftId || undefined,
          ...formData
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to autosave draft:', error);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [formData, draftId, debounceMs]);

  return { isSaving, lastSaved };
}
```

**UI Indicator**: "Saving..." / "Saved at HH:MM" nella footer del dialog

---

#### 2.4 Search Avanzata
**File da creare**:
- `frontend/components/email/SearchDialog/SearchDialog.tsx`
- `frontend/components/email/SearchDialog/SearchFilters.tsx`
- `frontend/components/email/SearchDialog/SearchResults.tsx`

**Features**:
```typescript
interface SearchFilters {
  query: string;
  from?: string;
  to?: string;
  subject?: string;
  hasAttachments?: boolean;
  dateRange?: { start: Date; end: Date };
  folder?: string;
  isStarred?: boolean;
  isRead?: boolean;
  providerId?: string;
}

// UI Components:
- Search bar con suggestions (recenti, contatti)
- Advanced filters accordion
- Date range picker
- Search history (localStorage)
- Save search as smart filter
- Export search results
```

**Search Suggestions**:
```typescript
// Suggerimenti basati su:
- Recent searches
- Frequent senders (da contacts)
- Common subjects
- Folder names
```

---

### **FASE 3: Polish & Performance** ⏱️ ~1 ora

#### 3.1 Infinite Scroll / Pagination
**File da modificare**:
- `frontend/components/email/EmailList/EmailList.tsx`
- `frontend/hooks/use-infinite-emails.ts` (nuovo)

**Implementazione**:
```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteEmails(filters: EmailListParams) {
  return useInfiniteQuery({
    queryKey: ['emails', filters],
    queryFn: ({ pageParam = 1 }) =>
      emailApi.listEmails({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.data.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });
}

// Nella EmailList:
<InfiniteScroll
  loadMore={fetchNextPage}
  hasMore={hasNextPage}
  loader={<Skeleton />}
>
  {emails.map(email => <EmailListItem ... />)}
</InfiniteScroll>
```

---

#### 3.2 Keyboard Shortcuts
**File esistente da estendere**:
- `frontend/hooks/use-keyboard-navigation.ts`

**Shortcuts da aggiungere**:
```typescript
const SHORTCUTS = {
  'c': 'Compose new email',
  'r': 'Reply',
  'a': 'Reply all',
  'f': 'Forward',
  'e': 'Archive',
  'Shift+3': 'Delete',
  's': 'Star/Unstar',
  'u': 'Mark as unread',
  'Shift+i': 'Mark as read',
  'g i': 'Go to Inbox',
  'g s': 'Go to Starred',
  'g d': 'Go to Drafts',
  '/': 'Focus search',
  'Esc': 'Close/Go back',
  'j/k': 'Navigate up/down',
  'Enter': 'Open email',
};
```

**UI**: Mostrare shortcuts con `Shift + ?` (help dialog)

---

#### 3.3 Labels/Tags System
**File da creare**:
- `frontend/components/email/Labels/LabelManager.tsx`
- `frontend/components/email/Labels/LabelPicker.tsx`
- `frontend/lib/api/labels.ts`

**Database Schema** (backend):
```sql
CREATE TABLE email_labels (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE email_label_assignments (
  email_id UUID REFERENCES emails(id),
  label_id UUID REFERENCES email_labels(id),
  PRIMARY KEY (email_id, label_id)
);
```

**UI Features**:
- Create custom labels
- Assign multiple labels to email
- Filter by label
- Label color picker
- Bulk label operations

---

#### 3.4 Email Preview Pane Resize
**File da modificare**:
- `frontend/components/email/EmailLayout.tsx`

**Implementazione**:
```typescript
import { Resizable } from 're-resizable';

export const EmailLayout: React.FC<EmailLayoutProps> = ({ ... }) => {
  const [listWidth, setListWidth] = useState(400);

  return (
    <Box sx={{ display: 'flex' }}>
      <Box sx={{ width: 240 }}>{sidebar}</Box>

      <Resizable
        size={{ width: listWidth, height: '100%' }}
        onResizeStop={(e, direction, ref, d) => {
          setListWidth(listWidth + d.width);
        }}
        minWidth={300}
        maxWidth={600}
      >
        {list}
      </Resizable>

      <Box sx={{ flex: 1 }}>{detail}</Box>
    </Box>
  );
};
```

---

### **FASE 4: Extra Polish** ⏱️ ~2 ore (opzionale)

#### 4.1 Swipe Actions (Mobile)
**Library**: react-swipeable-list

```typescript
<SwipeableListItem
  swipeLeft={{
    content: <Archive />,
    action: () => handleArchive(email.id)
  }}
  swipeRight={{
    content: <Delete />,
    action: () => handleDelete(email.id)
  }}
>
  <EmailListItem ... />
</SwipeableListItem>
```

---

#### 4.2 Email Templates
**File da creare**:
- `frontend/components/email/Templates/TemplateManager.tsx`
- `frontend/components/email/Templates/TemplatePicker.tsx`

**Features**:
- Save email as template
- Template categories
- Variable insertion ({{name}}, {{company}})
- Template preview
- Import/Export templates

---

#### 4.3 Unified Inbox con AI Categorization
**Inspirato da Mail-0**: Usare AI per categorizzare email

```typescript
// Categories:
- Primary (persone)
- Social (social media)
- Promotions (marketing)
- Updates (notifiche servizi)
- Forums (mailing lists)

// Backend: Usare OpenAI/Claude per classificazione
```

---

#### 4.4 Email Analytics Dashboard
**File da creare**:
- `frontend/components/email/Analytics/EmailAnalytics.tsx`

**Metrics**:
- Emails sent/received per day
- Response time stats
- Top senders/recipients
- Email volume by folder
- Attachment storage usage
- Charts con Recharts

---

## 📦 Deliverables per Fase

### Fase 1 Deliverables
```
✅ Skeleton loaders in EmailList, EmailSidebar
✅ Snackbar notifications per tutte le azioni email
✅ Smart filters component con 5+ filtri
✅ Quick actions toolbar estesa
✅ Build + Test + Commit
```

### Fase 2 Deliverables
```
✅ ThreadView component funzionante
✅ ComposeDialog con rich editor
✅ Draft autosave funzionante
✅ Search avanzata con filters
✅ Build + Test + Commit
```

### Fase 3 Deliverables
```
✅ Infinite scroll implementato
✅ Keyboard shortcuts estesi
✅ Label system completo
✅ Resizable panes
✅ Build + Test + Commit
```

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] EmailList rendering con dati mock
- [ ] EmailListItem memoization funziona
- [ ] Smart filters applicano query corrette
- [ ] Draft autosave debounce funziona
- [ ] Search filters combinati correttamente

### Integration Tests
- [ ] Compose -> Send -> Email appare in Sent
- [ ] Reply -> Thread creato correttamente
- [ ] Draft saved -> Ricaricato correttamente
- [ ] Search -> Risultati corretti
- [ ] Bulk actions -> Tutte email aggiornate

### E2E Tests (Cypress/Playwright)
- [ ] User journey: Login -> Inbox -> Read email -> Reply
- [ ] User journey: Compose -> Attach -> Send
- [ ] User journey: Search -> Filter -> Open result
- [ ] Mobile: Swipe actions funzionano
- [ ] Keyboard shortcuts funzionano

---

## 📊 Success Metrics

### Performance
- [ ] FCP (First Contentful Paint) < 1.5s
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] TTI (Time to Interactive) < 3.5s
- [ ] Email list scroll 60fps
- [ ] Search results < 500ms

### UX
- [ ] Skeleton loaders riducono perceived latency
- [ ] Snackbar feedback per ogni azione
- [ ] Zero layout shift durante loading
- [ ] Mobile responsive 100%
- [ ] Keyboard navigation completa

### Code Quality
- [ ] TypeScript strict mode
- [ ] 0 ESLint warnings
- [ ] All components documented
- [ ] Test coverage > 80%
- [ ] Bundle size analizzato

---

## 🚀 Deployment Strategy

### Fase 1 (Week 1)
- Deploy su dev environment
- Internal testing
- Feedback collection
- Bug fixes

### Fase 2 (Week 2)
- Deploy su staging
- Beta testing con utenti selezionati
- Performance monitoring
- UX adjustments

### Fase 3 (Week 3)
- Deploy su production
- Gradual rollout (10% -> 50% -> 100%)
- Monitor error rates
- Collect user feedback

---

## 📚 References

### Inspirazione Design
- [Mail-0/Zero](https://github.com/Mail-0/Zero) - Open source email client
- Gmail Web UI - Industry standard
- Superhuman - Keyboard-first workflow
- Hey.com - Opinionated email experience

### Tecnologie
- [Draft.js](https://draftjs.org/) - Rich text editor
- [Tiptap](https://tiptap.dev/) - Alternative rich editor
- [React Query](https://tanstack.com/query) - Data fetching
- [react-window](https://github.com/bvaughn/react-window) - Virtualization
- [DOMPurify](https://github.com/cure53/DOMPurify) - XSS protection

### Best Practices
- [Web.dev Email Best Practices](https://web.dev/articles/email)
- [MDN Email Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [OWASP Email Security](https://owasp.org/www-community/vulnerabilities/Email_Security)

---

## 🎯 Prioritization Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Skeleton Loaders | High | Low | **P0** |
| Snackbar Notifications | High | Low | **P0** |
| Smart Filters | High | Medium | **P0** |
| Threading View | High | High | **P1** |
| Compose Dialog | High | High | **P1** |
| Draft Autosave | Medium | Low | **P1** |
| Advanced Search | Medium | Medium | **P2** |
| Labels System | Medium | High | **P2** |
| Infinite Scroll | Low | Medium | **P3** |
| Email Templates | Low | Medium | **P3** |
| Analytics | Low | High | **P4** |

**Legend**:
- **P0**: Must have (Fase 1)
- **P1**: Should have (Fase 2)
- **P2**: Nice to have (Fase 3)
- **P3**: Future enhancement (Fase 4)
- **P4**: Optional (Backlog)

---

## 📝 Notes

### Considerazioni Architetturali
- Mantenere separazione tra presentation e business logic
- Usare custom hooks per logica riutilizzabile
- State management con Zustand per email store
- API client centralizzato con error handling
- Type safety completo con TypeScript

### Sicurezza
- Sanitizzare SEMPRE HTML email con DOMPurify
- Validare file uploads (type, size)
- Rate limiting su API calls
- CSRF protection su forms
- Content Security Policy headers

### Accessibilità
- Keyboard navigation completa
- Screen reader support
- Focus management nei dialogs
- ARIA labels appropriati
- Color contrast WCAG AA

---

**Documento creato**: 2025-11-20
**Ultima modifica**: 2025-11-20
**Versione**: 1.0
**Autore**: Claude (AI Assistant)
**Review**: Pending
