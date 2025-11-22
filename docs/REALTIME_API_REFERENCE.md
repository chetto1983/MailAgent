# Realtime API Reference

**Versione**: 1.0
**Data**: 2025-11-22
**Scopo**: Documentazione completa delle API WebSocket per comunicazione realtime tra backend e frontend

---

## 📋 Indice

1. [Architettura](#architettura)
2. [Connessione WebSocket](#connessione-websocket)
3. [Email Events](#email-events)
4. [Calendar Events](#calendar-events)
5. [Contact Events](#contact-events)
6. [AI Events](#ai-events)
7. [HITL Events](#hitl-events)
8. [Sync Events](#sync-events)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architettura

### Backend Stack
- **Framework**: NestJS + Socket.IO
- **Gateway**: `RealtimeGateway` ([realtime.gateway.ts](../backend/src/modules/realtime/gateways/realtime.gateway.ts))
- **Service**: `RealtimeEventsService` ([realtime-events.service.ts](../backend/src/modules/realtime/services/realtime-events.service.ts))
- **Namespace**: `/realtime`
- **Autenticazione**: JWT tramite handshake
- **Isolamento**: Tenant-based rooms (`tenant:{tenantId}`)

### Frontend Stack
- **Client**: Socket.IO Client
- **Wrapper**: `WebSocketClient` ([websocket-client.ts](../frontend/lib/websocket-client.ts))
- **Hook**: `useWebSocket` ([use-websocket.ts](../frontend/hooks/use-websocket.ts))
- **State Management**: Zustand stores (email, calendar, contacts, folders, sync)

### Caratteristiche Chiave
- ✅ **Buffering intelligente**: Email events buffered (200ms, max 500 eventi)
- ✅ **Deduplicazione**: Eventi duplicati vengono eliminati
- ✅ **Performance**: Eventi non vengono emessi se nessun client è connesso
- ✅ **Reconnection**: Automatica con backoff esponenziale
- ✅ **Type Safety**: TypeScript end-to-end

---

## 🔌 Connessione WebSocket

### Backend - Gateway Initialization

**File**: [realtime.gateway.ts:31-38](../backend/src/modules/realtime/gateways/realtime.gateway.ts#L31-L38)

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3001'],
    credentials: true,
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
```

### Frontend - Connection Setup

**File**: [websocket-client.ts:76-103](../frontend/lib/websocket-client.ts#L76-L103)

```typescript
const socket = io(`${backendUrl}/realtime`, {
  auth: { token: this.token },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});
```

### Eventi di Sistema

| Evento | Direzione | Payload | Descrizione |
|--------|-----------|---------|-------------|
| `connected` | Server → Client | `{ userId, tenantId, email, timestamp }` | Conferma connessione riuscita |
| `heartbeat` | Server → Client | `{ timestamp }` | Heartbeat ogni 30s |
| `ping` | Client → Server | - | Ping manuale |
| `pong` | Server → Client | `{ timestamp }` | Risposta al ping |
| `join_room` | Client → Server | `{ room: string }` | Unisciti a room aggiuntiva |
| `leave_room` | Client → Server | `{ room: string }` | Lascia una room |

---

## 📧 Email Events

### 1. `email:new` - Nuova Email

**Backend Emit**: [realtime-events.service.ts:90-92](../backend/src/modules/realtime/services/realtime-events.service.ts#L90-L92)

```typescript
emitEmailNew(tenantId: string, payload: EmailEventPayload)
```

**Payload Type**: [realtime.types.ts:10-20](../backend/src/modules/realtime/types/realtime.types.ts#L10-L20)

```typescript
interface EmailEventPayload {
  emailId?: string;           // ID database dell'email
  externalId?: string;        // ID provider esterno
  providerId: string;         // ID provider email
  folder?: string;            // Cartella (INBOX, SENT, ecc.)
  reason: EmailEventReason;   // 'message-processed'
  email?: Record<string, unknown>;  // ✅ Oggetto email completo
  updates?: Record<string, unknown>; // Modifiche parziali
  unreadCount?: number;
  threadId?: string;
}
```

**Frontend Handler**: [use-websocket.ts:69-74](../frontend/hooks/use-websocket.ts#L69-L74)

```typescript
websocketClient.onEmailNew((data) => {
  if (data.email) {
    addEmail(data.email);
  }
});
```

**Quando viene emesso**:
- Sync service riceve nuova email da provider
- Email processata e salvata nel database
- **NOTA**: Bufferizzato (200ms, max 500 eventi)

---

### 2. `email:update` - Email Aggiornata

**Backend Emit**: [realtime-events.service.ts:97-99](../backend/src/modules/realtime/services/realtime-events.service.ts#L97-L99)

```typescript
emitEmailUpdate(tenantId: string, payload: EmailEventPayload)
```

**Payload Example** (Labels Update):

```typescript
{
  emailId: "email123",
  providerId: "provider456",
  folder: "INBOX",
  reason: "labels-updated",
  email: {  // ✅ NUOVO: Oggetto email completo con emailLabels
    id: "email123",
    subject: "...",
    from: "...",
    emailLabels: [
      { label: { id: "label1", name: "Important", color: {...} } }
    ],
    // ... altri campi
  }
}
```

**Frontend Handler**: [use-websocket.ts:76-95](../frontend/hooks/use-websocket.ts#L76-L95)

```typescript
websocketClient.onEmailUpdate((data) => {
  // ✅ NUOVO: Gestisce oggetto email completo
  if (data.email) {
    updateEmail(data.emailId || data.email.id, data.email);
    return;
  }

  // Legacy: Gestisce aggiornamenti parziali
  if (data.emailId && data.updates) {
    if (data.updates.folder) {
      deleteEmail(data.emailId); // Email spostata → rimuovi dalla lista
      return;
    }
    updateEmail(data.emailId, data.updates);
  }
});
```

**Quando viene emesso**:
- Email marcata come letta/non letta
- Email marcata come starred
- Email etichettata (labels-updated) ✅
- Email spostata di cartella
- **NOTA**: Bufferizzato (200ms, max 500 eventi)

**Esempi Concreti**:

| Operazione | Reason | Payload Email | Payload Updates |
|------------|--------|---------------|-----------------|
| Mark as Read | `message-processed` | ❌ No | ✅ `{ isRead: true }` |
| Add Label | `labels-updated` | ✅ Email completa | ❌ No |
| Move Folder | `labels-updated` | ✅ Email completa | ❌ No |

---

### 3. `email:delete` - Email Eliminata

**Backend Emit**: [realtime-events.service.ts:104-106](../backend/src/modules/realtime/services/realtime-events.service.ts#L104-L106)

**Payload**:
```typescript
{
  emailId: "email123",
  providerId: "provider456",
  folder: "INBOX",
  reason: "message-deleted"
}
```

**Frontend Handler**: [use-websocket.ts:97-102](../frontend/hooks/use-websocket.ts#L97-L102)

```typescript
websocketClient.onEmailDelete((data) => {
  if (data.emailId) {
    deleteEmail(data.emailId);
  }
});
```

---

### 4. `email:unread_count_update` - Contatore Non Lette

**Backend Emit**: [realtime-events.service.ts:111-116](../backend/src/modules/realtime/services/realtime-events.service.ts#L111-L116)

**Payload**: [realtime.types.ts:84](../backend/src/modules/realtime/types/realtime.types.ts#L84)

```typescript
{
  folder: "INBOX",
  count: 42,
  providerId: "provider123"
}
```

**Frontend Handler**: [use-websocket.ts:95-98](../frontend/hooks/use-websocket.ts#L95-L98)

```typescript
websocketClient.onUnreadCountUpdate((data) => {
  setUnreadCount(data.count);
});
```

**Quando viene emesso**:
- Email marcata come letta/non letta
- Nuova email ricevuta
- Email eliminata

---

### 5. `email:folder_counts_update` - Conteggi Cartelle

**Backend Emit**: [realtime-events.service.ts:121-152](../backend/src/modules/realtime/services/realtime-events.service.ts#L121-L152)

**Payload**: [realtime.types.ts:85-91](../backend/src/modules/realtime/types/realtime.types.ts#L85-L91)

```typescript
{
  providerId: "provider123",
  folderId: "folder456",
  folderName: "INBOX",
  totalCount: 1523,
  unreadCount: 42,
  timestamp: "2025-11-22T10:30:00Z"
}
```

**Frontend Handler**: [use-websocket.ts:100-107](../frontend/hooks/use-websocket.ts#L100-L107)

```typescript
websocketClient.onFolderCountsUpdate((data) => {
  updateFolderCounts(data.providerId, data.folderId, {
    totalCount: data.totalCount,
    unreadCount: data.unreadCount,
    folderName: data.folderName,
  });
});
```

**Caratteristiche**:
- ✅ **Deduplicazione**: Eventi con stessi conteggi vengono skippati
- ✅ **Buffering**: 250ms, max 200 eventi per provider
- ✅ **Ottimizzazione**: Solo l'ultimo evento per cartella viene emesso

---

### 6. `email:thread_update` - Aggiornamento Thread

**Backend Emit**: [realtime-events.service.ts:157-162](../backend/src/modules/realtime/services/realtime-events.service.ts#L157-L162)

**Payload**: [realtime.types.ts:93](../backend/src/modules/realtime/types/realtime.types.ts#L93)

```typescript
{
  threadId: "thread123",
  emailIds: ["email1", "email2", "email3"]
}
```

**Frontend Handler**: [websocket-client.ts:221-225](../frontend/lib/websocket-client.ts#L221-L225)

```typescript
websocketClient.onThreadUpdate((data) => {
  // TODO: Implementare logica di aggiornamento thread
  console.log('[WS] Thread update:', data);
});
```

⚠️ **NOTA**: Handler frontend presente ma **non implementato completamente** negli store.

---

### 7. `email:batch_processed` - Batch Processing

**Backend Emit**: [realtime-events.service.ts:167-169](../backend/src/modules/realtime/services/realtime-events.service.ts#L167-L169)

**Payload**: [realtime.types.ts:78-83](../backend/src/modules/realtime/types/realtime.types.ts#L78-L83)

```typescript
{
  providerId: "provider123",
  processed: 1500,
  created?: 50,
  syncType?: "full" | "incremental"
}
```

**Frontend**: ⚠️ **NON IMPLEMENTATO** - Nessun handler nel client

**Quando viene emesso**:
- Sync completa senza eventi granulari
- Import iniziale di molte email
- Full sync periodica

---

## 📅 Calendar Events

### 1. `calendar:event_new` - Nuovo Evento Calendario

**Backend Emit**: [realtime-events.service.ts:178-180](../backend/src/modules/realtime/services/realtime-events.service.ts#L178-L180)

**Payload**: [realtime.types.ts:22-30](../backend/src/modules/realtime/types/realtime.types.ts#L22-L30)

```typescript
{
  eventId?: "event123",
  externalId?: "ext456",
  calendarId: "cal789",
  providerId?: "provider123",
  reason: "event-created",
  event?: {
    // Oggetto evento completo
  }
}
```

**Frontend Handler**: [use-websocket.ts:110-115](../frontend/hooks/use-websocket.ts#L110-L115)

```typescript
websocketClient.onCalendarEventNew((data) => {
  if (data.event) {
    addEvent(data.event);
  }
});
```

**Esempio Concreto**: [calendar.service.ts:211-217](../backend/src/modules/calendar/services/calendar.service.ts#L211-L217)

```typescript
this.realtimeEvents.emitCalendarEventNew(tenantId, {
  providerId: provider.id,
  eventId: event.id,
  externalId: event.externalId,
  calendarId: event.calendarId,
  reason: 'event-created',
});
```

---

### 2. `calendar:event_update` - Evento Aggiornato

**Backend Emit**: [realtime-events.service.ts:185-187](../backend/src/modules/realtime/services/realtime-events.service.ts#L185-L187)

**Frontend Handler**: [use-websocket.ts:117-122](../frontend/hooks/use-websocket.ts#L117-L122)

```typescript
websocketClient.onCalendarEventUpdate((data) => {
  if (data.eventId && data.updates) {
    updateEvent(data.eventId, data.updates);
  }
});
```

---

### 3. `calendar:event_delete` - Evento Eliminato

**Backend Emit**: [realtime-events.service.ts:192-194](../backend/src/modules/realtime/services/realtime-events.service.ts#L192-L194)

**Frontend Handler**: [use-websocket.ts:124-129](../frontend/hooks/use-websocket.ts#L124-L129)

```typescript
websocketClient.onCalendarEventDelete((data) => {
  if (data.eventId) {
    deleteEvent(data.eventId);
  }
});
```

---

## 👥 Contact Events

### Struttura Payload

**Type**: [realtime.types.ts:32-39](../backend/src/modules/realtime/types/realtime.types.ts#L32-L39)

```typescript
interface ContactEventPayload {
  contactId?: string;
  externalId?: string;
  providerId?: string;
  reason: 'contact-created' | 'contact-updated' | 'contact-deleted';
  contact?: Record<string, unknown>;
  updates?: Record<string, unknown>;
}
```

### Eventi Disponibili

| Evento | Backend Emit | Frontend Handler |
|--------|--------------|------------------|
| `contact:new` | ✅ [realtime-events.service.ts:203-205](../backend/src/modules/realtime/services/realtime-events.service.ts#L203-L205) | ✅ [use-websocket.ts:132-137](../frontend/hooks/use-websocket.ts#L132-L137) |
| `contact:update` | ✅ [realtime-events.service.ts:210-212](../backend/src/modules/realtime/services/realtime-events.service.ts#L210-L212) | ✅ [use-websocket.ts:139-144](../frontend/hooks/use-websocket.ts#L139-L144) |
| `contact:delete` | ✅ [realtime-events.service.ts:217-219](../backend/src/modules/realtime/services/realtime-events.service.ts#L217-L219) | ✅ [use-websocket.ts:146-151](../frontend/hooks/use-websocket.ts#L146-L151) |

---

## 🤖 AI Events

### Struttura Payload

**Type**: [realtime.types.ts:41-60](../backend/src/modules/realtime/types/realtime.types.ts#L41-L60)

```typescript
interface AIEventPayload {
  type: 'classification' | 'task_suggestion' | 'insight';
  emailId?: string;
  classification?: {
    category: string;
    priority: string;
    sentiment: string;
    confidence: number;
  };
  task?: {
    title: string;
    description: string;
    dueDate?: string;
    priority: string;
  };
  insight?: {
    message: string;
    actionable: boolean;
  };
}
```

### Eventi Disponibili

| Evento | Backend Emit | Frontend Handler | Implementazione Store |
|--------|--------------|------------------|----------------------|
| `ai:classification_done` | ✅ [realtime-events.service.ts:228-230](../backend/src/modules/realtime/services/realtime-events.service.ts#L228-L230) | ✅ [websocket-client.ts:285-289](../frontend/lib/websocket-client.ts#L285-L289) | ⚠️ NON IMPLEMENTATO |
| `ai:task_suggest` | ✅ [realtime-events.service.ts:235-237](../backend/src/modules/realtime/services/realtime-events.service.ts#L235-L237) | ✅ [websocket-client.ts:291-295](../frontend/lib/websocket-client.ts#L291-L295) | ⚠️ NON IMPLEMENTATO |
| `ai:insight` | ✅ [realtime-events.service.ts:242-244](../backend/src/modules/realtime/services/realtime-events.service.ts#L242-L244) | ✅ [websocket-client.ts:297-301](../frontend/lib/websocket-client.ts#L297-L301) | ⚠️ NON IMPLEMENTATO |

⚠️ **IMPORTANTE**: Gli eventi AI sono definiti e gestiti lato client ma **non sono collegati a nessuno store**. Quando implementati, dovranno aggiornare uno store AI dedicato.

---

## 🔄 HITL (Human-In-The-Loop) Events

### Struttura Payload

**Type**: [realtime.types.ts:62-72](../backend/src/modules/realtime/types/realtime.types.ts#L62-L72)

```typescript
interface HITLEventPayload {
  type: 'approval_required' | 'approval_granted' | 'approval_denied';
  taskId: string;
  task: {
    title: string;
    description: string;
    type: string;
    context?: Record<string, unknown>;
  };
  approvalId?: string;
}
```

### Eventi Disponibili

| Evento | Backend Emit | Frontend Handler | Implementazione Store |
|--------|--------------|------------------|----------------------|
| `hitl:approval_required` | ✅ [realtime-events.service.ts:253-255](../backend/src/modules/realtime/services/realtime-events.service.ts#L253-L255) | ✅ [websocket-client.ts:307-311](../frontend/lib/websocket-client.ts#L307-L311) | ⚠️ NON IMPLEMENTATO |
| `hitl:approval_granted` | ✅ [realtime-events.service.ts:260-262](../backend/src/modules/realtime/services/realtime-events.service.ts#L260-L262) | ✅ [websocket-client.ts:313-317](../frontend/lib/websocket-client.ts#L313-L317) | ⚠️ NON IMPLEMENTATO |
| `hitl:approval_denied` | ✅ [realtime-events.service.ts:267-269](../backend/src/modules/realtime/services/realtime-events.service.ts#L267-L269) | ✅ [websocket-client.ts:319-323](../frontend/lib/websocket-client.ts#L319-L323) | ⚠️ NON IMPLEMENTATO |

⚠️ **IMPORTANTE**: Gli eventi HITL sono definiti e gestiti lato client ma **non sono collegati a nessuno store**. Richiederanno uno store HITL dedicato per gestire approvazioni e task.

---

## 🔄 Sync Events

### `sync:status` - Stato Sincronizzazione

**Backend Emit**: [realtime-events.service.ts:278-280](../backend/src/modules/realtime/services/realtime-events.service.ts#L278-L280)

**Payload**: [realtime.types.ts:106-113](../backend/src/modules/realtime/types/realtime.types.ts#L106-L113)

```typescript
{
  providerId: "provider123",
  status: "started" | "in_progress" | "completed" | "failed",
  progress?: 75,        // Percentuale 0-100
  error?: "Error message",
  processed?: 1500,
  total?: 2000
}
```

**Frontend Handler**: [use-websocket.ts:154-163](../frontend/hooks/use-websocket.ts#L154-L163)

```typescript
websocketClient.onSyncStatus((data) => {
  setSyncStatus({
    providerId: data.providerId,
    status: data.status,
    progress: data.progress,
    error: data.error,
    timestamp: data.timestamp,
  });
});
```

**Store**: `useSyncStore` ✅ **IMPLEMENTATO**

**Quando viene emesso**:
- Inizio sincronizzazione: `status: "started"`
- Durante sync: `status: "in_progress"`, con `progress` e `processed`/`total`
- Completamento: `status: "completed"`
- Errore: `status: "failed"`, con `error` message

---

## 📚 Best Practices

### Backend - Emissione Eventi

#### ✅ DO

```typescript
// 1. Verifica connessioni attive prima di emettere
if (this.realtimeEvents.hasTenantConnections(tenantId)) {
  this.realtimeEvents.emitEmailUpdate(tenantId, payload);
}

// 2. Includi sempre l'oggetto completo per eventi update
this.realtimeEvents.emitEmailUpdate(tenantId, {
  emailId: email.id,
  providerId: email.providerId,
  folder: email.folder,
  reason: 'labels-updated',
  email: email,  // ✅ Oggetto completo
});

// 3. Usa reason codes specifici
reason: 'labels-updated'  // ✅ Specifico
reason: 'message-processed'  // ✅ Specifico
```

#### ❌ DON'T

```typescript
// 1. Non emettere senza verificare connessioni
this.realtimeEvents.emitEmailUpdate(tenantId, payload);  // ❌

// 2. Non omettere l'oggetto email per update
this.realtimeEvents.emitEmailUpdate(tenantId, {
  emailId: email.id,
  reason: 'labels-updated',
  // ❌ Manca email object - frontend non può aggiornare
});

// 3. Non usare reason codes generici
reason: 'update'  // ❌ Troppo generico
```

---

### Frontend - Gestione Eventi

#### ✅ DO

```typescript
// 1. Gestisci entrambi i formati (completo e parziale)
websocketClient.onEmailUpdate((data) => {
  if (data.email) {
    updateEmail(data.emailId || data.email.id, data.email);
    return;
  }
  if (data.emailId && data.updates) {
    updateEmail(data.emailId, data.updates);
  }
});

// 2. Pulisci sempre i listener
useEffect(() => {
  const unsub = websocketClient.onEmailNew(handler);
  return () => unsub();  // ✅ Cleanup
}, []);

// 3. Gestisci errori di connessione
websocketClient.connect(token)
  .catch(err => {
    console.error('WebSocket connection failed:', err);
    // Fallback a polling o notifica utente
  });
```

#### ❌ DON'T

```typescript
// 1. Non assumere formato fisso
websocketClient.onEmailUpdate((data) => {
  updateEmail(data.emailId, data.updates);  // ❌ Assume sempre updates
});

// 2. Non dimenticare cleanup
useEffect(() => {
  websocketClient.onEmailNew(handler);  // ❌ Memory leak
}, []);

// 3. Non ignorare errori di connessione
websocketClient.connect(token);  // ❌ No error handling
```

---

## 🔍 Troubleshooting

### Problema: Eventi non ricevuti

**Checklist**:

1. ✅ Verifica connessione WebSocket
```typescript
console.log('[WS] Connected:', websocketClient.isConnected());
```

2. ✅ Verifica token valido
```typescript
const { token } = useAuthStore();
console.log('[WS] Token:', token ? 'Present' : 'Missing');
```

3. ✅ Verifica tenant room corretta
```typescript
// Backend log:
[WS] Client connected: ... | Tenant: {tenantId} | Room: tenant:{tenantId}
```

4. ✅ Verifica backend emette eventi
```typescript
// Backend RealtimeEventsService ha logging:
this.logger.debug(`Emitted ${event} to room ${room}`, payload);
```

5. ✅ Verifica buffering
```typescript
// Email events sono bufferizzati 200ms
// Attendi almeno 200ms per vedere l'evento
```

---

### Problema: Email update non aggiorna UI

**Causa Comune**: Payload mancante di `email` object

**Soluzione**:
```typescript
// Backend DEVE includere:
this.realtimeEvents.emitEmailUpdate(tenantId, {
  emailId: email.id,
  providerId: email.providerId,
  folder: email.folder,
  reason: 'labels-updated',
  email: email,  // ✅ NECESSARIO
});
```

---

### Problema: Troppe connessioni / Memory leak

**Causa**: Listener non puliti

**Soluzione**:
```typescript
useEffect(() => {
  const unsubEmailNew = websocketClient.onEmailNew(handler1);
  const unsubEmailUpdate = websocketClient.onEmailUpdate(handler2);

  return () => {
    unsubEmailNew();    // ✅ Cleanup
    unsubEmailUpdate(); // ✅ Cleanup
  };
}, [dependencies]);
```

---

## 📊 Tabella Riepilogativa Eventi

| Categoria | Evento | Backend | Frontend | Store | Buffering |
|-----------|--------|---------|----------|-------|-----------|
| **Email** | `email:new` | ✅ | ✅ | ✅ | ✅ 200ms |
| | `email:update` | ✅ | ✅ | ✅ | ✅ 200ms |
| | `email:delete` | ✅ | ✅ | ✅ | ✅ 200ms |
| | `email:unread_count_update` | ✅ | ✅ | ✅ | ❌ |
| | `email:folder_counts_update` | ✅ | ✅ | ✅ | ✅ 250ms |
| | `email:thread_update` | ✅ | ✅ | ⚠️ Parziale | ❌ |
| | `email:batch_processed` | ✅ | ❌ | ❌ | ❌ |
| **Calendar** | `calendar:event_new` | ✅ | ✅ | ✅ | ❌ |
| | `calendar:event_update` | ✅ | ✅ | ✅ | ❌ |
| | `calendar:event_delete` | ✅ | ✅ | ✅ | ❌ |
| **Contacts** | `contact:new` | ✅ | ✅ | ✅ | ❌ |
| | `contact:update` | ✅ | ✅ | ✅ | ❌ |
| | `contact:delete` | ✅ | ✅ | ✅ | ❌ |
| **AI** | `ai:classification_done` | ✅ | ✅ | ❌ | ❌ |
| | `ai:task_suggest` | ✅ | ✅ | ❌ | ❌ |
| | `ai:insight` | ✅ | ✅ | ❌ | ❌ |
| **HITL** | `hitl:approval_required` | ✅ | ✅ | ❌ | ❌ |
| | `hitl:approval_granted` | ✅ | ✅ | ❌ | ❌ |
| | `hitl:approval_denied` | ✅ | ✅ | ❌ | ❌ |
| **Sync** | `sync:status` | ✅ | ✅ | ✅ | ❌ |

**Legenda**:
- ✅ = Implementato e funzionante
- ⚠️ = Implementato parzialmente
- ❌ = Non implementato

---

## 🚀 TODO - Sviluppo Futuro

### Priorità Alta

1. **Implementare Store AI** ❌
   - File: `frontend/stores/ai-store.ts`
   - Eventi: `ai:classification_done`, `ai:task_suggest`, `ai:insight`
   - Integrare con `use-websocket.ts`

2. **Implementare Store HITL** ❌
   - File: `frontend/stores/hitl-store.ts`
   - Eventi: `hitl:approval_required`, `hitl:approval_granted`, `hitl:approval_denied`
   - Integrare con `use-websocket.ts`

3. **Completare Thread Update** ⚠️
   - File: `frontend/stores/email-store.ts`
   - Aggiungere metodo `updateThread(threadId, emailIds)`
   - Collegare handler in `use-websocket.ts`

### Priorità Media

4. **Implementare Batch Processed** ❌
   - Decidere strategia: refresh lista o mostrare notifica
   - Aggiungere handler in `use-websocket.ts`

5. **Ottimizzare Buffering** 🔧
   - Configurabili via environment variables
   - Dashboard admin per monitoraggio

### Priorità Bassa

6. **Metrics & Monitoring** 📊
   - Tracciare latenza eventi
   - Contatori eventi emessi/ricevuti
   - Dashboard realtime

7. **Testing** 🧪
   - Unit tests per buffering
   - Integration tests WebSocket
   - E2E tests eventi realtime

---

## 📝 Change Log

### 2025-11-22 - v1.0
- ✅ Corretta discrepanza `email:update` - aggiunto oggetto `email` nel payload
- ✅ Frontend handler aggiornato per gestire sia `email` che `updates`
- ✅ Abilitato WebSocket in `Mailbox.tsx`
- ✅ Documentazione completa API realtime
- ✅ Verificata compatibilità TypeScript backend/frontend

---

## 📚 Risorse

- **Backend Gateway**: [realtime.gateway.ts](../backend/src/modules/realtime/gateways/realtime.gateway.ts)
- **Backend Service**: [realtime-events.service.ts](../backend/src/modules/realtime/services/realtime-events.service.ts)
- **Backend Types**: [realtime.types.ts](../backend/src/modules/realtime/types/realtime.types.ts)
- **Frontend Client**: [websocket-client.ts](../frontend/lib/websocket-client.ts)
- **Frontend Hook**: [use-websocket.ts](../frontend/hooks/use-websocket.ts)
- **Socket.IO Docs**: https://socket.io/docs/v4/

---

**Documento compilato da**: Claude Code
**Ultima revisione**: 2025-11-22
