# Email Components

Clean, modern email interface components built with Material-UI and React.

## 📁 Structure

```
email/
├── README.md                     # This file
├── index.ts                      # Centralized exports
│
├── EmailLayout.tsx               # Main layout component
├── ThreadList.tsx                # Unified list (replaces EmailList + ConversationList)
├── ThreadListItem.tsx            # List item component
├── ThreadDisplay.tsx             # Email viewer (replaces EmailDetail + EmailThread)
│
├── shared/                       # Reusable components
│   ├── ThreadActionBar.tsx       # Floating action bar (⭐ ❗ 📦 🗑️)
│   ├── ThreadAvatar.tsx          # Avatar with unread indicator
│   ├── ThreadLabels.tsx          # Labels display
│   └── index.tsx                 # Exports
│
├── BulkActionBar/                # Multi-selection actions
├── ComposeDialog/                # Email composition
├── EmailSidebar/                 # Folders & navigation
├── AdvancedSearchDialog/         # Advanced search
├── FolderSelectorDialog.tsx      # Folder picker
├── LabelSelectorDialog.tsx       # Label picker
└── ContactAutocomplete.tsx       # Email autocomplete
```

## 🎯 Key Components

### 1. **EmailLayout**
Responsive layout with sidebar, list, and detail panels.

```tsx
<EmailLayout
  sidebar={<EmailSidebar />}
  list={<ThreadList threads={emails} />}
  detail={<ThreadDisplay email={selected} />}
  showDetail={!!selected}
/>
```

### 2. **ThreadList** ⭐ NEW
Unified component for displaying emails or conversations.

**Replaces:** `EmailList` + `ConversationList`

```tsx
<ThreadList
  threads={emails}
  selectedId={selectedId}
  selectedIds={selectedIds}
  onThreadClick={handleClick}
  onToggleStar={handleStar}
  onToggleImportant={handleImportant}
  onArchive={handleArchive}
  onDelete={handleDelete}
  viewMode="list"
/>
```

### 3. **ThreadListItem** ⭐ NEW
Displays individual email/conversation with floating action bar.

**Features:**
- Floating action bar on hover (Star, Important, Archive, Delete)
- Multi-selection checkbox
- Unread indicator
- Labels and metadata
- Thread count for conversations
- Attachment indicator

### 4. **ThreadDisplay** ⭐ NEW
Clean email viewer with actions.

**Replaces:** `EmailDetail` + `EmailThread`

```tsx
<ThreadDisplay
  email={selectedEmail}
  onClose={() => setSelected(null)}
  onToggleStar={handleStar}
  onArchive={handleArchive}
  onDelete={handleDelete}
  onReply={handleReply}
/>
```

### 5. **Shared Components**

#### ThreadActionBar
Floating action bar that appears on hover.

```tsx
<ThreadActionBar
  threadId={email.id}
  isStarred={email.isStarred}
  isImportant={email.isImportant}
  onToggleStar={() => {}}
  onToggleImportant={() => {}}
  onArchive={() => {}}
  onDelete={() => {}}
  showOnHover
  isHovered={isHovered}
/>
```

#### ThreadAvatar
Avatar with visual unread indicator.

```tsx
<ThreadAvatar
  email="user@example.com"
  name="John Doe"
  isUnread={true}
  size={40}
/>
```

#### ThreadLabels
Display labels with overflow handling.

```tsx
<ThreadLabels
  labels={[
    { id: '1', name: 'Work', color: '#2196F3' },
    { id: '2', name: 'Important', color: '#F44336' }
  ]}
  maxVisible={3}
  size="small"
/>
```

## 🔄 Migration Guide

### From Old to New Components

| Old Component | New Component | Status |
|--------------|---------------|--------|
| `EmailList` | `ThreadList` | ✅ Deprecated |
| `ConversationList` | `ThreadList` | ✅ Deprecated |
| `EmailListItem` | `ThreadListItem` | ✅ Deprecated |
| `ConversationListItem` | `ThreadListItem` | ✅ Deprecated |
| `EmailDetail` | `ThreadDisplay` | ✅ Deprecated |
| `EmailThread` | `ThreadDisplay` | ✅ Deprecated |

### Example Migration

**Before:**
```tsx
import { EmailList } from '@/components/email/EmailList/EmailList';
import { ConversationList } from '@/components/email/ConversationList/ConversationList';

// Two separate components...
<EmailList emails={emails} />
<ConversationList conversations={conversations} />
```

**After:**
```tsx
import { ThreadList } from '@/components/email';

// One unified component!
<ThreadList threads={emails} viewMode="list" />
<ThreadList threads={conversations} viewMode="conversation" />
```

## 🎨 Design Principles

1. **DRY (Don't Repeat Yourself)**
   - Unified components for emails and conversations
   - Shared UI elements in `shared/` folder
   - Centralized exports in `index.ts`

2. **Composition over Duplication**
   - Small, composable components
   - Props for customization
   - Type-safe with TypeScript

3. **Performance**
   - React.memo for expensive components
   - Optimized re-renders with proper dependencies
   - Lazy loading support

4. **Accessibility**
   - ARIA attributes
   - Keyboard navigation
   - Screen reader support
   - Semantic HTML

5. **Internationalization**
   - All strings use `useTranslations` hook
   - Support for EN and IT locales
   - Easy to add more languages

## 🚀 Features

### Floating Action Bar
Quick actions appear on hover over each email:
- ⭐ Star/Unstar
- ❗ Mark as Important
- 📦 Archive
- 🗑️ Delete

### Multi-Selection
Select multiple emails for bulk actions:
- Checkbox on each item
- Bulk action bar appears
- Actions apply to all selected

### Responsive Design
- **Desktop:** Sidebar + List + Detail (3-column)
- **Tablet:** Collapsible sidebar + List + Detail
- **Mobile:** Full-screen views with smooth transitions

### Theme Support
- Light and dark mode
- Follows system preferences
- Smooth transitions

## 📚 Inspiration

This refactoring was inspired by [Zero-main](https://github.com/example/zero-main), a modern email client built with:
- Clean component structure
- Reusable patterns
- Excellent UX

## 🔧 Development

### Adding a New Action

1. Add to `ThreadActionBar.tsx`:
```tsx
<IconButton onClick={handleNewAction}>
  <NewIcon />
</IconButton>
```

2. Add translation to `locales/app-translations.ts`:
```ts
bulkBar: {
  // ...
  newAction: 'New Action',
}
```

3. Add handler prop to `ThreadListItem`:
```tsx
interface ThreadListItemProps {
  // ...
  onNewAction?: (id: string) => void;
}
```

### Testing

```bash
npm test components/email
```

## 📝 Notes

- Old components (`EmailList`, `ConversationList`, etc.) are kept for backward compatibility
- They are marked as deprecated and will be removed in a future version
- Migration is recommended for better performance and maintainability

---

**Last updated:** 2025-11-21
**Status:** ✅ Refactored and cleaned
