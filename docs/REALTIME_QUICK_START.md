# Realtime API - Quick Start Guide

**Per sviluppatori**: Guida rapida per aggiungere nuovi eventi realtime

---

## 🚀 Come Aggiungere un Nuovo Evento Realtime

### Esempio: Implementare `task:new` Event

Seguire questi 5 step per aggiungere un nuovo evento realtime al sistema.

---

## Step 1: Definire Payload Type (Backend)

**File**: `backend/src/modules/realtime/types/realtime.types.ts`

```typescript
// 1. Definisci il payload type
export interface TaskEventPayload {
  taskId?: string;
  externalId?: string;
  providerId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  task?: Record<string, unknown>;  // Oggetto task completo
  updates?: Record<string, unknown>;  // Modifiche parziali
}

// 2. Aggiungi all'interfaccia RealtimeEventPayloads
export interface RealtimeEventPayloads {
  // ... eventi esistenti ...

  // Nuovi eventi task
  'task:new': TaskEventPayload;
  'task:update': TaskEventPayload;
  'task:delete': TaskEventPayload;
}
```

---

## Step 2: Aggiungere Metodi Emit (Backend)

**File**: `backend/src/modules/realtime/services/realtime-events.service.ts`

```typescript
// Aggiungi alla sezione imports
import {
  TaskEventPayload,  // ← Nuovo
  // ... altri imports
} from '../types/realtime.types';

// Aggiungi ai re-exports
export type {
  TaskEventPayload,  // ← Nuovo
  // ... altri exports
} from '../types/realtime.types';

// Aggiungi i metodi emit
export class RealtimeEventsService {
  // ... codice esistente ...

  /**
   * TASK EVENTS
   */

  /**
   * Emette evento per nuovo task
   */
  emitTaskNew(tenantId: string, payload: TaskEventPayload) {
    this.emitToTenant(tenantId, 'task:new', payload);
  }

  /**
   * Emette evento per task aggiornato
   */
  emitTaskUpdate(tenantId: string, payload: TaskEventPayload) {
    this.emitToTenant(tenantId, 'task:update', payload);
  }

  /**
   * Emette evento per task eliminato
   */
  emitTaskDelete(tenantId: string, payload: TaskEventPayload) {
    this.emitToTenant(tenantId, 'task:delete', payload);
  }
}
```

---

## Step 3: Usare nel Service (Backend)

**File**: `backend/src/modules/tasks/services/tasks.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly realtimeEvents: RealtimeEventsService,
  ) {}

  async createTask(tenantId: string, dto: CreateTaskDto) {
    // 1. Crea il task nel database
    const task = await this.prisma.task.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        priority: dto.priority,
        status: 'pending',
      },
    });

    // 2. Emetti evento realtime
    this.realtimeEvents.emitTaskNew(tenantId, {
      taskId: task.id,
      providerId: task.providerId,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      task: task,  // ✅ Include oggetto completo
    });

    return task;
  }

  async updateTask(tenantId: string, taskId: string, dto: UpdateTaskDto) {
    // 1. Aggiorna nel database
    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: dto,
    });

    // 2. Emetti evento realtime
    this.realtimeEvents.emitTaskUpdate(tenantId, {
      taskId: task.id,
      providerId: task.providerId,
      title: task.title,
      priority: task.priority,
      status: task.status,
      task: task,  // ✅ Include oggetto completo per frontend
    });

    return task;
  }

  async deleteTask(tenantId: string, taskId: string) {
    // 1. Elimina dal database
    await this.prisma.task.delete({
      where: { id: taskId },
    });

    // 2. Emetti evento realtime
    this.realtimeEvents.emitTaskDelete(tenantId, {
      taskId: taskId,
    });
  }
}
```

**⚠️ IMPORTANTE**: Ricorda di aggiungere `RealtimeModule` agli imports del tuo module!

```typescript
// backend/src/modules/tasks/tasks.module.ts
import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RealtimeModule],  // ✅ NECESSARIO
  // ... providers, controllers, exports
})
export class TasksModule {}
```

---

## Step 4: Definire Types Frontend

**File**: `frontend/lib/websocket-client.ts`

```typescript
// 1. Definisci interface
export interface RealtimeTaskEvent {
  taskId?: string;
  externalId?: string;
  providerId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  task?: any;      // Oggetto task completo
  updates?: any;   // Modifiche parziali
  timestamp: string;
}

// 2. Aggiungi metodi handler
class WebSocketClient {
  // ... codice esistente ...

  /**
   * TASK EVENTS
   */

  onTaskNew(handler: EventHandler<RealtimeTaskEvent>): () => void {
    if (!this.socket) return () => {};
    this.socket.on('task:new', handler);
    return () => this.socket?.off('task:new', handler);
  }

  onTaskUpdate(handler: EventHandler<RealtimeTaskEvent>): () => void {
    if (!this.socket) return () => {};
    this.socket.on('task:update', handler);
    return () => this.socket?.off('task:update', handler);
  }

  onTaskDelete(handler: EventHandler<RealtimeTaskEvent>): () => void {
    if (!this.socket) return () => {};
    this.socket.on('task:delete', handler);
    return () => this.socket?.off('task:delete', handler);
  }
}
```

---

## Step 5: Creare Store e Integrare Hook (Frontend)

### A. Creare Store Zustand

**File**: `frontend/stores/task-store.ts`

```typescript
import { create } from 'zustand';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  isLoading: false,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      ),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),
}));
```

### B. Integrare in useWebSocket Hook

**File**: `frontend/hooks/use-websocket.ts`

```typescript
import { useTaskStore } from '@/stores/task-store';  // ← Nuovo import

export function useWebSocket(token: string | null, enabled = true) {
  // ... altri stores ...
  const { addTask, updateTask, deleteTask } = useTaskStore();  // ← Nuovo

  useEffect(() => {
    // ... codice esistente ...

    // TASK EVENTS
    const unsubTaskNew = websocketClient.onTaskNew((data) => {
      console.log('[WS] Task new:', data);
      if (data.task) {
        addTask(data.task);
      }
    });

    const unsubTaskUpdate = websocketClient.onTaskUpdate((data) => {
      console.log('[WS] Task update:', data);

      // Gestisci oggetto completo (nuovo formato)
      if (data.task) {
        updateTask(data.taskId || data.task.id, data.task);
        return;
      }

      // Gestisci aggiornamenti parziali (legacy)
      if (data.taskId && data.updates) {
        updateTask(data.taskId, data.updates);
      }
    });

    const unsubTaskDelete = websocketClient.onTaskDelete((data) => {
      console.log('[WS] Task delete:', data);
      if (data.taskId) {
        deleteTask(data.taskId);
      }
    });

    // Cleanup
    return () => {
      // ... altri cleanup ...
      unsubTaskNew();
      unsubTaskUpdate();
      unsubTaskDelete();
    };
  }, [
    // ... dependencies esistenti ...
    addTask,
    updateTask,
    deleteTask,
  ]);
}
```

---

## ✅ Checklist Implementazione

Usa questa checklist per verificare di aver completato tutti i passaggi:

### Backend
- [ ] Definito `TaskEventPayload` in `realtime.types.ts`
- [ ] Aggiunto eventi a `RealtimeEventPayloads` interface
- [ ] Implementati metodi `emitTaskNew/Update/Delete` in `RealtimeEventsService`
- [ ] Aggiunto `RealtimeModule` agli imports del `TasksModule`
- [ ] Chiamato `this.realtimeEvents.emitTaskNew()` nel service
- [ ] Incluso oggetto `task` completo nel payload

### Frontend
- [ ] Definito `RealtimeTaskEvent` interface in `websocket-client.ts`
- [ ] Implementati metodi `onTaskNew/Update/Delete` in `WebSocketClient`
- [ ] Creato `task-store.ts` con actions CRUD
- [ ] Aggiunto handler eventi in `use-websocket.ts`
- [ ] Gestito sia formato completo (`data.task`) che parziale (`data.updates`)
- [ ] Aggiunto cleanup dei listener

### Testing
- [ ] Testato creazione task → evento `task:new` ricevuto
- [ ] Testato aggiornamento task → evento `task:update` ricevuto
- [ ] Testato eliminazione task → evento `task:delete` ricevuto
- [ ] Verificato che UI si aggiorni automaticamente
- [ ] Testato con multiple tabs aperte (multi-client)
- [ ] Testato reconnection dopo disconnessione

---

## 🎯 Best Practices

### 1. Includi sempre l'oggetto completo per Update
```typescript
// ✅ CORRETTO
this.realtimeEvents.emitTaskUpdate(tenantId, {
  taskId: task.id,
  task: task,  // ✅ Oggetto completo
});

// ❌ SBAGLIATO
this.realtimeEvents.emitTaskUpdate(tenantId, {
  taskId: task.id,
  // ❌ Manca task object - frontend non può aggiornare
});
```

### 2. Gestisci entrambi i formati nel frontend
```typescript
// ✅ CORRETTO - Backward compatible
if (data.task) {
  updateTask(data.taskId || data.task.id, data.task);
  return;
}
if (data.taskId && data.updates) {
  updateTask(data.taskId, data.updates);
}

// ❌ SBAGLIATO - Assume sempre un formato
updateTask(data.taskId, data.updates);  // ❌ Se arriva data.task, fallisce
```

### 3. Pulisci sempre i listener
```typescript
// ✅ CORRETTO
useEffect(() => {
  const unsub = websocketClient.onTaskNew(handler);
  return () => unsub();  // ✅ Cleanup
}, []);

// ❌ SBAGLIATO
useEffect(() => {
  websocketClient.onTaskNew(handler);  // ❌ Memory leak
}, []);
```

### 4. Log degli eventi per debugging
```typescript
// ✅ Utile per debugging
websocketClient.onTaskNew((data) => {
  console.log('[WS] Task new:', data);  // ✅ Log payload
  addTask(data.task);
});
```

### 5. Verifica connessioni attive prima di emettere (Backend)
```typescript
// ✅ OTTIMIZZATO - Non emette se nessun client connesso
if (this.realtimeEvents.hasTenantConnections(tenantId)) {
  this.realtimeEvents.emitTaskNew(tenantId, payload);
}

// ⚠️ FUNZIONA MA SPRECA RISORSE
this.realtimeEvents.emitTaskNew(tenantId, payload);
// Il metodo internamente fa il check, ma meglio farlo esplicitamente
```

---

## 🔧 Debug Tips

### Verificare che gli eventi vengano emessi (Backend)

Aggiungi logging nel service:

```typescript
async createTask(tenantId: string, dto: CreateTaskDto) {
  const task = await this.prisma.task.create({ ... });

  console.log('[Tasks] Emitting task:new event:', {
    tenantId,
    taskId: task.id,
    hasConnections: this.realtimeEvents.hasTenantConnections(tenantId)
  });

  this.realtimeEvents.emitTaskNew(tenantId, { ... });

  return task;
}
```

### Verificare che gli eventi vengano ricevuti (Frontend)

Aggiungi logging nell'handler:

```typescript
websocketClient.onTaskNew((data) => {
  console.log('[WS] ✅ Task new received:', {
    taskId: data.taskId,
    title: data.title,
    hasTaskObject: !!data.task,
    timestamp: data.timestamp,
  });
  addTask(data.task);
});
```

### Verificare WebSocket connesso

```typescript
// Nel componente React
useEffect(() => {
  console.log('[WS] Connected:', websocketClient.isConnected());
  console.log('[WS] Token:', token ? 'Present' : 'Missing');
}, [token]);
```

---

## 🚨 Errori Comuni

### 1. "Eventi non ricevuti nel frontend"

**Causa**: RealtimeModule non importato nel module

**Soluzione**:
```typescript
// task.module.ts
@Module({
  imports: [RealtimeModule],  // ✅ Aggiungi questo
  // ...
})
```

---

### 2. "Frontend riceve evento ma non aggiorna UI"

**Causa**: Handler non collegato allo store o oggetto `task` mancante nel payload

**Soluzione**:
```typescript
// Backend - Includi task object
this.realtimeEvents.emitTaskNew(tenantId, {
  taskId: task.id,
  task: task,  // ✅ NECESSARIO
});

// Frontend - Verifica handler collegato
const { addTask } = useTaskStore();  // ✅ Importa action
websocketClient.onTaskNew((data) => {
  addTask(data.task);  // ✅ Chiama action
});
```

---

### 3. "Memory leak / Troppi listener"

**Causa**: Listener non puliti nel useEffect

**Soluzione**:
```typescript
useEffect(() => {
  const unsub1 = websocketClient.onTaskNew(handler);
  const unsub2 = websocketClient.onTaskUpdate(handler);

  return () => {
    unsub1();  // ✅ Cleanup
    unsub2();  // ✅ Cleanup
  };
}, [dependencies]);
```

---

## 📚 Riferimenti

- **Documentazione Completa**: [REALTIME_API_REFERENCE.md](./REALTIME_API_REFERENCE.md)
- **Esempio Concreto Labels**: [labels.service.ts](../backend/src/modules/labels/services/labels.service.ts)
- **Socket.IO Emit**: https://socket.io/docs/v4/emitting-events/
- **Socket.IO Listen**: https://socket.io/docs/v4/listening-to-events/

---

**Creato da**: Claude Code
**Data**: 2025-11-22
