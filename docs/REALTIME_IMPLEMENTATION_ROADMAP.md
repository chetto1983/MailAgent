# Realtime Implementation Roadmap

**Progetto**: MailAgent - Realtime Events System
**Data Creazione**: 2025-11-22
**Stato Corrente**: 60% Implementato (12/20 eventi)
**Obiettivo**: 100% Implementazione + UI completa

---

## 📊 Overview

### Stato Attuale
- ✅ **Email Events**: 5/7 (71%)
- ✅ **Calendar Events**: 3/3 (100%)
- ✅ **Contact Events**: 3/3 (100%)
- ✅ **Sync Events**: 1/1 (100%)
- ❌ **AI Events**: 0/3 (0%)
- ❌ **HITL Events**: 0/3 (0%)

### Obiettivi
- 🎯 Completare AI Store e handlers (3 eventi)
- 🎯 Completare HITL Store e handlers (3 eventi)
- 🎯 Implementare UI HITL approval flow
- 🎯 Completare Thread Update support
- 🎯 Standardizzare update events format
- 🎯 Testing completo E2E

---

## 🗺️ Roadmap - 3 Settimane

```
Week 1: AI & HITL Core (Foundation)
├─ Day 1-2: AI Store Implementation
├─ Day 3-4: HITL Store Implementation
└─ Day 5: Testing & Integration

Week 2: HITL UI (User Experience)
├─ Day 1-2: Approval Drawer Component
├─ Day 3: Notification Badge & Toast
├─ Day 4: API Integration
└─ Day 5: E2E Testing

Week 3: Polish & Advanced Features
├─ Day 1-2: Thread Update Implementation
├─ Day 3: Standardize Update Events
├─ Day 4: Batch Processed Support
└─ Day 5: Performance Testing & Documentation
```

---

## 📅 WEEK 1: AI & HITL Core (Foundation)

**Obiettivo**: Implementare stores e handlers per eventi AI e HITL
**Team**: 1 developer
**Durata**: 5 giorni (8h/day = 40h totali)

---

### 🔴 DAY 1: AI Store - Part 1 (8h)

#### Task 1.1: Creare AI Store Base (3h)
**File**: `frontend/stores/ai-store.ts`

**Subtasks**:
- [ ] Creare file `ai-store.ts` nella cartella stores
- [ ] Copiare template da [TEMPLATE_AI_STORE.md](./TEMPLATE_AI_STORE.md)
- [ ] Definire interfaces: `AIClassification`, `AITaskSuggestion`, `AIInsight`
- [ ] Implementare state iniziale
- [ ] Implementare actions base: `addClassification`, `addTaskSuggestion`, `addInsight`

**Acceptance Criteria**:
- ✅ File compila senza errori TypeScript
- ✅ Tutte le interfaces sono definite
- ✅ Store è esportato correttamente
- ✅ Nessun warning ESLint

**Deliverable**: `frontend/stores/ai-store.ts` funzionante

---

#### Task 1.2: Implementare Query Methods AI (2h)

**Subtasks**:
- [ ] Implementare `getClassification(emailId)`
- [ ] Implementare `getTaskSuggestionsForEmail(emailId)`
- [ ] Implementare `getInsightsForEmail(emailId)`
- [ ] Implementare `getActionableInsights()`

**Acceptance Criteria**:
- ✅ Tutti i metodi query ritornano dati corretti
- ✅ Nessuna mutazione state in query methods
- ✅ Performance: O(1) o O(n) accettabile

**Deliverable**: Query methods testabili

---

#### Task 1.3: Implementare Statistics AI (1h)

**Subtasks**:
- [ ] Implementare calcolo `avgConfidence`
- [ ] Implementare contatori: `totalClassifications`, `totalTasksSuggested`, `totalInsights`
- [ ] Aggiornare stats on ogni add

**Acceptance Criteria**:
- ✅ Stats aggiornate correttamente
- ✅ avgConfidence calcolato correttamente (0-1)

---

#### Task 1.4: Unit Tests AI Store (2h)

**File**: `frontend/stores/__tests__/ai-store.test.ts`

**Subtasks**:
- [ ] Test `addClassification` aggiunge correttamente
- [ ] Test `addClassification` previene duplicati
- [ ] Test `getClassification` ritorna il dato corretto
- [ ] Test `addTaskSuggestion` funziona
- [ ] Test `acceptTaskSuggestion` cambia status
- [ ] Test `rejectTaskSuggestion` cambia status
- [ ] Test `addInsight` funziona
- [ ] Test `getActionableInsights` filtra correttamente
- [ ] Test `reset()` pulisce tutto

**Acceptance Criteria**:
- ✅ Test coverage >= 80%
- ✅ Tutti i test passano
- ✅ Zero flaky tests

**Deliverable**: Suite test completa

---

### 🔴 DAY 2: AI Store - Part 2 (8h)

#### Task 2.1: Integrare AI Store in use-websocket.ts (3h)

**File**: `frontend/hooks/use-websocket.ts`

**Subtasks**:
- [ ] Aggiungere import `useAIStore`
- [ ] Estrarre actions: `addClassification`, `addTaskSuggestion`, `addInsight`, `setProcessing`
- [ ] Implementare handler `onAIClassification`
- [ ] Implementare handler `onAITaskSuggest`
- [ ] Implementare handler `onAIInsight`
- [ ] Aggiungere cleanup per i 3 handler
- [ ] Aggiungere dependencies nel useEffect array

**Acceptance Criteria**:
- ✅ Nessun errore TypeScript
- ✅ Nessun warning React hooks
- ✅ Console.log mostra eventi ricevuti
- ✅ Store viene aggiornato quando evento arriva

**Deliverable**: WebSocket integration completa

---

#### Task 2.2: Testare AI Events End-to-End (2h)

**Setup**:
- [ ] Backend deve emettere eventi AI test
- [ ] Frontend deve ricevere e processare

**Test Scenarios**:
- [ ] **Scenario 1**: Backend emette `ai:classification_done`
  - ✅ Frontend riceve evento
  - ✅ Console.log mostra payload
  - ✅ Store aggiornato con classification
  - ✅ `getClassification(emailId)` ritorna dati

- [ ] **Scenario 2**: Backend emette `ai:task_suggest`
  - ✅ Frontend riceve evento
  - ✅ Store aggiornato con task
  - ✅ `taskSuggestions` array contiene nuovo task

- [ ] **Scenario 3**: Backend emette `ai:insight`
  - ✅ Frontend riceve evento
  - ✅ Store aggiornato con insight
  - ✅ `insights` array contiene nuovo insight

**Tools**:
- Backend API per triggerare eventi test
- Chrome DevTools WebSocket inspector
- React DevTools per verificare store state

**Deliverable**: Eventi AI funzionanti end-to-end

---

#### Task 2.3: Creare AI UI Components Base (3h)

**Files**:
- `frontend/components/ai/AIClassificationBadge.tsx`
- `frontend/components/ai/AITaskSuggestionCard.tsx`
- `frontend/components/ai/AIInsightNotification.tsx`

**Subtasks**:

**Component 1: AIClassificationBadge** (1h)
- [ ] Props: `emailId: string`
- [ ] Usa `getClassification(emailId)` da store
- [ ] Mostra badge con category, priority, sentiment
- [ ] Color-coded by priority (high=red, medium=yellow, low=green)
- [ ] Tooltip con confidence %

**Component 2: AITaskSuggestionCard** (1h)
- [ ] Props: `task: AITaskSuggestion`
- [ ] Mostra title, description, priority
- [ ] Pulsanti: Accept / Reject
- [ ] OnAccept: chiama `acceptTaskSuggestion(taskId)`
- [ ] OnReject: chiama `rejectTaskSuggestion(taskId)`

**Component 3: AIInsightNotification** (1h)
- [ ] Props: `insight: AIInsight`
- [ ] Mostra message
- [ ] Icon by category (trend/warning/opportunity/info)
- [ ] Pulsante dismiss
- [ ] OnDismiss: chiama `dismissInsight(insightId)`

**Acceptance Criteria**:
- ✅ Componenti compilano senza errori
- ✅ Storybook stories (opzionale ma consigliato)
- ✅ Responsive design

**Deliverable**: 3 componenti UI base

---

### 🔴 DAY 3: HITL Store - Part 1 (8h)

#### Task 3.1: Creare HITL Store Base (3h)

**File**: `frontend/stores/hitl-store.ts`

**Subtasks**:
- [ ] Creare file `hitl-store.ts`
- [ ] Copiare template da [TEMPLATE_HITL_STORE.md](./TEMPLATE_HITL_STORE.md)
- [ ] Definire interfaces: `HITLApproval`, `HITLTaskType`, `HITLApprovalStatus`
- [ ] Implementare state iniziale
- [ ] Implementare actions: `addPendingApproval`, `approveTask`, `denyTask`

**Acceptance Criteria**:
- ✅ File compila senza errori TypeScript
- ✅ Tutte le interfaces definite
- ✅ Store esportato correttamente

**Deliverable**: `frontend/stores/hitl-store.ts` funzionante

---

#### Task 3.2: Implementare HITL Query & UI Methods (2h)

**Subtasks**:
- [ ] Implementare `getPendingApprovals()`
- [ ] Implementare `getApprovalById(approvalId)`
- [ ] Implementare `getApprovalsByType(type)`
- [ ] Implementare `getHighPriorityApprovals()`
- [ ] Implementare `setDrawerOpen(open)`
- [ ] Implementare `setSelectedApproval(approvalId)`
- [ ] Implementare `markAsRead(approvalId)`
- [ ] Implementare `markAllAsRead()`

**Acceptance Criteria**:
- ✅ Query methods performanti
- ✅ UI state methods funzionanti

---

#### Task 3.3: Implementare Auto-Expire Logic (1h)

**Subtasks**:
- [ ] Implementare `expireApproval(approvalId)`
- [ ] Creare hook `useHITLAutoExpire()`
- [ ] Interval check ogni 60s per approval scadute
- [ ] Move da `pendingApprovals` a `approvalHistory` con status 'expired'

**Acceptance Criteria**:
- ✅ Approval scadute automaticamente
- ✅ Nessun memory leak (interval cleanup)

---

#### Task 3.4: Unit Tests HITL Store (2h)

**File**: `frontend/stores/__tests__/hitl-store.test.ts`

**Subtasks**:
- [ ] Test `addPendingApproval` funziona
- [ ] Test `addPendingApproval` previene duplicati
- [ ] Test `approveTask` sposta da pending a history
- [ ] Test `approveTask` aggiorna status e timestamp
- [ ] Test `denyTask` funziona
- [ ] Test `expireApproval` funziona
- [ ] Test `getHighPriorityApprovals` filtra correttamente
- [ ] Test `unreadCount` incrementa/decrementa correttamente

**Acceptance Criteria**:
- ✅ Test coverage >= 80%
- ✅ Tutti i test passano

**Deliverable**: Suite test completa

---

### 🔴 DAY 4: HITL Store - Part 2 (8h)

#### Task 4.1: Integrare HITL Store in use-websocket.ts (3h)

**File**: `frontend/hooks/use-websocket.ts`

**Subtasks**:
- [ ] Aggiungere import `useHITLStore`
- [ ] Estrarre actions: `addPendingApproval`, `approveTask`, `denyTask`
- [ ] Implementare handler `onHITLApprovalRequired`
- [ ] Implementare handler `onHITLApprovalGranted`
- [ ] Implementare handler `onHITLApprovalDenied`
- [ ] Helper function `determinePriority(task)`
- [ ] Aggiungere cleanup
- [ ] Aggiungere dependencies

**Acceptance Criteria**:
- ✅ Nessun errore TypeScript
- ✅ Console.log mostra eventi
- ✅ Store aggiornato

**Deliverable**: WebSocket integration completa

---

#### Task 4.2: Testare HITL Events End-to-End (2h)

**Test Scenarios**:
- [ ] **Scenario 1**: Backend emette `hitl:approval_required`
  - ✅ Frontend riceve evento
  - ✅ Store aggiornato
  - ✅ `pendingApprovals` array contiene approval
  - ✅ `unreadCount` incrementato

- [ ] **Scenario 2**: Utente approva task
  - ✅ `approveTask()` chiamato
  - ✅ Approval spostato da pending a history
  - ✅ Status = 'approved'

- [ ] **Scenario 3**: Utente nega task
  - ✅ `denyTask()` chiamato
  - ✅ Approval spostato a history
  - ✅ Status = 'denied'

**Deliverable**: Eventi HITL funzionanti end-to-end

---

#### Task 4.3: Creare HITL API Client (3h)

**File**: `frontend/lib/api/hitl.ts`

**Subtasks**:
- [ ] Definire `HITLApi` interface
- [ ] Implementare `approveApproval(approvalId, userId)`
- [ ] Implementare `denyApproval(approvalId, userId, reason)`
- [ ] Implementare `getPendingApprovals()`
- [ ] Implementare `getApprovalHistory()`
- [ ] Error handling e retry logic

**API Endpoints** (da verificare con backend):
```typescript
POST   /hitl/approvals/:id/approve
POST   /hitl/approvals/:id/deny
GET    /hitl/approvals/pending
GET    /hitl/approvals/history
```

**Acceptance Criteria**:
- ✅ API client compila senza errori
- ✅ Error handling robusto
- ✅ TypeScript types corretti

**Deliverable**: `frontend/lib/api/hitl.ts`

---

### 🔴 DAY 5: Testing & Integration Week 1 (8h)

#### Task 5.1: Integration Testing AI + HITL (3h)

**Test Suite**: `frontend/__tests__/integration/realtime-ai-hitl.test.ts`

**Scenarios**:
- [ ] AI classification → Badge mostra dati
- [ ] AI task suggestion → Card mostra task
- [ ] HITL approval required → Drawer mostra approval
- [ ] User approves → API chiamata, store aggiornato
- [ ] Auto-expire → Approval scadute spostate a history

**Tools**:
- Jest + React Testing Library
- Mock WebSocket events
- Mock API responses

**Deliverable**: Suite integration tests

---

#### Task 5.2: Fix Bugs & Code Review (3h)

**Subtasks**:
- [ ] Code review AI Store
- [ ] Code review HITL Store
- [ ] Fix TypeScript warnings
- [ ] Fix ESLint warnings
- [ ] Optimize performance (se necessario)
- [ ] Refactoring (se necessario)

**Deliverable**: Codice pulito e ottimizzato

---

#### Task 5.3: Documentation Week 1 (2h)

**Subtasks**:
- [ ] Aggiornare README con nuove features
- [ ] Documentare AI Store API
- [ ] Documentare HITL Store API
- [ ] Aggiungere esempi uso in docs
- [ ] Screenshot componenti (se applicabile)

**Deliverable**: Documentazione aggiornata

---

## 📅 WEEK 2: HITL UI (User Experience)

**Obiettivo**: Creare UI completa per HITL approval flow
**Team**: 1 developer + 1 designer (part-time)
**Durata**: 5 giorni (8h/day = 40h totali)

---

### 🟡 DAY 6: Approval Drawer Component - Part 1 (8h)

#### Task 6.1: Design UI/UX Approval Drawer (2h)

**Designer Tasks**:
- [ ] Mockup Figma/Sketch per Approval Drawer
- [ ] Layout: Right drawer, 400px width
- [ ] Sections: Header, Filters, Approval List, Empty State
- [ ] Color scheme per priority (urgent=red, high=orange, medium=yellow, low=green)
- [ ] Responsive design (mobile collapse)

**Developer Tasks**:
- [ ] Review mockup
- [ ] Feedback e iterazione

**Deliverable**: Mockup approvato

---

#### Task 6.2: Implementare ApprovalDrawer Base (4h)

**File**: `frontend/components/hitl/ApprovalDrawer.tsx`

**Subtasks**:
- [ ] Setup MUI Drawer component
- [ ] Props: controllato da `drawerOpen` store state
- [ ] Header con title "Pending Approvals" + badge unreadCount
- [ ] Close button
- [ ] Responsive width (400px desktop, 100% mobile)

**Acceptance Criteria**:
- ✅ Drawer apre/chiude correttamente
- ✅ State sincronizzato con store
- ✅ Responsive

**Deliverable**: Drawer base funzionante

---

#### Task 6.3: Implementare Approval List (2h)

**Subtasks**:
- [ ] Map su `pendingApprovals` array
- [ ] Card per ogni approval
- [ ] Mostra: title, description, type, priority badge
- [ ] Timestamp relativo ("2 minutes ago")
- [ ] Empty state quando lista vuota
- [ ] Skeleton loading (opzionale)

**Acceptance Criteria**:
- ✅ Lista renderizza correttamente
- ✅ Empty state mostra messaggio
- ✅ Performance con molti items (virtualization se >100)

**Deliverable**: Lista approvals funzionante

---

### 🟡 DAY 7: Approval Drawer Component - Part 2 (8h)

#### Task 7.1: Implementare Approve/Deny Actions (3h)

**Subtasks**:
- [ ] Pulsanti "Approve" e "Deny" per ogni card
- [ ] OnApprove: chiama `hitlApi.approveApproval(approvalId, userId)`
- [ ] OnDeny: mostra dialog per reason (opzionale)
- [ ] OnDeny: chiama `hitlApi.denyApproval(approvalId, userId, reason)`
- [ ] Loading state durante API call
- [ ] Success: toast notification
- [ ] Error: toast error message
- [ ] Aggiorna store locale dopo success

**Acceptance Criteria**:
- ✅ API chiamate funzionano
- ✅ Loading state visibile
- ✅ Success/error feedback
- ✅ Store aggiornato

**Deliverable**: Actions funzionanti

---

#### Task 7.2: Implementare Filters (2h)

**Subtasks**:
- [ ] Tabs: All, Pending, Approved, Denied
- [ ] OnTabClick: `setFilter(filterType)`
- [ ] Filter lista based on `filter` state
- [ ] Badge count per tab

**Acceptance Criteria**:
- ✅ Tabs funzionano
- ✅ Lista filtra correttamente
- ✅ Badge count corretto

---

#### Task 7.3: Implementare Priority Sorting (1h)

**Subtasks**:
- [ ] Sort button (dropdown: Priority, Date, Type)
- [ ] OnSort: riordina lista
- [ ] Default: Priority DESC (urgent first)

**Acceptance Criteria**:
- ✅ Sorting funziona
- ✅ Persiste durante session (sessionStorage)

---

#### Task 7.4: Styling & Polish (2h)

**Subtasks**:
- [ ] Applicare design mockup
- [ ] Hover effects
- [ ] Transition animations
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Dark mode support (se applicabile)

**Deliverable**: Drawer UI completo e polished

---

### 🟡 DAY 8: Notification Badge & Toast (8h)

#### Task 8.1: Implementare Notification Badge (3h)

**File**: `frontend/components/hitl/ApprovalNotificationBadge.tsx`

**Subtasks**:
- [ ] IconButton con NotificationsActive icon
- [ ] Badge MUI con `unreadCount`
- [ ] OnClick: `setDrawerOpen(true)`
- [ ] Animazione pulse quando nuovo approval arriva
- [ ] Posizionare nella navbar/header

**Acceptance Criteria**:
- ✅ Badge mostra count corretto
- ✅ Click apre drawer
- ✅ Animation quando count incrementa

**Deliverable**: Badge funzionante

---

#### Task 8.2: Integrare Badge in Layout (1h)

**File**: `frontend/components/layout/Header.tsx` o simile

**Subtasks**:
- [ ] Import `ApprovalNotificationBadge`
- [ ] Posizionare accanto a user menu / settings
- [ ] Responsive position

**Deliverable**: Badge visibile in app

---

#### Task 8.3: Implementare Toast Notifications (3h)

**Libreria**: `react-hot-toast` o MUI Snackbar

**Subtasks**:
- [ ] Setup toast provider nel App root
- [ ] Toast per nuovo approval:
  - Titolo: "Approval Required"
  - Messaggio: task.title
  - Action button: "View"
  - OnClick: apri drawer + seleziona approval
- [ ] Toast per approve success:
  - "Approval granted successfully"
- [ ] Toast per deny success:
  - "Approval denied"
- [ ] Toast per errori API

**Acceptance Criteria**:
- ✅ Toast appaiono correttamente
- ✅ Auto-dismiss dopo 5s (configurabile)
- ✅ Click su "View" funziona
- ✅ Stacking multipli toast

**Deliverable**: Toast system completo

---

#### Task 8.4: Hook Auto-Expire UI Feedback (1h)

**Subtasks**:
- [ ] Quando approval scade, mostra toast:
  - "Approval expired: {task.title}"
- [ ] Rimuovi da pending list
- [ ] Badge count decrementa

**Acceptance Criteria**:
- ✅ Expiration notification visibile
- ✅ UI aggiornata correttamente

---

### 🟡 DAY 9: API Integration & Backend Sync (8h)

#### Task 9.1: Backend API Endpoints (4h)

**Backend Developer Task** (coordinare con team backend):

**Endpoints da creare/verificare**:
```typescript
POST   /api/hitl/approvals/:id/approve
  Body: { userId: string }
  Response: { success: boolean, approval: HITLApproval }

POST   /api/hitl/approvals/:id/deny
  Body: { userId: string, reason?: string }
  Response: { success: boolean, approval: HITLApproval }

GET    /api/hitl/approvals/pending
  Response: { approvals: HITLApproval[] }

GET    /api/hitl/approvals/history?page=1&limit=20
  Response: { approvals: HITLApproval[], total: number }
```

**Acceptance Criteria**:
- ✅ Endpoints implementati
- ✅ Authentication required
- ✅ Tenant isolation
- ✅ Swagger docs aggiornati

---

#### Task 9.2: Frontend API Client Complete (2h)

**File**: `frontend/lib/api/hitl.ts`

**Subtasks**:
- [ ] Implementare tutti i metodi
- [ ] Error handling con retry
- [ ] Loading states
- [ ] TypeScript types da backend

**Deliverable**: API client production-ready

---

#### Task 9.3: Integration Frontend-Backend (2h)

**Subtasks**:
- [ ] Test approve flow end-to-end
- [ ] Test deny flow end-to-end
- [ ] Test fetch pending approvals
- [ ] Test fetch history con pagination
- [ ] Fix eventuali bugs

**Deliverable**: Frontend-Backend integrati

---

### 🟡 DAY 10: E2E Testing & Polish (8h)

#### Task 10.1: E2E Tests Cypress/Playwright (4h)

**File**: `frontend/e2e/hitl-approval-flow.spec.ts`

**Test Cases**:
- [ ] **TC1**: Nuovo approval arriva via WebSocket
  - Badge count incrementa
  - Toast appare
  - Click su toast apre drawer
  - Approval visibile nella lista

- [ ] **TC2**: User approva approval
  - Click su "Approve" button
  - Loading state
  - API chiamata
  - Success toast
  - Approval scompare da pending
  - Badge count decrementa

- [ ] **TC3**: User nega approval
  - Click su "Deny" button
  - (opzionale) Reason dialog appare
  - API chiamata
  - Success toast
  - Approval scompare da pending

- [ ] **TC4**: Approval auto-expires
  - Simula expiry time passato
  - Approval scompare da pending
  - Expiry toast appare

**Deliverable**: E2E test suite

---

#### Task 10.2: Performance Testing (2h)

**Scenarios**:
- [ ] 100 pending approvals → lista performante?
- [ ] 10 approvals arrivano simultaneamente → UI non lagga?
- [ ] Drawer apre/chiude → smooth animation?

**Optimizations** (se necessario):
- [ ] Virtualized list per molti items
- [ ] Debounce filter input
- [ ] Memoization componenti

**Deliverable**: App performante

---

#### Task 10.3: Bug Fixing & Final Polish (2h)

**Subtasks**:
- [ ] Fix bugs trovati in testing
- [ ] Code review finale
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile testing (iOS, Android)

**Deliverable**: UI production-ready

---

## 📅 WEEK 3: Polish & Advanced Features

**Obiettivo**: Completare features mancanti e polish
**Team**: 1 developer
**Durata**: 5 giorni (8h/day = 40h totali)

---

### 🔵 DAY 11-12: Thread Update Implementation (16h)

#### Task 11.1: Email Store Thread Support (4h)

**File**: `frontend/stores/email-store.ts`

**Subtasks**:
- [ ] Aggiungere campo `threads: Map<string, string[]>` allo state
  - Key: threadId
  - Value: array di emailIds
- [ ] Implementare `updateThread(threadId: string, emailIds: string[])`
- [ ] Implementare `getThreadEmails(threadId: string): Email[]`
- [ ] Implementare `getEmailThread(emailId: string): Email[]`

**Acceptance Criteria**:
- ✅ Thread data structure performante
- ✅ Query methods O(1) o O(n log n)

---

#### Task 11.2: WebSocket Handler Thread Update (2h)

**File**: `frontend/hooks/use-websocket.ts`

**Subtasks**:
- [ ] Aggiungere handler `onThreadUpdate`
- [ ] Chiamare `updateThread(data.threadId, data.emailIds)`
- [ ] Aggiungere cleanup
- [ ] Aggiungere dependency

**Deliverable**: Handler funzionante

---

#### Task 11.3: Thread View UI Component (6h)

**File**: `frontend/components/email/ThreadView.tsx`

**Subtasks**:
- [ ] Component che mostra thread di email
- [ ] Props: `threadId: string`
- [ ] Usa `getThreadEmails(threadId)` per fetch emails
- [ ] Layout: chronological order, indentation
- [ ] Expand/collapse thread
- [ ] Reply in thread
- [ ] Mark thread as read

**Deliverable**: ThreadView component

---

#### Task 11.4: Integration & Testing (4h)

**Subtasks**:
- [ ] Integrare ThreadView in EmailDetail
- [ ] Test thread update event
- [ ] Test UI updates correctly
- [ ] Test performance con thread lunghi (50+ emails)

**Deliverable**: Thread feature completo

---

### 🔵 DAY 13: Standardize Update Events (8h)

#### Task 13.1: Calendar Event Update - Dual Format (2h)

**File**: `frontend/hooks/use-websocket.ts`

**Modificare handler**:
```typescript
const unsubCalendarUpdate = websocketClient.onCalendarEventUpdate((data) => {
  // ✅ NUOVO: Handle complete event object
  if (data.event) {
    updateEvent(data.eventId || data.event.id, data.event);
    return;
  }

  // ✅ LEGACY: Handle partial updates
  if (data.eventId && data.updates) {
    updateEvent(data.eventId, data.updates);
  }
});
```

**Acceptance Criteria**:
- ✅ Gestisce `data.event` (nuovo formato)
- ✅ Gestisce `data.updates` (legacy)
- ✅ Backward compatible

---

#### Task 13.2: Contact Update - Dual Format (2h)

**File**: `frontend/hooks/use-websocket.ts`

**Modificare handler**:
```typescript
const unsubContactUpdate = websocketClient.onContactUpdate((data) => {
  // ✅ NUOVO: Handle complete contact object
  if (data.contact) {
    updateContact(data.contactId || data.contact.id, data.contact);
    return;
  }

  // ✅ LEGACY: Handle partial updates
  if (data.contactId && data.updates) {
    updateContact(data.contactId, data.updates);
  }
});
```

---

#### Task 13.3: Documentation & Backend Coordination (2h)

**Subtasks**:
- [ ] Documentare dual format pattern
- [ ] Aggiornare REALTIME_API_REFERENCE.md
- [ ] Coordinare con backend team per eventuale migrazione
- [ ] Create migration guide (se backend vuole adottare nuovo formato)

---

#### Task 13.4: Testing Dual Format (2h)

**Test Cases**:
- [ ] Backend emette `calendar:event_update` con `data.event` → funziona
- [ ] Backend emette `calendar:event_update` con `data.updates` → funziona
- [ ] Backend emette `contact:update` con `data.contact` → funziona
- [ ] Backend emette `contact:update` con `data.updates` → funziona

**Deliverable**: Dual format supportato

---

### 🔵 DAY 14: Batch Processed Support (8h)

#### Task 14.1: WebSocket Client Method (1h)

**File**: `frontend/lib/websocket-client.ts`

**Aggiungere**:
```typescript
onEmailBatchProcessed(handler: EventHandler<{
  providerId: string;
  processed: number;
  created?: number;
  syncType?: 'full' | 'incremental';
  timestamp: string;
}>): () => void {
  if (!this.socket) return () => {};
  this.socket.on('email:batch_processed', handler);
  return () => this.socket?.off('email:batch_processed', handler);
}
```

---

#### Task 14.2: Hook Handler (2h)

**File**: `frontend/hooks/use-websocket.ts`

**Aggiungere handler**:
```typescript
const unsubBatchProcessed = websocketClient.onEmailBatchProcessed((data) => {
  console.log('[WS] Email batch processed:', data);

  // Opzione 1: Mostra toast notification
  toast.info(`Sync completed: ${data.processed} emails processed`);

  // Opzione 2: Trigger refresh della lista email
  // refreshEmails();

  // Opzione 3: Aggiorna sync status
  setSyncStatus({
    providerId: data.providerId,
    status: 'completed',
    processed: data.processed,
    timestamp: data.timestamp,
  });
});
```

---

#### Task 14.3: UI Feedback Strategy (3h)

**Decidere e implementare**:

**Opzione A: Toast Notification**
- Pro: Non invasivo, user informato
- Con: Potrebbe essere ignorato

**Opzione B: Refresh automatico lista**
- Pro: Dati sempre aggiornati
- Con: Potrebbe interrompere user se sta leggendo

**Opzione C: "New emails available" banner**
- Pro: User controlla quando refreshare
- Con: Richiede click aggiuntivo

**Decisione**: Implementare Opzione A + C
- Toast per notify
- Banner con button "Refresh" per aggiornare

**Deliverable**: UI feedback implementato

---

#### Task 14.4: Testing (2h)

**Test**:
- [ ] Backend emette `email:batch_processed`
- [ ] Toast appare
- [ ] Banner appare (se implementato)
- [ ] Click refresh aggiorna lista

**Deliverable**: Batch processed support completo

---

### 🔵 DAY 15: Performance Testing & Final Documentation (8h)

#### Task 15.1: Performance Audit (3h)

**Metrics da misurare**:
- [ ] WebSocket connection time
- [ ] Event latency (backend emit → frontend receive)
- [ ] Store update time
- [ ] UI re-render time
- [ ] Memory usage (1h, 8h, 24h session)

**Tools**:
- Chrome DevTools Performance
- React DevTools Profiler
- WebSocket frame inspector

**Targets**:
- ✅ Connection time < 500ms
- ✅ Event latency < 100ms
- ✅ Store update < 10ms
- ✅ UI re-render < 16ms (60fps)
- ✅ Memory leak: 0

**Optimizations** (se necessario):
- [ ] Memoization componenti
- [ ] Debounce rapid events
- [ ] Virtualized lists
- [ ] Code splitting

**Deliverable**: Performance report + optimizations

---

#### Task 15.2: Final Documentation (3h)

**Aggiornare**:
- [ ] README.md con nuove features
- [ ] REALTIME_API_REFERENCE.md completo
- [ ] FRONTEND_REALTIME_AUDIT.md → status 100%
- [ ] CHANGELOG.md con tutte le modifiche
- [ ] Storybook stories per tutti i componenti
- [ ] API documentation (JSDoc completo)

**Deliverable**: Documentazione completa e aggiornata

---

#### Task 15.3: Final Code Review & Cleanup (2h)

**Checklist**:
- [ ] Nessun console.log in production
- [ ] Nessun TODO comments
- [ ] Nessun codice commentato inutile
- [ ] ESLint warnings: 0
- [ ] TypeScript errors: 0
- [ ] Test coverage >= 80%
- [ ] Tutti i test passano
- [ ] Build production successful

**Deliverable**: Codice production-ready

---

## 📊 Acceptance Criteria Progetto

### Funzionali
- ✅ Tutti i 20 eventi realtime implementati (100%)
- ✅ AI Store funzionante con UI
- ✅ HITL Store funzionante con UI approval flow completa
- ✅ Thread update support
- ✅ Dual format support per update events
- ✅ Batch processed handling

### Non-Funzionali
- ✅ Test coverage >= 80%
- ✅ Performance: event latency < 100ms
- ✅ Zero memory leaks
- ✅ Accessibilità WCAG 2.1 Level AA
- ✅ Cross-browser compatibility
- ✅ Mobile responsive
- ✅ Documentazione completa

### Deployment
- ✅ CI/CD pipeline green
- ✅ Staging deploy successful
- ✅ QA testing passed
- ✅ Production deploy ready

---

## 📅 Milestone & Checkpoints

### Milestone 1: Week 1 Complete (Day 5)
**Deliverables**:
- ✅ AI Store + handlers
- ✅ HITL Store + handlers
- ✅ Unit tests passed
- ✅ Integration tests passed

**Go/No-Go**: Code review + demo funzionante

---

### Milestone 2: Week 2 Complete (Day 10)
**Deliverables**:
- ✅ HITL UI completa (drawer, badge, toast)
- ✅ API integration
- ✅ E2E tests passed
- ✅ Performance acceptable

**Go/No-Go**: UI review + user testing

---

### Milestone 3: Week 3 Complete (Day 15)
**Deliverables**:
- ✅ Thread update
- ✅ Dual format standardization
- ✅ Batch processed
- ✅ Performance optimized
- ✅ Documentation completa

**Go/No-Go**: Final review + production deploy approval

---

## 🚨 Risks & Mitigation

### Risk 1: Backend API Non Pronte
**Probabilità**: Media
**Impatto**: Alto

**Mitigation**:
- Coordinare con backend team Week 1
- Mock API per sviluppo frontend
- Integration testing Week 2
- Buffer time Day 9 per API issues

---

### Risk 2: Performance Issues con Molti Eventi
**Probabilità**: Bassa
**Impatto**: Medio

**Mitigation**:
- Buffering già implementato backend
- Virtualized lists se necessario
- Performance testing Day 15
- Fallback: throttle eventi

---

### Risk 3: UI/UX Non Soddisfacente
**Probabilità**: Bassa
**Impatto**: Medio

**Mitigation**:
- Mockup approval Day 6
- User testing Week 2
- Iterazioni Day 10
- Designer coinvolto part-time

---

## 👥 Team & Responsibilities

### Developer 1 (Full-time 3 weeks)
- Week 1: AI & HITL Stores
- Week 2: HITL UI
- Week 3: Thread, Standardization, Polish

### Backend Developer (Part-time Week 2)
- API endpoints HITL
- WebSocket event emission testing
- Integration support

### Designer (Part-time Week 2)
- Mockup Approval Drawer
- UI review & feedback
- Accessibility review

### QA (Part-time Week 2-3)
- E2E testing
- Cross-browser testing
- Regression testing

---

## 📈 Success Metrics

### Technical
- ✅ Event latency < 100ms (avg)
- ✅ UI re-render < 16ms (60fps)
- ✅ Test coverage >= 80%
- ✅ Build time < 5 min
- ✅ Bundle size increase < 50KB

### Business
- ✅ User può approvare/negare task in < 5 secondi
- ✅ AI insights visibili in real-time
- ✅ Zero missed approvals (100% notification)
- ✅ User satisfaction >= 4/5 (post-release survey)

---

**Roadmap creata da**: Claude Code
**Data**: 2025-11-22
**Versione**: 1.0
**Stato**: READY FOR EXECUTION 🚀
