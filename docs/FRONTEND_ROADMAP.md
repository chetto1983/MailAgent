# MailAgent Frontend - Implementation Roadmap

**Version**: 2.0.0
**Date**: 2025-11-20
**Status**: 🚧 **IN DEVELOPMENT**
**Inspiration**: [Mail-0/Zero](https://github.com/Mail-0/Zero)

---

## 📋 Executive Summary

The MailAgent frontend is a **Next.js 16 + React 19** application building a modern, AI-powered email management platform. This roadmap defines the implementation strategy for integrating with the **production-ready backend** and delivering a complete user experience inspired by **Mail-0/Zero**.

### Current Stack

- **Framework**: Next.js 16.0.3, React 19.2.0
- **Language**: TypeScript 5.9.3
- **UI**: Material-UI 7.3.5, Tailwind CSS 4.1.17, Shadcn UI
- **State**: Zustand 5.0.8
- **Real-time**: Socket.io-client 4.8.1
- **Auth**: NextAuth 4.24.13

### Backend Integration Status

The backend provides **100% production-ready APIs** for:
- ✅ Authentication (JWT, MFA, OAuth2)
- ✅ Email Sync (Gmail, Microsoft, IMAP)
- ✅ Calendar Sync (Google Calendar, Outlook Calendar)
- ✅ Contacts Sync (Google Contacts, Outlook Contacts, CardDAV)
- ✅ AI Features (RAG, Embeddings, Mistral LLM)
- ✅ Real-time WebSocket Events
- ✅ Attachments On-Demand
- ✅ Webhooks (Gmail Push, Microsoft Graph)

---

## 🎯 Architecture Analysis

### Current Implementation

```
┌─────────────────────────────────────────┐
│  Next.js Pages Router                    │
│  ├─ /auth/*        (Login, Register)   │
│  └─ /dashboard/*   (Email, Calendar)   │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  Zustand Stores (6 stores)              │
│  ├─ auth-store       (JWT tokens)      │
│  ├─ email-store      (Emails + filters)│
│  ├─ calendar-store   (Events)          │
│  ├─ contact-store    (Contacts)        │
│  ├─ folders-store    (Folder counts)   │
│  └─ sync-store       (Sync status)     │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  API Client (Axios + Socket.io)         │
│  ├─ HTTP: /emails, /calendar, /contacts│
│  └─ WS: Real-time events               │
└─────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────┐
│  NestJS Backend (Production Ready)      │
└─────────────────────────────────────────┘
```

### Strengths

1. ✅ **Type-Safe**: Full TypeScript with strict mode
2. ✅ **Real-Time Ready**: Socket.io integration for live updates
3. ✅ **Modular**: Clean separation of concerns
4. ✅ **Multi-Provider**: Supports Gmail, Outlook, IMAP seamlessly
5. ✅ **Security**: DOMPurify for XSS protection, JWT auth

### Weaknesses

1. ❌ **Limited Testing**: Only 1 test file (theme-toggle.spec.tsx)
2. ⚠️ **Optimistic Updates Without Rollback**: API failures don't revert local state
3. ⚠️ **JWT in localStorage**: Should use HTTP-only cookies
4. ❌ **No Error Boundaries**: React error boundaries missing
5. ❌ **No Code Splitting**: Beyond Next.js automatic splitting

---

## 🎨 Inspiration from Mail-0/Zero

### Key Takeaways

**Mail-0/Zero** is an open-source, AI-driven email client with:
- **Hybrid Storage**: PostgreSQL + Cloudflare Durable Objects
- **Better Auth**: Modern authentication framework
- **Monorepo Structure**: pnpm workspace with apps + packages
- **Community i18n**: Crowdin integration

### Applicable Patterns

1. **Better Error Handling**: Implement React error boundaries at route level
2. **Improved Caching**: Use Tanstack Query for server state management (optional future enhancement)
3. **Progressive Enhancement**: Offline support with service workers
4. **Community Features**: Multi-language support (already started with i18n)

---

## 📊 Backend API Mapping

### Available Endpoints (Production Ready)

#### Authentication
```typescript
POST /auth/register                 // ✅ Implemented
POST /auth/login                    // ✅ Implemented
POST /auth/send-otp                 // ✅ Implemented (MFA)
POST /auth/verify-otp               // ✅ Implemented
POST /auth/request-password-reset   // ✅ Implemented
POST /auth/reset-password           // ✅ Implemented
POST /auth/logout                   // ✅ Implemented
```

#### Provider Management
```typescript
GET  /providers                       // ✅ Implemented
GET  /providers/google/auth-url       // ✅ Implemented
GET  /providers/google/callback       // ✅ Implemented
GET  /providers/microsoft/auth-url    // ✅ Implemented
GET  /providers/microsoft/callback    // ✅ Implemented
POST /providers/imap                  // ✅ Implemented
GET  /providers/:id/aliases           // ✅ Implemented
PUT  /providers/:id/alias             // ✅ Implemented
DELETE /providers/:id                 // ✅ Implemented
```

#### Email Operations
```typescript
GET    /emails                         // ✅ Implemented (pagination, filters)
GET    /emails/:id                     // ✅ Implemented
GET    /emails/stats                   // ✅ Implemented
GET    /emails/search                  // ✅ Implemented
PATCH  /emails/:id                     // ✅ Implemented (mark read, star, etc.)
DELETE /emails/:id                     // ✅ Implemented
PATCH  /emails/bulk/read               // ✅ Implemented
POST   /emails/send                    // ✅ Implemented
POST   /emails/:id/reply               // ✅ Implemented
POST   /emails/:id/forward             // ✅ Implemented
POST   /emails/drafts                  // ✅ Implemented (auto-save)
GET    /emails/drafts/:id              // ✅ Implemented
DELETE /emails/drafts/:id              // ✅ Implemented
GET    /emails/:id/attachments/:aid/download  // ✅ Implemented (on-demand)
POST   /email-sync/sync/:providerId    // ✅ Implemented (manual trigger)
GET    /email-sync/status              // ✅ Implemented
GET    /emails/conversations           // ✅ Implemented
GET    /emails/thread/:threadId        // ✅ Implemented
POST   /emails/:id/fetch-archived      // ✅ Implemented (retention)
GET    /emails/retention/stats         // ✅ Implemented
POST   /emails/retention/run           // ✅ Implemented
```

#### Calendar Operations
```typescript
GET    /calendar/events                // ✅ Implemented
POST   /calendar/events                // ✅ Implemented
GET    /calendar/events/:id            // ✅ Implemented
PATCH  /calendar/events/:id            // ✅ Implemented
DELETE /calendar/events/:id            // ✅ Implemented
POST   /calendar/sync/:providerId      // ✅ Implemented
```

#### Contacts Operations
```typescript
GET    /contacts                       // ✅ Implemented
POST   /contacts                       // ✅ Implemented
GET    /contacts/:id                   // ✅ Implemented
PATCH  /contacts/:id                   // ✅ Implemented
DELETE /contacts/:id                   // ✅ Implemented
POST   /contacts/sync/:providerId      // ✅ Implemented
```

#### AI Features
```typescript
GET    /ai/chat/sessions               // ✅ Implemented
POST   /ai/chat/sessions               // ✅ Implemented
GET    /ai/chat/sessions/:id           // ✅ Implemented
DELETE /ai/chat/sessions/:id           // ✅ Implemented
POST   /ai/agent                       // ✅ Implemented (send message)
POST   /ai/summarize/:emailId          // ✅ Implemented
POST   /ai/smart-reply/:emailId        // ✅ Implemented
POST   /ai/categorize/:emailId         // ✅ Implemented
POST   /ai/memory/search               // ✅ Implemented (semantic)
```

#### Analytics
```typescript
GET /analytics/emails                  // ✅ Implemented
```

#### WebSocket Events (Real-time)
```typescript
// Email Events
email:new
email:update
email:delete
email:unread_count_update
email:folder_counts_update
email:thread_update

// Calendar Events
calendar:event_new
calendar:event_update
calendar:event_delete

// Contact Events
contact:new
contact:update
contact:delete

// Sync Events
sync:status

// AI Events
ai:classification_done
ai:task_suggest
ai:insight

// HITL Events
hitl:approval_required
hitl:approval_granted
hitl:approval_denied
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation & Polish (2 weeks) - **PRIORITY**

#### Week 1: Error Handling & Recovery

**Goal**: Make the frontend resilient to API failures

- [ ] **Add React Error Boundaries**
  - Create `ErrorBoundary` component for route-level error catching
  - Add fallback UI for crashed components
  - Implement error logging to console + optional Sentry integration
  - **Files**: `components/ErrorBoundary.tsx`, `pages/_app.tsx`

- [ ] **Implement Optimistic Update Rollback**
  - Update `use-email-actions.ts` to revert state on API failure
  - Add toast notifications for errors (using Material-UI Snackbar)
  - Store previous state before optimistic updates
  - **Files**: `hooks/use-email-actions.ts`

- [ ] **Add Global Error Handler**
  - Axios interceptor for common errors (401, 403, 500)
  - Redirect to login on token expiration
  - User-friendly error messages
  - **Files**: `lib/api-client.ts`

#### Week 2: Performance & UX

**Goal**: Improve loading states and perceived performance

- [ ] **Implement Skeleton Loaders**
  - Replace CircularProgress with skeleton screens
  - Add skeleton for email list, calendar, contacts
  - **Files**: `components/ui/skeleton.tsx`, update all dashboard components

- [ ] **Add Infinite Scroll to Email List**
  - Complete TODO in `Mailbox.tsx` (line 227)
  - Wire up `loadMore()` with pagination state
  - Add "Load More" button as fallback
  - **Files**: `components/dashboard/Mailbox.tsx`

- [ ] **Optimize Bundle Size**
  - Lazy load dashboard components
  - Code split by route
  - Analyze bundle with Next.js analyzer
  - **Files**: Update `pages/dashboard/*` with dynamic imports

- [ ] **Install Missing Dependencies**
  - Add `react-virtualized-auto-sizer`
  - Verify all package.json dependencies are installed
  - **Files**: `package.json`

- [x] **Custom Scrollbar UX** ✅ **COMPLETED 2025-11-22**
  - Added custom styled scrollbars (8px, themed) ✅
  - Applied to folder list in EmailSidebar ✅
  - Applied to email body in ThreadDisplay ✅
  - Fixed parent container overflow issues in EmailLayout ✅
  - **Files**: `EmailSidebar.tsx`, `ThreadDisplay.tsx`, `EmailLayout.tsx` ✅

---

### Phase 2: Complete Feature Implementation (3 weeks)

#### Week 3: Email Advanced Features

**Goal**: Leverage all backend email capabilities

- [x] **HTML Email Rendering** ✅ **COMPLETED 2025-11-22**
  - Fixed API to return `bodyHtml`, `bodyText` fields ✅
  - Emails now render with HTML formatting and images ✅
  - DOMPurify sanitization maintained for XSS protection ✅
  - **Files**: `emails.service.ts` (backend), `ThreadDisplay.tsx` (frontend) ✅

- [ ] **Implement Email Labels/Tags**
  - Add label UI in email detail
  - Support multi-select labels
  - Sync with Gmail labels
  - **API**: `PATCH /emails/:id` (update labels)
  - **Files**: `components/email/EmailDetail/`, `stores/email-store.ts`

- [ ] **Add Thread View**
  - Group emails by conversation thread
  - Expand/collapse threads
  - **API**: `GET /emails/thread/:threadId`
  - **Files**: `components/email/EmailList/`, new `EmailThread.tsx`

- [ ] **Implement Email Search Filters**
  - Add advanced filter UI (from, to, has:attachment, etc.)
  - Date range picker
  - Size filter
  - **API**: `GET /emails/search` (already supports filters)
  - **Files**: `components/email/EmailSidebar/`, `stores/email-store.ts`

- [ ] **Add Attachment Preview**
  - Show image attachments inline
  - PDF preview in modal
  - Download all attachments as ZIP
  - **API**: `GET /emails/:id/attachments/:aid/download`
  - **Files**: `components/email/EmailDetail/AttachmentPreview.tsx`

#### Week 4: Calendar & Contacts Enhancement

**Goal**: Match backend calendar/contacts features

- [ ] **Calendar Time Zone Support**
  - Detect user timezone
  - Display events in local time
  - Allow manual timezone override
  - **Files**: `components/dashboard/Calendar.tsx`

- [ ] **Add Recurring Events UI**
  - Recurrence rule editor (daily, weekly, monthly)
  - Display recurring event series
  - Edit single occurrence vs. series
  - **API**: `POST /calendar/events` (already supports recurrence)
  - **Files**: `components/dashboard/Calendar.tsx`

- [ ] **Contact Groups Management**
  - Create/edit/delete contact groups
  - Assign contacts to groups
  - Filter contacts by group
  - **Files**: `components/dashboard/Contacts.tsx`, `stores/contact-store.ts`

- [ ] **Contact Merge**
  - Detect duplicate contacts
  - Merge UI with conflict resolution
  - **API**: Need backend endpoint (feature request)
  - **Files**: `components/dashboard/Contacts.tsx`

#### Week 5: AI Integration Enhancements

**Goal**: Expose all AI features in UI

- [ ] **AI-Powered Email Categorization**
  - Auto-categorize button in email detail
  - Show suggested category
  - Apply category on confirmation
  - **API**: `POST /ai/categorize/:emailId`
  - **Files**: `components/email/EmailDetail/`

- [ ] **Smart Reply Suggestions**
  - Show 3 suggested replies
  - Insert suggestion into compose
  - Customize before sending
  - **API**: `POST /ai/smart-reply/:emailId`
  - **Files**: `components/email/EmailDetail/`

- [ ] **Email Summarization**
  - "Summarize" button in email detail
  - Show summary in expandable section
  - Cache summaries locally
  - **API**: `POST /ai/summarize/:emailId`
  - **Files**: `components/email/EmailDetail/`

- [ ] **Semantic Search**
  - "Smart Search" input in sidebar
  - Natural language queries ("emails about project deadline")
  - Powered by embeddings + RAG
  - **API**: `POST /ai/memory/search`
  - **Files**: `components/email/EmailSidebar/`

---

### Phase 3: Advanced Features (2 weeks)

#### Week 6: Real-Time Enhancements

**Goal**: Maximize real-time capabilities

- [ ] **Sync Status Indicator**
  - Show real-time sync progress
  - Provider-specific sync status
  - Error indicators
  - **WS**: `sync:status` event
  - **Files**: `components/layout/Header.tsx`, `stores/sync-store.ts`

- [x] **Live Folder Counts** ✅ **COMPLETED 2025-11-22**
  - Update unread counts via WebSocket ✅
  - Animate count changes ✅
  - **WS**: `email:folder_counts_update` ✅
  - **Files**: `components/email/EmailSidebar/`, `stores/folders-store.ts` ✅
  - **Backend**: Added `updateFolderCounts()` to all email operations ✅
  - **Optimization**: Events only emitted for active tenants ✅
  - **Bug Fix**: Fixed store key mismatch (`${providerId}:${folderId}`) ✅

- [ ] **Desktop Notifications**
  - Request notification permission
  - Show notification on new email
  - Click to open email
  - **WS**: `email:new` event
  - **Files**: `hooks/use-websocket.ts`

#### Week 7: User Settings & Preferences

**Goal**: Persist user settings to backend

- [ ] **Backend Settings API Integration**
  - Replace localStorage with API calls
  - Sync settings across devices
  - **API**: Need `GET/PUT /users/settings` endpoint
  - **Files**: `components/dashboard/Settings.tsx`, `lib/api/users.ts`

- [ ] **Email Signature**
  - Rich text signature editor
  - Per-provider signatures
  - Auto-append to sent emails
  - **Files**: `components/dashboard/Settings.tsx`, `pages/dashboard/email/compose/index.tsx`

- [ ] **Keyboard Shortcuts Config**
  - Customize keyboard shortcuts
  - Show shortcuts modal (?)
  - **Files**: `components/dashboard/Settings.tsx`, `hooks/use-keyboard-navigation.ts`

---

### Phase 4: Testing & Quality (1 week)

#### Week 8: Test Coverage

**Goal**: Reach 70% test coverage

- [ ] **Unit Tests**
  - Test all Zustand stores
  - Test custom hooks
  - Test utility functions
  - **Tool**: Jest
  - **Target**: 70% coverage for stores and hooks

- [ ] **Component Tests**
  - Test UI components with React Testing Library
  - Test user interactions
  - **Files**: Create `.spec.tsx` for all components in `components/ui/`

- [ ] **Integration Tests**
  - Test full user flows (login → send email)
  - Mock API responses
  - **Files**: `tests/integration/`

- [ ] **E2E Tests** (Optional)
  - Use Playwright or Cypress
  - Test critical paths
  - **Files**: `tests/e2e/`

---

## 🔧 Technical Debt & Refactoring

### Immediate Fixes

1. **Security**: Move JWT from localStorage to HTTP-only cookies
   - **Why**: localStorage is vulnerable to XSS attacks
   - **How**: Update `auth-store.ts`, backend `/auth/login` to set cookie
   - **Timeline**: Week 1

2. **Naming Cleanup**: ~~Remove "PmSync" prefixes~~ ✅ **DONE**
   - **Status**: Completed 2025-11-20

3. **Theme Files**: ~~Rename `pmSyncTheme.ts` to `appTheme.ts`~~ ✅ **DONE**
   - **Status**: Completed 2025-11-20

### Code Quality

- [ ] Add ESLint rules for:
  - Unused imports
  - Console.log statements
  - Missing TypeScript types

- [ ] Setup Prettier for consistent formatting

- [ ] Add Husky pre-commit hooks:
  - Run linter
  - Run type checking
  - Run tests

---

## 📈 Success Metrics

### Performance

- **Lighthouse Score**: > 90 (Performance, Accessibility, Best Practices)
- **Time to Interactive**: < 3 seconds
- **Bundle Size**: < 500KB (gzipped)

### Quality

- **Test Coverage**: > 70%
- **TypeScript Strict**: 100% (already achieved)
- **Zero Console Errors**: In production

### User Experience

- **Email Load Time**: < 500ms (with skeleton loader)
- **Search Latency**: < 1 second
- **Real-time Update Delay**: < 5 seconds

---

## 🛠️ Development Guidelines

### Component Structure

```typescript
// components/Example.tsx

import React from 'react';
import { Box, Typography } from '@mui/material';

export interface ExampleProps {
  title: string;
  onAction?: () => void;
}

export function Example({ title, onAction }: ExampleProps) {
  return (
    <Box>
      <Typography variant="h6">{title}</Typography>
    </Box>
  );
}
```

### API Integration Pattern

```typescript
// In component:

import { emailApi } from '@/lib/api/email';
import { useEmailStore } from '@/stores/email-store';

const { emails, setEmails } = useEmailStore();

try {
  const response = await emailApi.getEmails({ page: 1, limit: 50 });
  setEmails(response.data.emails);
} catch (error) {
  console.error('Failed to load emails:', error);
  // Show error toast
}
```

### WebSocket Event Handling

```typescript
// In component using useWebSocket hook:

import { useWebSocket } from '@/hooks/use-websocket';
import { useEmailStore } from '@/stores/email-store';

useWebSocket(token, true);

useEffect(() => {
  const handleNewEmail = (email) => {
    addEmail(email);
    // Show notification
  };

  // Subscribe to event
  websocketClient.on('email:new', handleNewEmail);

  return () => {
    websocketClient.off('email:new', handleNewEmail);
  };
}, []);
```

---

## 📦 Deployment Checklist

### Before Production

- [ ] All tests passing
- [ ] No console errors
- [ ] Environment variables configured
- [ ] API URLs correct (production backend)
- [ ] Error tracking enabled (Sentry)
- [ ] Analytics enabled (optional)
- [ ] Build succeeds without warnings
- [ ] Lighthouse audit > 90
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness verified

### Environment Variables

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.mailagent.com
NEXT_PUBLIC_WS_URL=wss://api.mailagent.com
NEXTAUTH_URL=https://app.mailagent.com
NEXTAUTH_SECRET=<secret>
```

---

## 🎯 Priority Matrix

### Must Have (MVP)

1. ✅ Authentication (Login, Register, MFA)
2. ✅ Email List & Detail View
3. ✅ Email Compose & Send
4. ✅ Provider Connection (Gmail, Microsoft, IMAP)
5. ✅ Real-time Email Updates
6. ⚠️ Error Handling (needs improvement)
7. ⚠️ Loading States (needs skeleton loaders)

### Should Have (V1.0)

1. Email Thread View
2. Advanced Search Filters
3. Email Labels/Tags
4. Calendar Recurring Events
5. Contact Groups
6. AI Categorization
7. Smart Reply
8. Email Summarization

### Nice to Have (V2.0)

1. Email Templates
2. Scheduled Sending
3. Email Delegation
4. Contact Merge
5. Calendar Sharing
6. Offline Support (PWA)
7. Desktop Notifications

---

## 📚 References

- [Mail-0/Zero Repository](https://github.com/Mail-0/Zero)
- [Next.js Documentation](https://nextjs.org/docs)
- [Material-UI Documentation](https://mui.com/)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Backend API Documentation](./BACKEND_DELIVERY.md)

---

## 📝 Recent Updates

### 2025-11-22 Session
- ✅ Completed **Live Folder Counts** (Phase 3, Week 6)
- ✅ Completed **HTML Email Rendering** (Phase 2, Week 3)
- ✅ Completed **Custom Scrollbar UX** (Phase 1, Week 2)
- 🐛 Fixed 5 critical bugs (folder counts, store keys, WebSocket namespace, API fields, overflow)
- 📊 Full session details: [`SESSION_SUMMARY_2025-11-22.md`](./archive/testing/SESSION_SUMMARY_2025-11-22.md)

---

**Last Updated**: 2025-11-22
**Maintained By**: MailAgent Development Team
