# Gmail-Style Email UI Components

Sistema completo di componenti UI per gestione email in stile Gmail, con supporto multi-account, AI integrata e design responsive.

## 📁 Struttura Componenti

```
frontend/components/dashboard/email/
├── GmailMailLayout.tsx      # Layout principale completo
├── EmailToolbar.tsx          # Toolbar con azioni batch e ricerca
├── EmailFilters.tsx          # Filtri avanzati multi-criterio
├── EmailListEnhanced.tsx     # Lista email con provider badges
├── AIChatPanel.tsx           # Chat AI contestuale
├── EmailComposer.tsx         # Composer con rich editor (già esistente)
├── index.ts                  # Export centralizzato
└── README.md                 # Questa documentazione
```

## 🚀 Quick Start

### Importazione Base

```typescript
import { GmailMailLayout } from '@/components/dashboard/email';

// Nel tuo componente/pagina
export default function MailPage() {
  return <GmailMailLayout />;
}
```

Il `GmailMailLayout` include già tutti i componenti necessari integrati.

### Importazione Componenti Singoli

```typescript
import {
  EmailToolbar,
  EmailFilters,
  EmailListEnhanced,
  AIChatPanel,
  EmailComposer
} from '@/components/dashboard/email';
```

## 📦 Componenti

### 1. GmailMailLayout

Layout principale che integra tutti i componenti.

**Features:**
- ✅ Layout responsive a 3 colonne (sidebar, list, preview)
- ✅ Drawer mobile per navigazione
- ✅ Gestione stato completa (emails, folders, filters)
- ✅ Azioni batch (delete, archive, mark as read/unread, star)
- ✅ Paginazione integrata
- ✅ Multi-account con provider badges
- ✅ AI chat panel integrato
- ✅ Email composer con allegati

**Props:**
Nessuna prop richiesta - tutto è gestito internamente.

**Funzionalità Implementate:**
```typescript
// Caricamento dati
- loadEmails()        // Carica email con filtri e paginazione
- loadStats()         // Carica statistiche
- loadProviders()     // Carica account connessi

// Azioni email
- handleEmailClick()          // Seleziona e marca come letta
- handleSelectEmail()         // Multi-select con Shift-click
- handleSelectAll()           // Select/deselect all
- handleBatchDelete()         // Elimina multiple email
- handleBatchArchive()        // Archivia multiple email
- handleBatchMarkAsRead()     // Marca come lette
- handleBatchMarkAsUnread()   // Marca come non lette
- handleToggleStar()          // Toggle stella singola email
- handleToggleRead()          // Toggle read singola email
- handleDelete()              // Elimina singola email
- handleReply()               // Apre composer in modalità reply
- handleForward()             // Apre composer in modalità forward
```

### 2. EmailToolbar

Toolbar completa con azioni batch, ricerca e paginazione.

**Props:**
```typescript
interface EmailToolbarProps {
  selectedCount: number;           // Numero email selezionate
  totalCount: number;               // Totale email
  allSelected: boolean;             // Tutte selezionate?
  onSelectAll: (checked: boolean) => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onMarkAsRead?: () => void;
  onMarkAsUnread?: () => void;
  onStar?: () => void;
  onLabel?: () => void;
  onRefresh?: () => void;
  onSearch?: (query: string) => void;
  onFilterToggle?: () => void;
  showFilters?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
}
```

**Features:**
- Checkbox select-all con stato indeterminate
- Azioni batch visibili solo quando ci sono selezioni
- Search bar con debounce integrato
- Filter toggle button
- Paginazione Gmail-style (N of M + prev/next)
- Refresh button con animazione loading
- Menu "More" per azioni aggiuntive

### 3. EmailFilters

Pannello filtri avanzati con supporto multi-account.

**Props:**
```typescript
interface EmailFiltersProps {
  open: boolean;
  filters: EmailFilterValues;
  onFilterChange: (filters: EmailFilterValues) => void;
  onClear: () => void;
  providers?: Array<{
    id: string;
    email: string;
    providerType: string;
  }>;
}

interface EmailFilterValues {
  provider?: string;
  isRead?: boolean | 'all';
  isStarred?: boolean;
  hasAttachments?: boolean;
  from?: string;
  startDate?: string;
  endDate?: string;
}
```

**Features:**
- Collapse/expand animato
- Active filters con chip removibili
- Provider selection con icone (📧 Google, 📨 Microsoft, 📬 Generic)
- Date range picker
- Quick filters (Starred, Has attachments)
- Clear all button
- Counter filtri attivi

### 4. EmailListEnhanced

Lista email avanzata con provider indicators.

**Props:**
```typescript
interface EmailListEnhancedProps {
  emails: Email[];
  selectedEmail: Email | null;
  onEmailClick: (email: Email) => void;
  loading: boolean;
  selectedEmailIds: Set<string>;
  onSelectEmail: (
    email: Email,
    index: number,
    options: { checked: boolean; shiftKey: boolean }
  ) => void;
  formatDate: (dateString: string) => string;
  extractDisplayName: (from: string) => string;
  providers?: Provider[];
  emptyMessage?: string;
  loadingMessage?: string;
}
```

**Features:**
- Provider badge su avatar (indica account sorgente)
- Attachment indicator (📎)
- Read/unread visual states
- Star indicator
- Multi-select con checkbox (opacity 0 on hover desktop)
- Shift-click range selection
- Border left colorato per email non lette
- Loading e empty states

### 5. AIChatPanel

Pannello chat AI contestuale.

**Props:**
```typescript
interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
  emailContext?: {
    subject: string;
    from: string;
    content: string;
  };
}
```

**Features:**
- Position fixed responsive (mobile fullscreen)
- Collapsible header
- Email context badge
- Quick actions:
  - 📝 Summarize - Riassunto email
  - ✍️ Smart Reply - Suggerimenti risposta
  - 🔍 Extract Info - Estrazione informazioni
- Conversazione con history
- Copy to clipboard per risposte AI
- Scroll automatico a nuovi messaggi

### 6. EmailComposer

Già esistente, integrato nel layout.

**Modifiche necessarie:**
Assicurarsi che accetti `providers` come prop opzionale.

## 🎨 Design System

### Material-UI Components Used
- Box, Paper, Drawer - Layout
- Button, IconButton, Fab - Actions
- TextField, Select, Checkbox - Forms
- Chip, Badge, Avatar - Display
- Stack, Divider - Layout helpers
- Toolbar, Menu, MenuItem - Navigation
- CircularProgress - Loading states

### Icons (Lucide React)
```typescript
import {
  Mail, MailOpen, Star, Archive, Trash2,
  Reply, Forward, Send, Edit, Bot, Paperclip,
  Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Menu, X, Calendar, User, Tag
} from 'lucide-react';
```

### Color Scheme
- primary.main - Azioni principali, email selezionate
- action.hover - Hover states
- action.selected - Selected states
- error.main - Delete, badge unread
- warning.main - Star
- divider - Borders
- background.default - Main background
- background.paper - Cards, panels

## 📱 Responsive Behavior

### Desktop (md+)
- Sidebar permanente (260px)
- List + Preview side-by-side
- Checkboxes visibili on hover
- All actions visibili

### Mobile (< md)
- Sidebar in Drawer
- List OR Preview (conditional render)
- Back button nel preview
- Floating FABs (Compose, AI Chat)
- Menu burger per sidebar
- Checkboxes sempre visibili

## 🔧 Utility Functions

### formatDate
```typescript
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
```

### extractDisplayName
```typescript
const extractDisplayName = (from: string) => {
  return from?.split('<')[0].trim() || from;
};
```

## 📊 State Management

```typescript
// UI State
const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
const [showFilters, setShowFilters] = useState(false);
const [aiChatOpen, setAiChatOpen] = useState(false);
const [composerOpen, setComposerOpen] = useState(false);

// Data State
const [emails, setEmails] = useState<Email[]>([]);
const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
const [selectedFolder, setSelectedFolder] = useState<FolderType>('INBOX');
const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
const [stats, setStats] = useState<EmailStats | null>(null);
const [providers, setProviders] = useState<ProviderConfig[]>([]);
const [filters, setFilters] = useState<EmailFilterValues>({});
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
```

## 🔌 API Integration

### Endpoints utilizzati
```typescript
// Email API
emailApi.listEmails({ folder, page, limit, ...filters })
emailApi.getStats()
emailApi.updateEmail(id, { isRead, isStarred, isDeleted, isArchived })

// Providers API
providersApi.getProviders()

// Folders API
getFolders()
syncAllFolders()
```

### Types richiesti
```typescript
// In frontend/lib/api/email.ts
export type EmailUpdateData = {
  isRead?: boolean;
  isStarred?: boolean;
  isDeleted?: boolean;      // ✅ AGGIUNTO
  isArchived?: boolean;     // ✅ AGGIUNTO
  folder?: string;
};
```

## ⚡ Performance

### Ottimizzazioni implementate
- `useCallback` per funzioni passate a child components
- `useMemo` per computazioni costose (es. provider lookup)
- Conditional rendering per mobile (display none vs unmount)
- Lazy loading componenti pesanti (EmailComposer, AIChatPanel)
- Virtualization ready (ScrollArea con overflow)

### Best Practices
- Evitare re-renders inutili con `React.memo` dove necessario
- Debounce su search input
- Batch state updates dove possibile
- Loading states per tutte le async operations

## 🧪 Testing

### Test Checklist

#### Desktop
- [ ] Layout 3 colonne corretto
- [ ] Sidebar sempre visibile
- [ ] Select all funziona
- [ ] Shift-click multi-select
- [ ] Batch actions funzionano
- [ ] Filters expand/collapse
- [ ] Pagination prev/next
- [ ] Email preview side-by-side
- [ ] AI chat panel position fixed

#### Mobile
- [ ] Sidebar in drawer
- [ ] Menu burger apre sidebar
- [ ] List mostra/nasconde preview
- [ ] Back button funziona
- [ ] FAB compose visibile
- [ ] FAB AI chat visibile
- [ ] Checkboxes sempre visibili
- [ ] Touch targets 48px+

#### Funzionalità
- [ ] Email click marca come letta
- [ ] Star toggle
- [ ] Delete funziona
- [ ] Archive funziona
- [ ] Reply apre composer
- [ ] Forward apre composer
- [ ] Filters applicano correttamente
- [ ] Search filtra results
- [ ] Provider badges corretti
- [ ] Attachment indicators
- [ ] AI chat quick actions
- [ ] Pagination cambia pagina

## 🐛 Known Issues & TODO

### Da implementare
- [ ] Drag & drop emails to folders
- [ ] Email templates nel composer
- [ ] Undo delete/archive (toast con action)
- [ ] Keyboard shortcuts (j/k navigation, c compose, etc.)
- [ ] Virtual scrolling per liste molto lunghe
- [ ] Offline support con Service Worker
- [ ] Push notifications per nuove email

### Bug noti
- Mobile: Transition tra list/preview potrebbe essere più fluida
- AI Chat: Necessita integrazione con API reale
- EmailComposer: Attachment upload va implementato con backend

## 📚 Esempi d'uso

### Uso base
```typescript
import { GmailMailLayout } from '@/components/dashboard/email';

export default function MailPage() {
  return <GmailMailLayout />;
}
```

### Uso componenti singoli
```typescript
import { EmailToolbar, EmailListEnhanced } from '@/components/dashboard/email';

export default function CustomMailView() {
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(new Set());

  return (
    <div>
      <EmailToolbar
        selectedCount={selected.size}
        totalCount={emails.length}
        allSelected={selected.size === emails.length}
        onSelectAll={(checked) => {
          setSelected(checked ? new Set(emails.map(e => e.id)) : new Set());
        }}
        onDelete={async () => {
          // Delete logic
        }}
      />
      <EmailListEnhanced
        emails={emails}
        selectedEmail={null}
        onEmailClick={(email) => console.log('Clicked', email)}
        loading={false}
        selectedEmailIds={selected}
        onSelectEmail={(email, index, options) => {
          const newSelected = new Set(selected);
          options.checked ? newSelected.add(email.id) : newSelected.delete(email.id);
          setSelected(newSelected);
        }}
        formatDate={(date) => new Date(date).toLocaleDateString()}
        extractDisplayName={(from) => from.split('<')[0].trim()}
      />
    </div>
  );
}
```

## 🎓 Learning Resources

### Ispirazione Design
- Gmail Web UI
- Apple Mail
- Superhuman

### Material-UI
- [MUI Documentation](https://mui.com/)
- [MUI System](https://mui.com/system/getting-started/)
- [MUI Icons](https://mui.com/material-ui/material-icons/)

### Lucide Icons
- [Lucide Icons Gallery](https://lucide.dev/icons/)

## 🤝 Contributing

Per contribuire a questi componenti:

1. Mantieni la nomenclatura consistente
2. Usa TypeScript strict mode
3. Aggiungi JSDoc comments
4. Test su mobile E desktop
5. Segui Material Design 3 guidelines
6. Mantieni accessibilità (ARIA labels, keyboard nav)

## 📝 License

Parte del progetto MailAgent - All rights reserved

---

**Created with ❤️ for MailAgent**
*Inspired by Gmail's exceptional UX*
