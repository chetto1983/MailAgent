# 📧 Frontend Email Components - Roadmap & Improvement Plan

**Date:** 2025-01-21
**Version:** 1.0
**Status:** Draft for Review
**Components Analyzed:** 9 core email components + 1 main container

---

## 📋 Executive Summary

This document outlines the comprehensive review of the email frontend components (`frontend/components/email` and `frontend/components/dashboard/Mailbox.tsx`) and provides a structured roadmap for improvements.

### Key Findings

- **Total Issues Identified:** 68
  - 🔴 Critical: 4 (backend handles HTML sanitization)
  - 🟡 Important: 10
  - 🟢 Medium: 37
  - 🎯 Enhancement: 17

- **Categories:**
  - UI/UX: 16 issues
  - Functionality: 12 issues
  - Mobile View: 12 issues
  - Accessibility: 17 issues
  - Performance: 11 issues

### Impact Assessment

| Priority | Issues | Est. Effort | User Impact | Business Impact |
|----------|--------|-------------|-------------|-----------------|
| P0 (Critical) | 4 | 2 weeks | HIGH | Core UX + Performance |
| P1 (High) | 10 | 3-4 weeks | MEDIUM | Performance + Mobile |
| P2 (Medium) | 37 | 4-5 weeks | MEDIUM | A11y + UX |
| P3 (Low) | 17 | 6+ weeks | LOW | Nice to have |

---

## 🎯 Roadmap Overview

### Phase 1: Critical Fixes (Weeks 1-2)
**Goal:** Resolve major performance and functionality issues

### Phase 2: Mobile & Performance (Weeks 3-6)
**Goal:** Optimize mobile experience and performance bottlenecks

### Phase 3: Accessibility & Polish (Weeks 7-11)
**Goal:** WCAG 2.1 AA compliance and UI/UX refinements

### Phase 4: Advanced Features (Weeks 12+)
**Goal:** Rich text editor, offline support, advanced features

---

## 🔴 Phase 1: Critical Fixes (P0)

**Duration:** 2 weeks
**Team:** 1 Frontend Developer + 1 QA

> **Note:** HTML sanitization is handled by backend - no client-side implementation needed

### 1.1 Performance: Virtual Scrolling

**Component:** `EmailList.tsx`
**Location:** [Lines 442-451](../frontend/components/email/EmailList/EmailList.tsx#L442-L451)

**Problem:**
- Renders ALL emails in DOM (100s or 1000s)
- Causes severe lag with large mailboxes
- Poor mobile performance

**Solution:**
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// Inside EmailList component
const parentRef = React.useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: filteredEmails.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // Estimated row height
  overscan: 5,
});

return (
  <Box ref={parentRef} sx={{ flex: 1, overflow: 'auto' }} onScroll={handleScroll}>
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const email = filteredEmails[virtualRow.index];
        return (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(email, ...)}
          </div>
        );
      })}
    </div>
  </Box>
);
```

**Dependencies:**
- Install: `@tanstack/react-virtual`
- Update: EmailListItem height calculations

**Acceptance Criteria:**
- [ ] Smooth scrolling with 1000+ emails
- [ ] < 100ms render time for visible items
- [ ] No visual glitches during scroll
- [ ] Infinite scroll still works

**Effort:** 5 days
**Priority:** P0 - CRITICAL

---

### 1.2 Mobile: Fullscreen Compose Dialog

**Component:** `ComposeDialog.tsx`
**Location:** [Line 321](../frontend/components/email/ComposeDialog/ComposeDialog.tsx#L321)

**Problem:**
- 80vh dialog on mobile is too small
- Keyboard covers input fields on iOS
- Poor mobile UX

**Solution:**
```tsx
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

<Dialog
  open={open}
  onClose={handleClose}
  maxWidth="md"
  fullWidth
  fullScreen={isMobile} // Fullscreen on mobile
  PaperProps={{
    sx: {
      height: isMobile ? '100%' : '80vh',
      maxHeight: isMobile ? '100%' : 800,
    },
  }}
>
```

**Additional Changes:**
- Add mobile-specific header with back button
- Adjust padding for mobile
- Handle iOS keyboard overlap

**Acceptance Criteria:**
- [ ] Fullscreen on mobile (< 600px)
- [ ] Back button works correctly
- [ ] Keyboard doesn't cover fields
- [ ] Smooth transitions

**Effort:** 2 days
**Priority:** P0 - CRITICAL

---

### 1.3 Functionality: Fix or Remove Drag & Drop

**Component:** `EmailListItem.tsx`
**Location:** [Lines 111-139](../frontend/components/email/EmailList/EmailListItem.tsx#L111-L139)

**Problem:**
```tsx
// Listeners are commented out - feature doesn't work!
// {...listeners}
// {...attributes}
```

**Decision Required:** Fix or Remove?

**Option A - Fix Implementation:**
```tsx
<ListItemButton
  ref={setNodeRef}
  {...listeners}
  {...attributes}
  // ... rest
>
```

**Option B - Remove Dead Code:**
```tsx
// Remove useDraggable hook
// Remove @dnd-kit dependencies from component
// Clean up DndContext from Mailbox
```

**Recommendation:** **REMOVE** - Feature is half-implemented and adds complexity without value. Can be re-added properly in Phase 4 if needed.

**Acceptance Criteria:**
- [ ] Either fully working drag-drop OR code removed
- [ ] No commented-out code
- [ ] DndContext cleaned up if removed
- [ ] Documentation updated

**Effort:** 1 day (remove) or 3 days (fix)
**Priority:** P0 - CRITICAL

---

### 1.4 AI Features: Opt-in Instead of Auto-load

**Component:** `EmailDetail.tsx`
**Location:** [Lines 254-287](../frontend/components/email/EmailDetail/EmailDetail.tsx#L254-L287)

**Problem:**
- Smart replies, categories, summary auto-load on every email open
- Wastes API calls and bandwidth
- Slows down email viewing

**Solution:**
```tsx
// Remove auto-load useEffect

// Add manual trigger buttons
<Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
  {!categories.length && (
    <Button
      size="small"
      startIcon={<Tag size={16} />}
      onClick={loadCategories}
      disabled={loadingCategories}
    >
      Categorize
    </Button>
  )}
  {!smartReplies.length && (
    <Button
      size="small"
      startIcon={<Sparkles size={16} />}
      onClick={loadSmartReplies}
      disabled={loadingSmartReplies}
    >
      Smart Replies
    </Button>
  )}
</Box>
```

**Additional:**
- Add user preference toggle in settings
- Cache AI results per email
- Show loading skeletons

**Acceptance Criteria:**
- [ ] AI features load only on user request
- [ ] Clear CTAs for each feature
- [ ] User preference saved
- [ ] Reduced API calls by ~70%

**Effort:** 3 days
**Priority:** P0 - CRITICAL

---

## 🟡 Phase 2: Mobile & Performance (P1)

**Duration:** 3-4 weeks
**Team:** 1 Frontend Developer

### 2.1 Mobile: Touch Target Sizes

**Components:** `EmailListItem.tsx`, `BulkActionBar.tsx`, `EmailDetail.tsx`

**Problem:**
- Checkboxes: 18px (should be 44px min)
- IconButtons: 20px icons (should be 24px min)
- Avatar: 40px (should be 48px on mobile)

**Solution:**
```tsx
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

<Checkbox
  sx={{
    p: isMobile ? 1.5 : 0,
    '& .MuiSvgIcon-root': { fontSize: isMobile ? 24 : 18 }
  }}
/>

<Avatar
  sx={{
    width: isMobile ? 48 : 40,
    height: isMobile ? 48 : 40,
  }}
/>
```

**Effort:** 3 days
**Priority:** P1

---

### 2.2 Performance: Throttle Scroll Handler

**Component:** `EmailList.tsx`
**Location:** [Lines 278-291](../frontend/components/email/EmailList/EmailList.tsx#L278-L291)

**Problem:**
```tsx
// Called on EVERY scroll event - performance issue
const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
  // ... calculation logic
}, [hasMore, loadingMore, onLoadMore]);
```

**Solution:**
```tsx
import { throttle } from 'lodash-es';

const handleScroll = useCallback(
  throttle((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || loadingMore || !onLoadMore) return;
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (scrollBottom < 200) {
      onLoadMore();
    }
  }, 300), // Throttle to max once per 300ms
  [hasMore, loadingMore, onLoadMore]
);
```

**Effort:** 1 day
**Priority:** P1

---

### 2.3 Mobile: Responsive BulkActionBar

**Component:** `BulkActionBar.tsx`

**Problem:**
- All actions shown on mobile (too crowded)
- Actions overflow on small screens

**Solution:**
```tsx
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

// On mobile, show only essential actions + "More" menu
{isMobile ? (
  <>
    <IconButton onClick={onMarkRead}>
      <MailOpen size={20} />
    </IconButton>
    <IconButton onClick={onDelete}>
      <Trash2 size={20} />
    </IconButton>
    <IconButton onClick={handleMoreClick}>
      <MoreVertical size={20} />
    </IconButton>
  </>
) : (
  // Desktop: show all actions
  <>
    {/* All actions */}
  </>
)}
```

**Effort:** 2 days
**Priority:** P1

---

### 2.4 Functionality: Server-side Label Filtering

**Component:** `Mailbox.tsx`
**Location:** [Lines 386-415](../frontend/components/dashboard/Mailbox.tsx#L386-L415)

**Problem:**
```tsx
// CURRENT: Filters labels CLIENT-SIDE
const filteredEmails = (emailsRes.data.emails || []).filter((email: any) =>
  email.labels && email.labels.includes(labelId)
);
```

**Solution:**
```tsx
// NEW: Backend filtering
const queryParams: EmailListParams = {
  limit: 50,
  page: 1,
  labelId: labelId, // Add label filter to API
  ...
};

const emailsRes = await emailApi.listEmails(queryParams);
setEmails(emailsRes.data.emails as any);
```

**Backend Changes Required:**
- Update `listEmails` endpoint to accept `labelId` param
- Filter at database level

**Effort:** 3 days (2 frontend + 1 backend)
**Priority:** P1

---

### 2.5 Performance: Memoize Email Parsing

**Component:** `EmailListItem.tsx`
**Location:** [Line 107](../frontend/components/email/EmailList/EmailListItem.tsx#L107)

**Problem:**
```tsx
// Called on EVERY render
const fromData = parseEmailFrom(email.from);
```

**Solution:**
```tsx
const fromData = useMemo(() => parseEmailFrom(email.from), [email.from]);
```

**Apply to all components using `parseEmailFrom`:**
- EmailDetail.tsx
- EmailThread.tsx

**Effort:** 0.5 days
**Priority:** P1

---

### 2.6 Performance: Lazy Load AI Features

**Component:** `EmailDetail.tsx`

**Current:** All AI API calls loaded immediately
**New:** Lazy load components

```tsx
const SmartReplies = React.lazy(() => import('./SmartReplies'));
const AISummary = React.lazy(() => import('./AISummary'));
const CategoryTags = React.lazy(() => import('./CategoryTags'));

// Render with Suspense
<Suspense fallback={<Skeleton />}>
  {showSmartReplies && <SmartReplies emailId={email.id} />}
</Suspense>
```

**Effort:** 3 days
**Priority:** P1

---

### 2.7 Mobile: Sidebar Width Optimization

**Component:** `EmailLayout.tsx`
**Location:** [Line 118](../frontend/components/email/EmailLayout.tsx#L118)

**Problem:**
```tsx
'& .MuiDrawer-paper': {
  width: 280, // Too wide for mobile < 360px
}
```

**Solution:**
```tsx
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
const isSmallMobile = useMediaQuery('(max-width:360px)');

'& .MuiDrawer-paper': {
  width: isSmallMobile ? '90vw' : isMobile ? 280 : 240,
}
```

**Effort:** 1 day
**Priority:** P1

---

### 2.8 Mobile: Smart Reply Scrolling

**Component:** `EmailDetail.tsx`
**Location:** [Lines 524-569](../frontend/components/email/EmailDetail/EmailDetail.tsx#L524-L569)

**Problem:**
- Smart replies can overflow on mobile
- No horizontal scroll

**Solution:**
```tsx
<Box
  sx={{
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    maxHeight: isMobile ? '200px' : 'none',
    overflowY: isMobile ? 'auto' : 'visible',
  }}
>
  {smartReplies.map((reply) => (...))}
</Box>
```

**Effort:** 1 day
**Priority:** P1

---

### 2.9 Performance: Debounce Advanced Filters

**Component:** `Mailbox.tsx`
**Location:** [Line 689](../frontend/components/dashboard/Mailbox.tsx#L689)

**Problem:**
```tsx
// Loads data immediately on every filter change
useEffect(() => {
  if (selectedFolderId) {
    loadData();
  }
}, [selectedFolderId, advancedFilters]);
```

**Solution:**
```tsx
import { useDebouncedCallback } from 'use-debounce';

const debouncedLoadData = useDebouncedCallback(
  () => loadData(),
  500 // Wait 500ms after last change
);

useEffect(() => {
  if (selectedFolderId) {
    debouncedLoadData();
  }
}, [selectedFolderId, advancedFilters]);
```

**Effort:** 1 day
**Priority:** P1

---

### 2.10 Functionality: Unified Refresh Logic

**Component:** `Mailbox.tsx`

**Problem:**
- `handleRefresh` and `loadData` do similar things
- Code duplication

**Solution:**
```tsx
// Remove handleRefresh, use loadData directly
const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  await loadData();
  setRefreshing(false);
}, [loadData]);

// Better: Make loadData accept a refresh flag
const loadData = useCallback(async (isRefresh = false) => {
  if (isRefresh) setRefreshing(true);
  else setLoading(true);

  // ... load logic

  if (isRefresh) setRefreshing(false);
  else setLoading(false);
}, [...]);
```

**Effort:** 1 day
**Priority:** P1

---

## ♿ Phase 3: Accessibility & Polish (P2)

**Duration:** 4-5 weeks
**Team:** 1 Frontend Developer + 1 A11y Expert

### 3.1 Global: Focus Indicators

**All Components**

**Problem:**
- No visible focus indicators on interactive elements
- Fails WCAG 2.1 SC 2.4.7

**Solution:**
```tsx
// Add to theme
theme: {
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
        },
      },
    },
  },
}
```

**Apply to:**
- All buttons
- All icon buttons
- Checkboxes
- List items
- Links

**Effort:** 3 days
**Priority:** P2

---

### 3.2 A11y: ARIA Labels

**Multiple Components**

**Missing ARIA labels:**

```tsx
// EmailList.tsx - Search input
<TextField
  aria-label="Search emails"
  placeholder="Search emails..."
/>

// BulkActionBar.tsx - Icon buttons
<IconButton
  aria-label="Mark selected emails as read"
  onClick={onMarkRead}
>
  <MailOpen />
</IconButton>

// EmailDetail.tsx - Smart replies
<Paper
  role="button"
  aria-label={`Use smart reply: ${reply.text}`}
  tabIndex={0}
  onClick={...}
>
```

**All icon buttons need descriptive labels:**
- Mark read/unread
- Star/unstar
- Delete
- Archive
- Forward
- Reply

**Effort:** 3 days
**Priority:** P2

---

### 3.3 A11y: Semantic HTML

**Component:** `EmailList.tsx`, `EmailListItem.tsx`

**Problem:**
```tsx
// Current: Generic Box/ListItemButton
<Box onClick={handleClick}>...</Box>
```

**Solution:**
```tsx
// Proper semantic structure
<article
  role="listitem"
  aria-label={`Email from ${fromData.name}, subject: ${email.subject}`}
>
  <button
    onClick={handleClick}
    aria-pressed={selected}
  >
    {/* Content */}
  </button>
</article>
```

**Effort:** 2 days
**Priority:** P2

---

### 3.4 A11y: Keyboard Navigation Improvements

**All Components**

**Current Issues:**
- Tab order not logical
- No skip links
- Can't navigate emails with arrow keys

**Solution:**
```tsx
// Add skip link
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

// Arrow key navigation in EmailList
const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
  switch (e.key) {
    case 'ArrowDown':
      focusEmail(index + 1);
      break;
    case 'ArrowUp':
      focusEmail(index - 1);
      break;
    case 'Enter':
    case ' ':
      openEmail(index);
      break;
  }
};
```

**Effort:** 4 days
**Priority:** P2

---

### 3.5 A11y: Form Validation Announcements

**Component:** `ComposeDialog.tsx`

**Problem:**
- Validation errors not announced to screen readers
- No aria-invalid on fields

**Solution:**
```tsx
const [errors, setErrors] = useState<Record<string, string>>({});

<TextField
  value={to}
  onChange={handleToChange}
  error={!!errors.to}
  helperText={errors.to}
  aria-invalid={!!errors.to}
  aria-describedby={errors.to ? 'to-error' : undefined}
/>

{errors.to && (
  <span id="to-error" role="alert">
    {errors.to}
  </span>
)}
```

**Effort:** 2 days
**Priority:** P2

---

### 3.6 UI: Checkbox Hover State

**Component:** `EmailList.tsx`, `EmailListItem.tsx`

**Problem:**
- Checkboxes always visible (cluttered UI)
- No hover state

**Solution:**
```tsx
<ListItemButton
  sx={{
    '& .checkbox': {
      opacity: 0,
      transition: 'opacity 0.2s',
    },
    '&:hover .checkbox, &:focus-within .checkbox': {
      opacity: 1,
    },
    '& .checkbox.checked': {
      opacity: 1,
    },
  }}
>
  <Checkbox
    className={`checkbox ${multiSelected ? 'checked' : ''}`}
  />
</ListItemButton>
```

**Effort:** 1 day
**Priority:** P2

---

### 3.7 UI: Loading States

**Multiple Components**

**Problem:**
- Generic loading spinners
- No skeleton screens
- Poor perceived performance

**Solution:**
```tsx
// EmailList loading
{loading ? (
  <Stack spacing={1} sx={{ px: 2, pt: 2 }}>
    {[...Array(8)].map((_, i) => (
      <EmailListItemSkeleton key={i} />
    ))}
  </Stack>
) : (
  // Actual list
)}

// Create dedicated skeleton component
const EmailListItemSkeleton = () => (
  <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
    <Skeleton variant="circular" width={40} height={40} />
    <Box sx={{ flex: 1 }}>
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" width="80%" />
    </Box>
  </Box>
);
```

**Apply to:**
- EmailList
- EmailDetail
- ConversationList
- EmailSidebar

**Effort:** 3 days
**Priority:** P2

---

### 3.8 UI: Empty States

**Multiple Components**

**Problem:**
- Generic "No data" messages
- No actionable guidance

**Solution:**
```tsx
// EmailList empty state
<EmptyState
  icon={<Mail size={64} />}
  title="No emails in this folder"
  description="You're all caught up! New emails will appear here."
  action={
    <Button
      variant="contained"
      startIcon={<RefreshCw />}
      onClick={onRefresh}
    >
      Refresh
    </Button>
  }
/>

// Create reusable EmptyState component
const EmptyState = ({ icon, title, description, action }) => (
  <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
    <Box sx={{ opacity: 0.3, mb: 2 }}>{icon}</Box>
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
      {description}
    </Typography>
    {action}
  </Box>
);
```

**Effort:** 2 days
**Priority:** P2

---

### 3.9 UI: Error States

**All Components**

**Problem:**
- Generic error messages
- No retry mechanism
- Errors in console.log only

**Solution:**
```tsx
const [error, setError] = useState<string | null>(null);

{error && (
  <Alert
    severity="error"
    onClose={() => setError(null)}
    action={
      <Button size="small" onClick={retry}>
        Retry
      </Button>
    }
  >
    {error}
  </Alert>
)}

// Use react-error-boundary for component errors
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => window.location.reload()}
>
  <EmailList />
</ErrorBoundary>
```

**Effort:** 3 days
**Priority:** P2

---

### 3.10 UI: Avatar Color Generation

**Component:** `EmailListItem.tsx`, `EmailDetail.tsx`

**Problem:**
```tsx
// All avatars same color
<Avatar>{fromData.name?.[0]?.toUpperCase()}</Avatar>
```

**Solution:**
```tsx
// Generate consistent color from email
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 50%)`;
};

<Avatar
  sx={{
    bgcolor: stringToColor(fromData.email),
    color: '#fff',
  }}
>
  {fromData.name?.[0]?.toUpperCase()}
</Avatar>
```

**Effort:** 1 day
**Priority:** P2

---

### 3.11 UI: Date Internationalization

**Components:** All using date formatting

**Problem:**
```tsx
// Hardcoded 'en-US'
return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
```

**Solution:**
```tsx
import { useTranslations } from '@/lib/hooks/use-translations';

const { locale } = useTranslations();

return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });

// Or use date-fns with locale
import { format } from 'date-fns';
import { it, enUS } from 'date-fns/locale';

const localeMap = { en: enUS, it };
return format(d, 'MMM d', { locale: localeMap[locale] });
```

**Effort:** 2 days
**Priority:** P2

---

### 3.12 UI: Label Overflow Handling

**Component:** `EmailListItem.tsx`
**Location:** [Lines 237-271](../frontend/components/email/EmailList/EmailListItem.tsx#L237-L271)

**Problem:**
- With many labels, UI becomes cluttered
- Labels can overflow

**Solution:**
```tsx
// Show max 2 labels + count
{email.labels && email.labels.length > 0 && (
  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
    {email.labels.slice(0, 2).map((labelId) => {
      const label = getLabelById(labelId);
      if (!label) return null;
      return (
        <Chip
          key={labelId}
          size="small"
          label={label.name}
          sx={{
            height: 18,
            fontSize: '0.65rem',
            bgcolor: label.color,
            color: '#fff',
            maxWidth: '120px',
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            },
          }}
        />
      );
    })}
    {email.labels.length > 2 && (
      <Tooltip
        title={
          <Stack spacing={0.5}>
            {email.labels.slice(2).map((id) => {
              const label = getLabelById(id);
              return label ? <div key={id}>{label.name}</div> : null;
            })}
          </Stack>
        }
      >
        <Chip
          size="small"
          label={`+${email.labels.length - 2}`}
          sx={{ height: 18, fontSize: '0.65rem' }}
        />
      </Tooltip>
    )}
  </Box>
)}
```

**Effort:** 2 days
**Priority:** P2

---

### 3.13 UI: Sticky Search Bar on Mobile

**Component:** `EmailList.tsx`

**Problem:**
- Search bar scrolls with content
- Hard to search while browsing

**Solution:**
```tsx
<Paper>
  {/* Sticky Toolbar */}
  <Box
    sx={{
      p: 2,
      borderBottom: 1,
      borderColor: 'divider',
      position: 'sticky',
      top: 0,
      bgcolor: 'background.paper',
      zIndex: 10,
    }}
  >
    {/* Search and actions */}
  </Box>

  {/* Scrollable list */}
  <Box sx={{ flex: 1, overflow: 'auto' }}>
    {/* Emails */}
  </Box>
</Paper>
```

**Effort:** 1 day
**Priority:** P2

---

### 3.14 UX: View Mode Toggle Labels

**Component:** `Mailbox.tsx`
**Location:** [Lines 822-842](../frontend/components/dashboard/Mailbox.tsx#L822-L842)

**Problem:**
- Only icons, no text labels
- Users might not understand the difference

**Solution:**
```tsx
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

<ToggleButtonGroup value={viewMode} exclusive onChange={handleViewModeChange}>
  <ToggleButton value="list">
    <Tooltip title={t.dashboard.emailList.emailListView}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <ListIcon size={18} />
        {!isMobile && <Typography variant="caption">List</Typography>}
      </Box>
    </Tooltip>
  </ToggleButton>
  <ToggleButton value="conversation">
    <Tooltip title={t.dashboard.emailList.conversationView}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <MessageSquare size={18} />
        {!isMobile && <Typography variant="caption">Thread</Typography>}
      </Box>
    </Tooltip>
  </ToggleButton>
</ToggleButtonGroup>
```

**Effort:** 1 day
**Priority:** P2

---

### 3.15 Functionality: Email Validation

**Component:** `ComposeDialog.tsx`
**Location:** [Lines 250-254](../frontend/components/email/ComposeDialog/ComposeDialog.tsx#L250-L254)

**Problem:**
```tsx
// No validation, accepts any string
const toEmails = parseEmails(to);
if (toEmails.length === 0) {
  onError?.('Please enter at least one recipient');
  return;
}
```

**Solution:**
```tsx
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

const parseEmails = (emailString: string): { valid: string[]; invalid: string[] } => {
  const emails = emailString.split(',').map(e => e.trim()).filter(e => e);
  const valid: string[] = [];
  const invalid: string[] = [];

  emails.forEach(email => {
    if (validateEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  });

  return { valid, invalid };
};

// In handleSend
const { valid: toEmails, invalid: invalidTo } = parseEmails(to);

if (invalidTo.length > 0) {
  onError?.(`Invalid email addresses: ${invalidTo.join(', ')}`);
  return;
}

if (toEmails.length === 0) {
  onError?.('Please enter at least one recipient');
  return;
}
```

**Add inline validation:**
```tsx
const [emailErrors, setEmailErrors] = useState<string[]>([]);

const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setTo(value);

  // Validate on blur or comma
  const { invalid } = parseEmails(value);
  setEmailErrors(invalid);
};

<TextField
  value={to}
  onChange={handleToChange}
  error={emailErrors.length > 0}
  helperText={emailErrors.length > 0 ? `Invalid: ${emailErrors.join(', ')}` : ''}
/>
```

**Effort:** 2 days
**Priority:** P2

---

## 🟢 Phase 4: Advanced Features (P3)

**Duration:** 6+ weeks
**Team:** 1-2 Frontend Developers

### 4.1 Rich Text Editor

**Component:** `ComposeDialog.tsx`

**Current:** Plain text only
**Goal:** Rich text with formatting

**Options:**
1. **Tiptap** (Recommended)
   - Modern, extensible
   - Good performance
   - Excellent documentation

2. **Quill**
   - Mature, stable
   - Many plugins
   - Heavier bundle

3. **Draft.js**
   - React-native
   - More complex API

**Implementation (Tiptap):**
```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

const EmailEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Image,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <Box>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </Box>
  );
};
```

**Features:**
- Bold, italic, underline
- Lists (ordered/unordered)
- Links
- Images (inline/attachment)
- Mentions (@)
- Emoji picker
- Code blocks

**Effort:** 2 weeks
**Priority:** P3

---

### 4.2 Folder Search in Sidebar

**Component:** `EmailSidebar.tsx`

**Problem:**
- With many accounts/folders, hard to find specific folder
- No search/filter

**Solution:**
```tsx
const [folderSearch, setFolderSearch] = useState('');

const filteredGroups = useMemo(() => {
  if (!folderSearch) return folderGroups;

  const query = folderSearch.toLowerCase();
  return folderGroups.map(group => ({
    ...group,
    folders: group.folders.filter(folder =>
      folder.label.toLowerCase().includes(query) ||
      folder.providerEmail?.toLowerCase().includes(query)
    ),
  })).filter(group => group.folders.length > 0);
}, [folderGroups, folderSearch]);

// UI
<Box sx={{ px: 2, pb: 1 }}>
  <TextField
    size="small"
    placeholder="Search folders..."
    value={folderSearch}
    onChange={(e) => setFolderSearch(e.target.value)}
    InputProps={{
      startAdornment: <Search size={16} />,
    }}
  />
</Box>
```

**Effort:** 2 days
**Priority:** P3

---

### 4.3 Keyboard Shortcuts Panel

**All Components**

**Current:** Limited shortcuts, not documented
**Goal:** Comprehensive shortcuts + help modal

**Shortcuts:**
- `?` - Show shortcuts help
- `c` - Compose new email
- `r` - Reply
- `a` - Reply all
- `f` - Forward
- `e` - Archive
- `#` - Delete
- `s` - Star/unstar
- `j/k` - Next/previous email
- `x` - Select email
- `Shift+u` - Mark unread
- `Esc` - Close detail view

**Implementation:**
```tsx
// Global shortcuts hook
const useGlobalShortcuts = () => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case '?':
          openShortcutsHelp();
          break;
        case 'c':
          openCompose();
          break;
        // ... more shortcuts
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);
};

// Shortcuts help dialog
const ShortcutsDialog = () => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Keyboard Shortcuts</DialogTitle>
    <DialogContent>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell><Kbd>c</Kbd></TableCell>
            <TableCell>Compose new email</TableCell>
          </TableRow>
          {/* ... more shortcuts */}
        </TableBody>
      </Table>
    </DialogContent>
  </Dialog>
);
```

**Effort:** 3 days
**Priority:** P3

---

### 4.4 Offline Support

**All Components**

**Goal:** Read emails offline, sync when back online

**Tech Stack:**
- Service Worker
- IndexedDB (via localforage)
- Sync API

**Implementation:**
```tsx
// Service worker
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Email caching
import localforage from 'localforage';

const emailCache = localforage.createInstance({
  name: 'mailagent-emails',
});

// Store emails locally
const cacheEmails = async (emails: Email[]) => {
  await emailCache.setItem('emails', emails);
};

// Load from cache when offline
const loadCachedEmails = async () => {
  return await emailCache.getItem('emails') || [];
};

// Offline indicator
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

{!isOnline && (
  <Alert severity="warning">
    You're offline. Viewing cached emails.
  </Alert>
)}
```

**Features:**
- Cache last 100 emails per folder
- Queue outgoing emails
- Sync when connection restored
- Offline indicator

**Effort:** 2 weeks
**Priority:** P3

---

### 4.5 Advanced Search Filters

**Component:** `AdvancedSearchDialog.tsx`

**Current:** Basic filters
**Goal:** Gmail-like advanced search

**New Filters:**
- Has attachment of type (PDF, image, etc.)
- Size (larger than X MB)
- Label combinations (AND/OR)
- Folder combinations
- Custom date ranges (last week, month, year)
- Read/unread + starred combinations

**UI Improvements:**
- Filter builder with +/- buttons
- Save search queries
- Recent searches
- Search suggestions

**Implementation:**
```tsx
const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([
  { operator: 'AND', filters: [] }
]);

// Filter builder
<Box>
  {filterGroups.map((group, groupIndex) => (
    <Box key={groupIndex}>
      <FormControl>
        <Select value={group.operator} onChange={...}>
          <MenuItem value="AND">All conditions</MenuItem>
          <MenuItem value="OR">Any condition</MenuItem>
        </Select>
      </FormControl>

      {group.filters.map((filter, filterIndex) => (
        <FilterRow
          key={filterIndex}
          filter={filter}
          onChange={...}
          onRemove={...}
        />
      ))}

      <Button onClick={() => addFilter(groupIndex)}>
        + Add Filter
      </Button>
    </Box>
  ))}
</Box>

// Save searches
const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

<Autocomplete
  options={savedSearches}
  renderInput={(params) => (
    <TextField {...params} label="Saved Searches" />
  )}
  onChange={(_, value) => applySavedSearch(value)}
/>
```

**Effort:** 1 week
**Priority:** P3

---

### 4.6 Email Templates

**Component:** New `EmailTemplates` component

**Goal:** Save and reuse email templates

**Features:**
- Create templates
- Template variables ({{name}}, {{date}})
- Categories (Sales, Support, Personal)
- Quick insert from compose

**Implementation:**
```tsx
// Template model
interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  variables: string[]; // ['name', 'company']
  createdAt: Date;
}

// Template picker in compose
<IconButton onClick={() => setTemplatePickerOpen(true)}>
  <FileText size={18} />
</IconButton>

<Dialog open={templatePickerOpen}>
  <DialogTitle>Email Templates</DialogTitle>
  <DialogContent>
    <List>
      {templates.map((template) => (
        <ListItem
          key={template.id}
          button
          onClick={() => applyTemplate(template)}
        >
          <ListItemText
            primary={template.name}
            secondary={template.category}
          />
        </ListItem>
      ))}
    </List>
  </DialogContent>
</Dialog>

// Apply template with variable replacement
const applyTemplate = (template: EmailTemplate) => {
  let body = template.body;

  // Prompt for variables
  template.variables.forEach((variable) => {
    const value = prompt(`Enter value for {{${variable}}}:`);
    body = body.replace(new RegExp(`{{${variable}}}`, 'g'), value || '');
  });

  setSubject(template.subject);
  setBody(body);
  setTemplatePickerOpen(false);
};
```

**Effort:** 1 week
**Priority:** P3

---

### 4.7 Snooze Emails

**Component:** New snooze functionality

**Goal:** Snooze emails to reappear later

**Options:**
- Later today (6 PM)
- Tomorrow (8 AM)
- This weekend (Saturday 9 AM)
- Next week (Monday 8 AM)
- Custom date/time

**Implementation:**
```tsx
// API endpoint
POST /api/emails/:id/snooze
{
  snoozeUntil: "2025-01-25T08:00:00Z"
}

// UI
<Menu>
  <MenuItem onClick={() => snoozeEmail(email.id, 'today')}>
    <Clock size={16} style={{ marginRight: 8 }} />
    Later today
  </MenuItem>
  <MenuItem onClick={() => snoozeEmail(email.id, 'tomorrow')}>
    Tomorrow morning
  </MenuItem>
  <MenuItem onClick={() => openCustomSnooze()}>
    Pick date & time
  </MenuItem>
</Menu>

// Snoozed folder
{
  id: 'smart:snoozed',
  label: 'Snoozed',
  icon: <Clock />,
  queryOverrides: { isSnoozed: true }
}

// Backend: Cron job to un-snooze
// Every minute, check for emails where snoozeUntil <= now
// Move back to inbox and notify
```

**Effort:** 1 week (including backend)
**Priority:** P3

---

### 4.8 Email Scheduling

**Component:** `ComposeDialog.tsx` enhancement

**Goal:** Schedule emails to send later

**Implementation:**
```tsx
// Add to compose dialog
<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
  <Checkbox
    checked={scheduleEnabled}
    onChange={(e) => setScheduleEnabled(e.target.checked)}
  />
  <Typography variant="body2">Schedule send</Typography>

  {scheduleEnabled && (
    <DateTimePicker
      value={scheduledTime}
      onChange={setScheduledTime}
      minDateTime={new Date()}
    />
  )}
</Box>

// API
POST /api/emails/schedule
{
  ...emailPayload,
  scheduledFor: "2025-01-25T09:00:00Z"
}

// Backend: Cron job to send scheduled emails
// Every minute, check for emails where scheduledFor <= now
// Send via provider API
```

**UI:**
- Quick options: Tomorrow 9 AM, Monday 9 AM
- Custom date/time picker
- Timezone selector
- Scheduled emails folder
- Edit/cancel scheduled emails

**Effort:** 1 week (including backend)
**Priority:** P3

---

### 4.9 Undo Send

**Component:** Email sending flow

**Goal:** Undo email send within 5-30 seconds

**Implementation:**
```tsx
// After clicking send
const handleSend = async () => {
  // Queue email with delay
  const scheduledFor = new Date(Date.now() + undoDelay * 1000);

  const response = await emailApi.scheduleEmail({
    ...payload,
    scheduledFor,
    allowUndo: true,
  });

  // Show undo snackbar
  setSnackbar({
    open: true,
    message: (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <CircularProgress size={16} variant="determinate" value={progress} />
        <span>Sending in {remainingSeconds}s...</span>
        <Button size="small" onClick={() => cancelSend(response.id)}>
          Undo
        </Button>
      </Box>
    ),
    duration: undoDelay * 1000,
  });

  // Start countdown
  const interval = setInterval(() => {
    setRemainingSeconds((s) => s - 1);
    setProgress((p) => p + (100 / undoDelay));
  }, 1000);

  // Cleanup
  setTimeout(() => clearInterval(interval), undoDelay * 1000);
};

// Cancel send
const cancelSend = async (emailId: string) => {
  await emailApi.cancelScheduledEmail(emailId);
  setSnackbar({ ...snackbar, open: false });
};
```

**Settings:**
- Undo delay: 5s, 10s, 15s, 20s, 30s
- Enable/disable per account

**Effort:** 3 days (including backend)
**Priority:** P3

---

### 4.10 Email Analytics Dashboard

**Component:** New `EmailAnalytics` component

**Goal:** Insights into email usage

**Metrics:**
- Emails sent/received per day
- Response time
- Busiest hours
- Top contacts
- Folder distribution
- Attachment statistics
- AI features usage

**Implementation:**
```tsx
// Analytics component
const EmailAnalytics = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });

  const { data, loading } = useEmailAnalytics(dateRange);

  return (
    <Box>
      <Typography variant="h5">Email Analytics</Typography>

      {/* Date range picker */}
      <DateRangePicker
        value={dateRange}
        onChange={setDateRange}
      />

      {/* KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Emails Sent"
            value={data.emailsSent}
            change="+12%"
            icon={<Send />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Emails Received"
            value={data.emailsReceived}
            change="+8%"
            icon={<Inbox />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Avg Response Time"
            value={data.avgResponseTime}
            unit="hours"
            icon={<Clock />}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <StatCard
            title="Unread"
            value={data.unreadCount}
            change="-5%"
            icon={<Mail />}
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Email Volume</Typography>
            <LineChart
              data={data.volumeByDay}
              xField="date"
              yField="count"
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Top Contacts</Typography>
            <List>
              {data.topContacts.map((contact) => (
                <ListItem key={contact.email}>
                  <ListItemAvatar>
                    <Avatar>{contact.name[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={contact.name}
                    secondary={`${contact.count} emails`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
```

**Charts:**
- Email volume line chart (sent/received over time)
- Folder distribution pie chart
- Heatmap of busiest hours
- Response time histogram

**Effort:** 2 weeks (including backend analytics)
**Priority:** P3

---

### 4.11 Smart Compose (AI)

**Component:** `ComposeDialog.tsx` enhancement

**Goal:** AI-assisted email writing

**Features:**
1. **Auto-complete sentences**
   - Type and get suggestions (like Gmail Smart Compose)
   - Tab to accept

2. **Tone adjustment**
   - Rewrite in formal/casual/friendly tone
   - Shorten/expand text

3. **Grammar & spelling**
   - Real-time corrections
   - Style suggestions

4. **Reply suggestions**
   - Analyze received email
   - Generate contextual replies

**Implementation:**
```tsx
// Auto-complete
const [suggestion, setSuggestion] = useState('');

useEffect(() => {
  const debounced = debounce(async () => {
    if (body.length > 10) {
      const response = await aiApi.getCompletionSuggestion(body);
      setSuggestion(response.suggestion);
    }
  }, 500);

  debounced();
  return () => debounced.cancel();
}, [body]);

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Tab' && suggestion) {
    e.preventDefault();
    setBody(body + suggestion);
    setSuggestion('');
  }
};

// Tone adjustment
<Menu>
  <MenuItem onClick={() => rewriteTone('formal')}>
    Make more formal
  </MenuItem>
  <MenuItem onClick={() => rewriteTone('casual')}>
    Make more casual
  </MenuItem>
  <MenuItem onClick={() => rewriteTone('friendly')}>
    Make more friendly
  </MenuItem>
  <Divider />
  <MenuItem onClick={() => adjustLength('shorter')}>
    Make shorter
  </MenuItem>
  <MenuItem onClick={() => adjustLength('longer')}>
    Make longer
  </MenuItem>
</Menu>

const rewriteTone = async (tone: string) => {
  setLoading(true);
  const response = await aiApi.rewriteText(body, { tone });
  setBody(response.rewritten);
  setLoading(false);
};
```

**Effort:** 2-3 weeks (including backend AI integration)
**Priority:** P3

---

### 4.12 Multi-Account Compose

**Component:** `ComposeDialog.tsx`

**Goal:** Choose sending account in compose dialog

**Current:** Uses default provider only
**New:** Let user select

**Implementation:**
```tsx
const [selectedProvider, setSelectedProvider] = useState(defaultProviderId);
const { data: providers } = useProviders();

// Provider selector
<Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Typography variant="body2" sx={{ minWidth: 40, fontWeight: 500 }}>
      From:
    </Typography>
    <Select
      size="small"
      value={selectedProvider}
      onChange={(e) => setSelectedProvider(e.target.value)}
      fullWidth
    >
      {providers.map((provider) => (
        <MenuItem key={provider.id} value={provider.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {provider.providerType === 'google' ? <Gmail /> : <Outlook />}
            <Typography variant="body2">{provider.email}</Typography>
            {provider.isDefault && (
              <Chip label="Default" size="small" />
            )}
          </Box>
        </MenuItem>
      ))}
    </Select>
  </Box>
</Box>
```

**Features:**
- Remember last used per recipient
- Show signature per account
- Different send quotas per account

**Effort:** 2 days
**Priority:** P3

---

### 4.13 Conversation Grouping Improvements

**Component:** `ConversationList.tsx`, `EmailThread.tsx`

**Goal:** Better thread visualization and management

**Improvements:**
1. **Thread visualization**
   - Show thread depth with indentation
   - Collapse/expand sub-threads
   - Visual lines connecting messages

2. **Thread actions**
   - Mute thread
   - Mark entire thread read/unread
   - Archive thread
   - Snooze thread

3. **Thread search**
   - Search within thread
   - Jump to message

**Implementation:**
```tsx
// Thread tree visualization
const ThreadTree = ({ emails }) => {
  return (
    <Box>
      {emails.map((email, index) => (
        <Box
          key={email.id}
          sx={{
            ml: email.depth * 4,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: -16,
              top: 0,
              bottom: 0,
              width: 2,
              bgcolor: 'divider',
            },
          }}
        >
          <ThreadMessage email={email} />
          {email.replies && (
            <ThreadTree emails={email.replies} />
          )}
        </Box>
      ))}
    </Box>
  );
};

// Thread actions
<SpeedDial>
  <SpeedDialAction
    icon={<VolumeX />}
    tooltipTitle="Mute thread"
    onClick={() => muteThread(threadId)}
  />
  <SpeedDialAction
    icon={<Archive />}
    tooltipTitle="Archive thread"
    onClick={() => archiveThread(threadId)}
  />
</SpeedDial>
```

**Effort:** 1 week
**Priority:** P3

---

### 4.14 Email Import/Export

**Component:** New feature

**Goal:** Import/export emails for backup

**Formats:**
- EML (single emails)
- MBOX (multiple emails)
- CSV (metadata)
- PDF (formatted export)

**Implementation:**
```tsx
// Export dialog
<Dialog open={exportDialogOpen}>
  <DialogTitle>Export Emails</DialogTitle>
  <DialogContent>
    <FormControl fullWidth>
      <FormLabel>Export format</FormLabel>
      <RadioGroup value={exportFormat} onChange={...}>
        <FormControlLabel value="eml" control={<Radio />} label="EML (individual files)" />
        <FormControlLabel value="mbox" control={<Radio />} label="MBOX (single archive)" />
        <FormControlLabel value="csv" control={<Radio />} label="CSV (metadata only)" />
        <FormControlLabel value="pdf" control={<Radio />} label="PDF (formatted)" />
      </RadioGroup>
    </FormControl>

    <FormControl fullWidth sx={{ mt: 2 }}>
      <FormLabel>Date range</FormLabel>
      <DateRangePicker
        value={dateRange}
        onChange={setDateRange}
      />
    </FormControl>

    <FormControl fullWidth sx={{ mt: 2 }}>
      <FormLabel>Folder</FormLabel>
      <Select value={selectedFolder} onChange={...}>
        {folders.map((folder) => (
          <MenuItem value={folder.id}>{folder.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  </DialogContent>
  <DialogActions>
    <Button onClick={onClose}>Cancel</Button>
    <Button variant="contained" onClick={handleExport}>
      Export
    </Button>
  </DialogActions>
</Dialog>

// Export function
const handleExport = async () => {
  const params = {
    format: exportFormat,
    dateRange,
    folderId: selectedFolder,
  };

  const response = await emailApi.exportEmails(params);

  // Download file
  const blob = new Blob([response.data], { type: response.contentType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = response.filename;
  a.click();
};
```

**Effort:** 1 week (including backend)
**Priority:** P3

---

### 4.15 Email Rules & Filters

**Component:** New `EmailRules` settings

**Goal:** Automate email organization

**Rule types:**
1. **Move to folder**
   - If from X, move to folder Y

2. **Apply label**
   - If subject contains X, add label Y

3. **Mark as read**
   - If from X, mark as read

4. **Forward**
   - If to X, forward to Y

5. **Delete**
   - If spam score > X, delete

**Implementation:**
```tsx
interface EmailRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

interface RuleCondition {
  field: 'from' | 'to' | 'subject' | 'body' | 'hasAttachments';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex';
  value: string;
}

interface RuleAction {
  type: 'move' | 'label' | 'markRead' | 'star' | 'forward' | 'delete';
  value: string;
}

// Rule builder
<Box>
  <Typography variant="h6">Conditions</Typography>
  {rule.conditions.map((condition, index) => (
    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
      <Select value={condition.field} onChange={...}>
        <MenuItem value="from">From</MenuItem>
        <MenuItem value="to">To</MenuItem>
        <MenuItem value="subject">Subject</MenuItem>
        <MenuItem value="body">Body</MenuItem>
      </Select>

      <Select value={condition.operator} onChange={...}>
        <MenuItem value="contains">contains</MenuItem>
        <MenuItem value="equals">equals</MenuItem>
        <MenuItem value="startsWith">starts with</MenuItem>
      </Select>

      <TextField
        value={condition.value}
        onChange={...}
        placeholder="value"
      />

      <IconButton onClick={() => removeCondition(index)}>
        <X size={16} />
      </IconButton>
    </Box>
  ))}
  <Button onClick={addCondition}>+ Add Condition</Button>

  <Typography variant="h6" sx={{ mt: 2 }}>Actions</Typography>
  {rule.actions.map((action, index) => (
    <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
      <Select value={action.type} onChange={...}>
        <MenuItem value="move">Move to folder</MenuItem>
        <MenuItem value="label">Add label</MenuItem>
        <MenuItem value="markRead">Mark as read</MenuItem>
        <MenuItem value="star">Star</MenuItem>
        <MenuItem value="forward">Forward to</MenuItem>
        <MenuItem value="delete">Delete</MenuItem>
      </Select>

      {['move', 'label', 'forward'].includes(action.type) && (
        <TextField
          value={action.value}
          onChange={...}
          placeholder={`${action.type} value`}
        />
      )}

      <IconButton onClick={() => removeAction(index)}>
        <X size={16} />
      </IconButton>
    </Box>
  ))}
  <Button onClick={addAction}>+ Add Action</Button>
</Box>
```

**Backend:**
- Store rules in database
- Apply rules on email sync
- Rule execution order by priority
- Logs for debugging

**Effort:** 2 weeks (including backend)
**Priority:** P3

---

## 📊 Success Metrics & KPIs

### Phase 1 Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| List render time (1000 emails) | 3000ms | <200ms | Performance profiling |
| Mobile compose usability | 2.5/5 | 4.5/5 | User testing |
| API calls on email open | 3 | 0-1 | Network monitoring |
| Drag & drop functionality | Broken | Fixed or Removed | Manual testing |

### Phase 2 Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Mobile touch success rate | 75% | 95% | User testing |
| Scroll FPS | 30 | 60 | Performance profiling |
| Server-side filter speed | N/A | <500ms | API monitoring |
| Component re-renders | High | -50% | React DevTools |

### Phase 3 Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| WCAG 2.1 compliance | Fail | AA | Axe audit |
| Keyboard nav coverage | 30% | 100% | Manual testing |
| Focus indicator visibility | 0% | 100% | Visual inspection |
| Screen reader compatibility | Poor | Good | NVDA/JAWS testing |

### Phase 4 Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Rich text adoption | N/A | 60% | Analytics |
| Template usage | N/A | 40% | Analytics |
| Offline email access | N/A | 100% | Testing |
| Keyboard shortcut usage | N/A | 30% | Analytics |

---

## 🔄 Testing Strategy

### Unit Tests
- **Coverage Target:** 80%+
- **Focus Areas:**
  - Utility functions (parseEmail, formatDate, etc.)
  - Hooks (useEmailActions, useKeyboardNavigation)
  - Store logic (email-store)

```bash
# Test commands
npm run test:unit
npm run test:coverage
```

### Integration Tests
- **Tool:** React Testing Library
- **Focus Areas:**
  - Email list interactions
  - Compose flow
  - Bulk actions
  - Search functionality

```tsx
// Example test
describe('EmailList', () => {
  it('should select and delete multiple emails', async () => {
    const { getByRole, getAllByRole } = render(<EmailList emails={mockEmails} />);

    // Select first 2 emails
    const checkboxes = getAllByRole('checkbox');
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[1]);

    // Click delete
    const deleteButton = getByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);

    // Verify API called
    expect(emailApi.bulkDelete).toHaveBeenCalledWith(['email1', 'email2']);
  });
});
```

### E2E Tests
- **Tool:** Playwright
- **Focus Areas:**
  - Critical user journeys
  - Mobile flows
  - Cross-browser compatibility

```typescript
// Example E2E test
test('compose and send email', async ({ page }) => {
  await page.goto('/dashboard/email');

  // Click compose
  await page.click('[aria-label="Compose"]');

  // Fill form
  await page.fill('[name="to"]', 'test@example.com');
  await page.fill('[name="subject"]', 'Test Email');
  await page.fill('[name="body"]', 'Test content');

  // Send
  await page.click('button:has-text("Send")');

  // Verify success
  await expect(page.locator('text=Email sent')).toBeVisible();
});
```

### Accessibility Tests
- **Tool:** axe-core + jest-axe
- **Coverage:** All components

```tsx
describe('EmailDetail accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<EmailDetail email={mockEmail} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### Performance Tests
- **Tool:** Lighthouse CI
- **Targets:**
  - Performance: >90
  - Accessibility: 100
  - Best Practices: >90

```yaml
# lighthouserc.yml
ci:
  collect:
    url:
      - http://localhost:3000/dashboard/email
    numberOfRuns: 3
  assert:
    assertions:
      performance: ['error', { minScore: 0.9 }]
      accessibility: ['error', { minScore: 1.0 }]
```

---

## 🚀 Deployment Strategy

### Phase Rollout

Each phase will be deployed progressively:

1. **Development**
   - Feature branch
   - PR review
   - Unit tests pass

2. **Staging**
   - Merge to develop
   - Integration tests
   - QA approval

3. **Beta**
   - 10% of users
   - Monitor metrics
   - Collect feedback

4. **Production**
   - Gradual rollout: 25% → 50% → 100%
   - Monitor errors
   - Rollback plan ready

### Feature Flags

Use feature flags for gradual rollout:

```tsx
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const VirtualizedEmailList = () => {
  const virtualScrollEnabled = useFeatureFlag('virtual-scroll');

  if (virtualScrollEnabled) {
    return <VirtualEmailList />;
  }

  return <StandardEmailList />;
};
```

### Monitoring

- **Error tracking:** Sentry
- **Analytics:** PostHog / Amplitude
- **Performance:** Web Vitals
- **User feedback:** In-app feedback widget

---

## 📝 Documentation Updates

### User Documentation
- Update user guide with new features
- Create video tutorials for complex features
- Update FAQ

### Developer Documentation
- Component API documentation
- Architecture decision records (ADRs)
- Code examples and patterns

### Changelog
Maintain detailed changelog:

```markdown
# Changelog

## [2.0.0] - Phase 1 - 2025-02-15

### Security
- Fixed XSS vulnerability in email body rendering

### Performance
- Implemented virtual scrolling for email list
- Reduced initial render time by 90%

### Mobile
- Compose dialog now fullscreen on mobile
- Improved touch target sizes

### Changed
- AI features now opt-in instead of auto-load
- Removed non-functional drag-and-drop code
```

---

## 👥 Team & Resources

### Required Team

**Phase 1-2:**
- 1 Senior Frontend Developer (full-time)
- 1 QA Engineer (part-time)
- 1 Designer (consulting)

**Phase 3:**
- 1 Senior Frontend Developer (full-time)
- 1 Accessibility Expert (consulting)
- 1 QA Engineer (part-time)

**Phase 4:**
- 1-2 Frontend Developers
- 1 Backend Developer (for integrations)
- 1 QA Engineer

### External Dependencies

- **DOMPurify**: HTML sanitization
- **@tanstack/react-virtual**: Virtual scrolling
- **Tiptap**: Rich text editor (Phase 4)
- **date-fns**: Date formatting
- **react-error-boundary**: Error handling

### Training Needs

- Accessibility best practices
- Performance profiling tools
- Virtual scrolling patterns
- Security awareness

---

## 🎯 Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Virtual scroll breaks existing functionality | Medium | High | Extensive testing, feature flag, gradual rollout |
| Performance regressions | Low | High | Lighthouse CI, performance budgets |
| Accessibility failures | Medium | Medium | Axe audits, manual testing, expert review |
| Breaking changes in dependencies | Low | Medium | Lock versions, test updates in staging |
| User adoption of new features | Medium | Low | User education, gradual rollout, feedback loop |
| Backend API changes needed | Medium | High | Coordinate with backend team, versioned APIs |

---

## 📈 Timeline Summary

```
Phase 1: Critical Fixes
├─ Week 1-2: Performance, Mobile, Functionality fixes
└─ Deliverable: Fast, mobile-friendly email client

Phase 2: Mobile & Performance
├─ Week 3-6: Touch targets, throttling, server-side filtering
└─ Deliverable: Optimized mobile experience

Phase 3: Accessibility & Polish
├─ Week 7-11: A11y compliance, UI/UX refinements
└─ Deliverable: WCAG 2.1 AA compliant, polished UI

Phase 4: Advanced Features
├─ Week 12+: Rich text, offline, templates, analytics
└─ Deliverable: Feature-rich email client
```

**Total Estimated Duration:** 14-18 weeks (3.5-4.5 months)

---

## ✅ Acceptance Criteria

### Phase 1 Complete When:
- [ ] Email list renders 1000+ emails smoothly (virtual scrolling)
- [ ] Mobile compose is fullscreen and usable
- [ ] Drag & drop either fixed or removed (no dead code)
- [ ] AI features only load on user action
- [ ] All P0 issues resolved

### Phase 2 Complete When:
- [ ] Touch targets meet 44x44px minimum
- [ ] Scroll performance at 60 FPS
- [ ] Server-side filtering implemented
- [ ] Mobile UX score >4/5
- [ ] All P1 issues resolved

### Phase 3 Complete When:
- [ ] WCAG 2.1 AA compliance achieved
- [ ] Axe audit passes with 0 violations
- [ ] 100% keyboard navigation coverage
- [ ] Screen reader compatible
- [ ] All P2 issues resolved

### Phase 4 Complete When:
- [ ] Rich text editor functional
- [ ] Offline support working
- [ ] Templates & advanced features implemented
- [ ] User satisfaction >4.5/5
- [ ] All P3 features delivered

---

## 🔗 Related Documents

- [Security Audit Report](./security-audit.md)
- [Performance Baseline](./performance-baseline.md)
- [Accessibility Audit](./accessibility-audit.md)
- [User Research Findings](./user-research.md)
- [API Documentation](./api-docs.md)

---

## 📧 Contact & Support

**Project Owner:** Development Team
**Technical Lead:** [Name]
**Product Manager:** [Name]

For questions or concerns, please reach out via:
- Slack: #mailagent-frontend
- Email: dev@mailagent.com
- GitHub Issues: https://github.com/chetto1983/MailAgent/issues

---

**Last Updated:** 2025-01-21
**Next Review:** 2025-02-01
**Status:** Draft - Awaiting Approval
