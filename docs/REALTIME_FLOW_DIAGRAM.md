# Realtime Events - Flow Diagrams

Diagrammi di flusso per comprendere il sistema realtime end-to-end.

---

## 📊 Architettura Generale

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (NestJS)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐      ┌───────────────────────────────┐       │
│  │  Service Layer   │      │  RealtimeEventsService        │       │
│  │  (Labels, Email, │──────▶  - emitEmailNew()             │       │
│  │   Calendar, etc) │      │  - emitEmailUpdate()          │       │
│  └──────────────────┘      │  - emitEmailDelete()          │       │
│           │                │  - emitFolderCountsUpdate()   │       │
│           │                └───────────────┬───────────────┘       │
│           │                                │                        │
│           │                                │                        │
│     ┌─────▼─────────┐              ┌──────▼──────────┐            │
│     │   Database    │              │ RealtimeGateway │            │
│     │   (Prisma)    │              │  (Socket.IO)    │            │
│     └───────────────┘              └──────┬──────────┘            │
│                                            │                        │
└────────────────────────────────────────────┼────────────────────────┘
                                             │
                          WebSocket (Socket.IO namespace: /realtime)
                                             │
┌────────────────────────────────────────────┼────────────────────────┐
│                        FRONTEND (React)    │                        │
├────────────────────────────────────────────┼────────────────────────┤
│                                            │                        │
│                                ┌───────────▼──────────┐            │
│                                │  WebSocketClient     │            │
│                                │  - onEmailNew()      │            │
│                                │  - onEmailUpdate()   │            │
│                                │  - onEmailDelete()   │            │
│                                └───────────┬──────────┘            │
│                                            │                        │
│                                ┌───────────▼──────────┐            │
│                                │  useWebSocket Hook   │            │
│                                │  - Event Handlers    │            │
│                                │  - Store Updates     │            │
│                                └───────────┬──────────┘            │
│                                            │                        │
│                      ┌─────────────────────┼─────────────────┐     │
│                      │                     │                 │     │
│              ┌───────▼────────┐   ┌───────▼────────┐  ┌─────▼────┐│
│              │  EmailStore    │   │  CalendarStore │  │ ... etc  ││
│              │  (Zustand)     │   │  (Zustand)     │  │          ││
│              └───────┬────────┘   └───────┬────────┘  └─────┬────┘│
│                      │                     │                 │     │
│                      └─────────────────────┼─────────────────┘     │
│                                            │                        │
│                                ┌───────────▼──────────┐            │
│                                │   React Components   │            │
│                                │   - Mailbox          │            │
│                                │   - ThreadDisplay    │            │
│                                │   - Calendar         │            │
│                                └──────────────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flow Completo: Label Update

### Scenario: Utente aggiunge etichetta "Important" a un'email

```
┌──────────────────────────────────────────────────────────────────────┐
│  1. USER ACTION                                                      │
└──────────────────────────────────────────────────────────────────────┘

User clicks "Add Label: Important" button
         │
         ▼

┌──────────────────────────────────────────────────────────────────────┐
│  2. FRONTEND - HTTP REQUEST                                          │
└──────────────────────────────────────────────────────────────────────┘

ThreadDisplay.tsx
  └─▶ handleLabelsChange()
       └─▶ addEmailsToLabel(labelId, [emailId])
            └─▶ POST /labels/{labelId}/emails
                 Body: { emailIds: ["email123"] }
                      │
                      ▼

┌──────────────────────────────────────────────────────────────────────┐
│  3. BACKEND - CONTROLLER                                             │
└──────────────────────────────────────────────────────────────────────┘

LabelsController.ts
  └─▶ @Post(':id/emails')
       └─▶ addEmailsToLabel()
            │
            ▼

┌──────────────────────────────────────────────────────────────────────┐
│  4. BACKEND - SERVICE LAYER                                          │
└──────────────────────────────────────────────────────────────────────┘

LabelsService.ts
  └─▶ addEmailsToLabel(tenantId, labelId, dto)
       │
       ├─▶ 1. Validate label exists
       │
       ├─▶ 2. Validate emails belong to tenant
       │
       ├─▶ 3. Create EmailLabel records
       │    └─▶ prisma.emailLabel.createMany()
       │
       ├─▶ 4. Fetch updated emails with labels
       │    └─▶ emailsService.getEmailsByIds()
       │         └─▶ Returns: [{ id, subject, emailLabels: [...] }]
       │
       ├─▶ 5. Emit realtime events  ⚡
       │    └─▶ FOR EACH updated email:
       │         └─▶ realtimeEvents.emitEmailUpdate(tenantId, {
       │              emailId: email.id,
       │              providerId: email.providerId,
       │              folder: email.folder,
       │              reason: 'labels-updated',
       │              email: email  ✅ Complete email object
       │            })
       │
       └─▶ 6. Return HTTP response
            └─▶ { count: 1, emails: [updatedEmail] }
                 │
                 ▼

┌──────────────────────────────────────────────────────────────────────┐
│  5. BACKEND - REALTIME SERVICE (Buffered)                            │
└──────────────────────────────────────────────────────────────────────┘

RealtimeEventsService.ts
  └─▶ bufferEmailEvent()
       │
       ├─▶ Add to emailEventBuffer Map
       │    Key: "tenant123:email:update:email123"
       │    Value: { event, tenantId, payload }
       │
       ├─▶ Start timer if not exists (200ms)
       │
       └─▶ When timer expires OR buffer full (500 events):
            └─▶ flushEmailEvents()
                 └─▶ emitToTenantImmediate()
                      └─▶ Check: hasTenantConnections(tenantId)? ✅
                           └─▶ gateway.server.to(room).emit('email:update', {
                                ...payload,
                                timestamp: "2025-11-22T10:30:00Z"
                              })
                                │
                                │  WebSocket Transmission
                                ▼

┌──────────────────────────────────────────────────────────────────────┐
│  6. FRONTEND - WEBSOCKET CLIENT                                      │
└──────────────────────────────────────────────────────────────────────┘

WebSocketClient.ts
  └─▶ socket.on('email:update', (data) => {
       └─▶ Call all registered handlers
            └─▶ handler(data)
                 │
                 ▼

┌──────────────────────────────────────────────────────────────────────┐
│  7. FRONTEND - WEBSOCKET HOOK                                        │
└──────────────────────────────────────────────────────────────────────┘

useWebSocket.ts
  └─▶ onEmailUpdate handler:
       │
       ├─▶ console.log('[WS] Email update:', data)
       │
       ├─▶ IF data.email exists:  ✅ (NEW FORMAT)
       │    └─▶ updateEmail(data.emailId, data.email)
       │         │
       │         ▼
       │
       └─▶ ELSE IF data.updates exists:  (LEGACY FORMAT)
            └─▶ updateEmail(data.emailId, data.updates)
                 │
                 ▼

┌──────────────────────────────────────────────────────────────────────┐
│  8. FRONTEND - EMAIL STORE                                           │
└──────────────────────────────────────────────────────────────────────┘

EmailStore.ts (Zustand)
  └─▶ updateEmail(id, updates)
       └─▶ set((state) => ({
            emails: state.emails.map(email =>
              email.id === id
                ? { ...email, ...updates }  ✅ Merge with updates
                : email
            )
          }))
            │
            ▼

┌──────────────────────────────────────────────────────────────────────┐
│  9. FRONTEND - UI UPDATE (Automatic React Re-render)                 │
└──────────────────────────────────────────────────────────────────────┘

React Components subscribing to EmailStore re-render:
  ├─▶ Mailbox.tsx (email list)
  │    └─▶ Shows updated labels on email item ✅
  │
  └─▶ ThreadDisplay.tsx (email detail)
       └─▶ Shows updated labels in detail view ✅


┌──────────────────────────────────────────────────────────────────────┐
│  10. RESULT                                                          │
└──────────────────────────────────────────────────────────────────────┘

✅ Email shows "Important" label in all open tabs/windows
✅ No manual refresh needed
✅ Real-time synchronization across all connected clients
```

---

## ⚡ Performance: Buffering System

### Email Events Buffering (200ms window)

```
Time: 0ms
  │
  ├─ User updates email #1 → emitEmailUpdate() → Buffer
  │
Time: 50ms
  │
  ├─ User updates email #2 → emitEmailUpdate() → Buffer
  │
Time: 100ms
  │
  ├─ User updates email #3 → emitEmailUpdate() → Buffer
  │
Time: 150ms
  │
  ├─ Sync service updates email #4 → emitEmailUpdate() → Buffer
  │
Time: 200ms ⏰ TIMER EXPIRES
  │
  └─▶ flushEmailEvents()
       └─▶ Emit 4 events to WebSocket (deduplicated)
            └─▶ Frontend receives 4 updates
                 └─▶ React batches state updates
                      └─▶ Single UI re-render ✅


Benefits:
  ✅ Reduces WebSocket traffic (4 events → 1 transmission)
  ✅ Prevents UI flashing (1 re-render instead of 4)
  ✅ Deduplication (if email updated multiple times, only last state sent)
  ✅ Configurable via ENV vars (REALTIME_EMAIL_BUFFER_MS)
```

---

## 🔐 Multi-Tenant Isolation

### Tenant Rooms System

```
┌────────────────────────────────────────────────────────────────┐
│  WEBSOCKET SERVER                                              │
└────────────────────────────────────────────────────────────────┘

Room: "tenant:tenant-123"
  ├─ Client A (User: alice@company.com, Browser: Chrome)
  ├─ Client B (User: alice@company.com, Browser: Firefox)
  └─ Client C (User: bob@company.com, Browser: Mobile)
       │
       ├─▶ All receive events for tenant-123
       └─▶ CANNOT receive events for other tenants ✅

Room: "tenant:tenant-456"
  ├─ Client D (User: carol@other.com, Browser: Chrome)
  └─ Client E (User: dave@other.com, Browser: Safari)
       │
       └─▶ Completely isolated from tenant-123 ✅


Event Flow:
  Service emits: emitEmailUpdate("tenant-123", payload)
       │
       └─▶ RealtimeGateway.server.to("tenant:tenant-123").emit(...)
            │
            ├─▶ ✅ Client A receives (same tenant)
            ├─▶ ✅ Client B receives (same tenant)
            ├─▶ ✅ Client C receives (same tenant)
            ├─▶ ❌ Client D does NOT receive (different tenant)
            └─▶ ❌ Client E does NOT receive (different tenant)
```

---

## 🔄 Connection Lifecycle

### Client Connection Flow

```
┌────────────────────────────────────────────────────────────────┐
│  1. USER AUTHENTICATION                                        │
└────────────────────────────────────────────────────────────────┘

User logs in via /auth/login
  └─▶ Receives JWT token
       └─▶ Stored in AuthStore (localStorage)
            │
            ▼

┌────────────────────────────────────────────────────────────────┐
│  2. WEBSOCKET CONNECTION                                       │
└────────────────────────────────────────────────────────────────┘

Mailbox.tsx mounts
  └─▶ useWebSocket(token, true)
       └─▶ websocketClient.connect(token)
            │
            ├─▶ Create Socket.IO connection
            │    URL: http://localhost:3000/realtime
            │    Auth: { token: "eyJhbG..." }
            │    Transports: ['websocket', 'polling']
            │
            └─▶ Server validates JWT
                 │
                 ├─▶ ✅ Valid → handleConnection()
                 │    ├─ Extract: userId, tenantId, email
                 │    ├─ Join room: "tenant:{tenantId}"
                 │    ├─ Track connection: activeTenantConnections++
                 │    └─ Emit: 'connected' event
                 │         │
                 │         ▼
                 │    Client receives 'connected'
                 │    └─▶ console.log('[WebSocket] Connected')
                 │
                 └─▶ ❌ Invalid → disconnect()
                      └─▶ Client receives 'connect_error'


┌────────────────────────────────────────────────────────────────┐
│  3. ACTIVE CONNECTION                                          │
└────────────────────────────────────────────────────────────────┘

Every 30 seconds:
  Server → Client: 'heartbeat' event
  └─▶ console.log('[WebSocket] Heartbeat received')


Manual ping (optional):
  Client → Server: 'ping' event
  Server → Client: 'pong' event


Event streaming:
  Server → Client: 'email:update', 'calendar:event_new', etc.
  └─▶ Handlers in useWebSocket process events
       └─▶ Update Zustand stores
            └─▶ React components re-render


┌────────────────────────────────────────────────────────────────┐
│  4. DISCONNECTION                                              │
└────────────────────────────────────────────────────────────────┘

User closes tab/browser:
  └─▶ handleDisconnect()
       ├─ activeTenantConnections[tenantId]--
       ├─ If count === 0: delete from map
       └─ Log: "[WS] Client disconnected"


Component unmounts:
  └─▶ useWebSocket cleanup
       └─▶ All event listeners unsubscribed
            └─▶ websocketClient.disconnect()


Network error:
  └─▶ Auto-reconnection (Socket.IO)
       ├─ Attempt 1: Wait 1000ms → Retry
       ├─ Attempt 2: Wait 2000ms → Retry
       ├─ Attempt 3: Wait 4000ms → Retry
       └─ Attempt 4-5: Wait 5000ms → Retry
            └─▶ If all fail → 'connect_error' event
```

---

## 📊 Optimization: Skip Inactive Tenants

### Performance Optimization Flow

```
┌────────────────────────────────────────────────────────────────┐
│  SCENARIO: Background Email Sync                               │
└────────────────────────────────────────────────────────────────┘

Sync Worker processes 1000 emails for 100 different tenants
  └─▶ For each email:
       └─▶ labelsService.addEmailsToLabel()
            └─▶ realtimeEvents.emitEmailUpdate(tenantId, payload)
                 │
                 └─▶ bufferEmailEvent()
                      │
                      └─▶ After 200ms: flushEmailEvents()
                           │
                           └─▶ emitToTenantImmediate()
                                │
                                ├─▶ ❌ Check: hasTenantConnections(tenant-001)?
                                │    └─▶ NO → Skip emission (0 clients)
                                │         └─▶ Saved: WebSocket transmission ✅
                                │
                                ├─▶ ✅ Check: hasTenantConnections(tenant-050)?
                                │    └─▶ YES → Emit to 2 connected clients
                                │
                                └─▶ ❌ Check: hasTenantConnections(tenant-099)?
                                     └─▶ NO → Skip emission (0 clients)
                                          └─▶ Saved: WebSocket transmission ✅


Result:
  - 1000 emails processed
  - Only 50 tenants have active connections
  - Only 50 WebSocket emissions (instead of 1000)
  - 95% reduction in WebSocket traffic ✅
```

---

## 🎯 Summary: Key Components

| Component | File | Responsibility |
|-----------|------|----------------|
| **Backend Gateway** | `realtime.gateway.ts` | WebSocket server, authentication, connection management |
| **Backend Service** | `realtime-events.service.ts` | Event emission, buffering, deduplication |
| **Backend Types** | `realtime.types.ts` | TypeScript type definitions for payloads |
| **Frontend Client** | `websocket-client.ts` | Socket.IO client wrapper, event listeners |
| **Frontend Hook** | `use-websocket.ts` | React integration, store updates |
| **Frontend Stores** | `*-store.ts` | Zustand state management (email, calendar, etc) |

---

**Creato da**: Claude Code
**Data**: 2025-11-22
