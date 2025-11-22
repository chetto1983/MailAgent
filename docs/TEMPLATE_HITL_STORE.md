# Template: HITL Store Implementation

**File da creare**: `frontend/stores/hitl-store.ts`

Questo template mostra l'implementazione completa dello store HITL (Human-In-The-Loop) mancante.

---

## 📁 File: `frontend/stores/hitl-store.ts`

```typescript
import { create } from 'zustand';

/**
 * HITL Task Type
 */
export type HITLTaskType =
  | 'email_send'          // Richiesta invio email
  | 'calendar_event'      // Richiesta creazione evento
  | 'contact_update'      // Richiesta aggiornamento contatto
  | 'data_export'         // Richiesta export dati
  | 'account_action'      // Azione account critica
  | string;               // Tipo custom

/**
 * HITL Approval Status
 */
export type HITLApprovalStatus =
  | 'pending'             // In attesa di approvazione
  | 'approved'            // Approvata
  | 'denied'              // Negata
  | 'expired';            // Scaduta

/**
 * HITL Task Context
 */
export interface HITLTaskContext {
  emailId?: string;
  subject?: string;
  recipients?: string[];
  eventTitle?: string;
  contactId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * HITL Approval
 */
export interface HITLApproval {
  approvalId: string;
  taskId: string;
  type: HITLTaskType;
  status: HITLApprovalStatus;

  // Task details
  task: {
    title: string;
    description: string;
    type: string;
    context?: HITLTaskContext;
  };

  // Timestamps
  requestedAt: string;
  expiresAt?: string;
  respondedAt?: string;

  // Response
  approvedBy?: string;
  deniedBy?: string;
  denialReason?: string;

  // Priority
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface HITLState {
  // Data
  pendingApprovals: HITLApproval[];
  approvalHistory: HITLApproval[];

  // UI State
  unreadCount: number;
  drawerOpen: boolean;
  selectedApprovalId: string | null;

  // Filters
  filter: 'all' | 'pending' | 'approved' | 'denied';

  // Actions - Approvals
  addPendingApproval: (approval: HITLApproval) => void;
  approveTask: (approvalId: string, approvedBy: string) => void;
  denyTask: (approvalId: string, deniedBy: string, reason?: string) => void;
  expireApproval: (approvalId: string) => void;

  // Actions - Queries
  getPendingApprovals: () => HITLApproval[];
  getApprovalById: (approvalId: string) => HITLApproval | undefined;
  getApprovalsByType: (type: HITLTaskType) => HITLApproval[];
  getHighPriorityApprovals: () => HITLApproval[];

  // Actions - UI
  setDrawerOpen: (open: boolean) => void;
  setSelectedApproval: (approvalId: string | null) => void;
  setFilter: (filter: 'all' | 'pending' | 'approved' | 'denied') => void;
  markAsRead: (approvalId: string) => void;
  markAllAsRead: () => void;

  // Actions - Cleanup
  clearHistory: () => void;
  reset: () => void;
}

export const useHITLStore = create<HITLState>((set, get) => ({
  // Initial State
  pendingApprovals: [],
  approvalHistory: [],
  unreadCount: 0,
  drawerOpen: false,
  selectedApprovalId: null,
  filter: 'all',

  // Add Pending Approval
  addPendingApproval: (approval) =>
    set((state) => {
      // Check if already exists
      const exists = state.pendingApprovals.some(
        (a) => a.approvalId === approval.approvalId
      );
      if (exists) {
        console.warn(`[HITL] Approval ${approval.approvalId} already exists`);
        return state;
      }

      return {
        pendingApprovals: [approval, ...state.pendingApprovals],
        unreadCount: state.unreadCount + 1,
      };
    }),

  // Approve Task
  approveTask: (approvalId, approvedBy) =>
    set((state) => {
      const approval = state.pendingApprovals.find(
        (a) => a.approvalId === approvalId
      );
      if (!approval) {
        console.warn(`[HITL] Approval ${approvalId} not found`);
        return state;
      }

      const approvedApproval: HITLApproval = {
        ...approval,
        status: 'approved',
        approvedBy,
        respondedAt: new Date().toISOString(),
      };

      return {
        pendingApprovals: state.pendingApprovals.filter(
          (a) => a.approvalId !== approvalId
        ),
        approvalHistory: [approvedApproval, ...state.approvalHistory],
      };
    }),

  // Deny Task
  denyTask: (approvalId, deniedBy, reason) =>
    set((state) => {
      const approval = state.pendingApprovals.find(
        (a) => a.approvalId === approvalId
      );
      if (!approval) {
        console.warn(`[HITL] Approval ${approvalId} not found`);
        return state;
      }

      const deniedApproval: HITLApproval = {
        ...approval,
        status: 'denied',
        deniedBy,
        denialReason: reason,
        respondedAt: new Date().toISOString(),
      };

      return {
        pendingApprovals: state.pendingApprovals.filter(
          (a) => a.approvalId !== approvalId
        ),
        approvalHistory: [deniedApproval, ...state.approvalHistory],
      };
    }),

  // Expire Approval (automatic expiration)
  expireApproval: (approvalId) =>
    set((state) => {
      const approval = state.pendingApprovals.find(
        (a) => a.approvalId === approvalId
      );
      if (!approval) return state;

      const expiredApproval: HITLApproval = {
        ...approval,
        status: 'expired',
        respondedAt: new Date().toISOString(),
      };

      return {
        pendingApprovals: state.pendingApprovals.filter(
          (a) => a.approvalId !== approvalId
        ),
        approvalHistory: [expiredApproval, ...state.approvalHistory],
      };
    }),

  // Queries
  getPendingApprovals: () => {
    return get().pendingApprovals;
  },

  getApprovalById: (approvalId) => {
    const state = get();
    return (
      state.pendingApprovals.find((a) => a.approvalId === approvalId) ||
      state.approvalHistory.find((a) => a.approvalId === approvalId)
    );
  },

  getApprovalsByType: (type) => {
    return get().pendingApprovals.filter((a) => a.type === type);
  },

  getHighPriorityApprovals: () => {
    return get().pendingApprovals.filter(
      (a) => a.priority === 'high' || a.priority === 'urgent'
    );
  },

  // UI Actions
  setDrawerOpen: (open) => set({ drawerOpen: open }),

  setSelectedApproval: (approvalId) => set({ selectedApprovalId: approvalId }),

  setFilter: (filter) => set({ filter }),

  markAsRead: (approvalId) =>
    set((state) => {
      const approval = state.pendingApprovals.find(
        (a) => a.approvalId === approvalId
      );
      if (!approval) return state;

      return {
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  markAllAsRead: () => set({ unreadCount: 0 }),

  // Cleanup
  clearHistory: () => set({ approvalHistory: [] }),

  reset: () =>
    set({
      pendingApprovals: [],
      approvalHistory: [],
      unreadCount: 0,
      drawerOpen: false,
      selectedApprovalId: null,
      filter: 'all',
    }),
}));

/**
 * Hook per auto-expire approvals
 * Da usare in un componente top-level (es. App.tsx)
 */
export function useHITLAutoExpire() {
  const { pendingApprovals, expireApproval } = useHITLStore();

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      pendingApprovals.forEach((approval) => {
        if (approval.expiresAt) {
          const expiryDate = new Date(approval.expiresAt);
          if (now > expiryDate) {
            expireApproval(approval.approvalId);
            console.log(`[HITL] Approval ${approval.approvalId} expired`);
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [pendingApprovals, expireApproval]);
}
```

---

## 📁 File: `frontend/hooks/use-websocket.ts` (MODIFICHE)

```typescript
// ======= AGGIUNGI ALL'INIZIO DEL FILE =======
import { useHITLStore } from '@/stores/hitl-store';  // ← NUOVO IMPORT

// ======= AGGIUNGI DENTRO LA FUNZIONE useWebSocket =======
export function useWebSocket(token: string | null, enabled = true) {
  // ... codice esistente ...

  // ✅ NUOVO: Store actions HITL
  const { addPendingApproval, approveTask, denyTask } = useHITLStore();

  useEffect(() => {
    // ... codice esistente ...

    // ✅ NUOVO: HITL EVENTS
    const unsubHITLApprovalRequired = websocketClient.onHITLApprovalRequired((data) => {
      console.log('[WS] HITL Approval Required:', data);

      if (data.task && data.taskId) {
        const approvalId = data.approvalId || `approval-${Date.now()}`;

        addPendingApproval({
          approvalId,
          taskId: data.taskId,
          type: data.task.type as HITLTaskType,
          status: 'pending',
          task: {
            title: data.task.title,
            description: data.task.description,
            type: data.task.type,
            context: data.task.context,
          },
          requestedAt: data.timestamp || new Date().toISOString(),
          priority: determinePriority(data.task), // Helper function
        });
      }
    });

    const unsubHITLApprovalGranted = websocketClient.onHITLApprovalGranted((data) => {
      console.log('[WS] HITL Approval Granted:', data);

      if (data.approvalId) {
        // Backend già ha approvato, aggiorna solo lo stato locale se necessario
        console.log(`[WS] Approval ${data.approvalId} granted by system`);
      }
    });

    const unsubHITLApprovalDenied = websocketClient.onHITLApprovalDenied((data) => {
      console.log('[WS] HITL Approval Denied:', data);

      if (data.approvalId) {
        // Backend già ha negato, aggiorna solo lo stato locale se necessario
        console.log(`[WS] Approval ${data.approvalId} denied by system`);
      }
    });

    // ✅ MODIFICA: Cleanup
    return () => {
      // ... cleanup esistente ...
      unsubHITLApprovalRequired();  // ← AGGIUNGI
      unsubHITLApprovalGranted();   // ← AGGIUNGI
      unsubHITLApprovalDenied();    // ← AGGIUNGI
      disconnect();
    };
  }, [
    // ... dependencies esistenti ...
    addPendingApproval,  // ← AGGIUNGI
    approveTask,         // ← AGGIUNGI
    denyTask,            // ← AGGIUNGI
  ]);

  // ... resto del codice ...
}

// Helper function
function determinePriority(task: any): 'low' | 'medium' | 'high' | 'urgent' {
  // Logic to determine priority based on task type
  if (task.type === 'account_action') return 'urgent';
  if (task.type === 'email_send') return 'high';
  if (task.type === 'data_export') return 'medium';
  return 'low';
}
```

---

## 🎨 Componente UI: Approval Drawer

```typescript
// components/hitl/ApprovalDrawer.tsx
import React from 'react';
import { Drawer, Badge, Button, List, Typography } from '@mui/material';
import { useHITLStore } from '@/stores/hitl-store';

export function ApprovalDrawer() {
  const {
    drawerOpen,
    setDrawerOpen,
    pendingApprovals,
    unreadCount,
    approveTask,
    denyTask,
  } = useHITLStore();

  const handleApprove = async (approvalId: string) => {
    // TODO: Call backend API to approve
    // await hitlApi.approve(approvalId);

    approveTask(approvalId, 'current-user-id');
  };

  const handleDeny = async (approvalId: string) => {
    // TODO: Call backend API to deny
    // await hitlApi.deny(approvalId, 'reason');

    denyTask(approvalId, 'current-user-id', 'User denied');
  };

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
    >
      <div style={{ width: 400, padding: 16 }}>
        <Typography variant="h6">
          Pending Approvals
          {unreadCount > 0 && (
            <Badge badgeContent={unreadCount} color="error" style={{ marginLeft: 8 }} />
          )}
        </Typography>

        <List>
          {pendingApprovals.map((approval) => (
            <div key={approval.approvalId} style={{ marginBottom: 16, padding: 12, border: '1px solid #ddd' }}>
              <Typography variant="subtitle1">{approval.task.title}</Typography>
              <Typography variant="body2" color="textSecondary">
                {approval.task.description}
              </Typography>
              <Typography variant="caption">
                Type: {approval.type} | Priority: {approval.priority}
              </Typography>

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => handleApprove(approval.approvalId)}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => handleDeny(approval.approvalId)}
                >
                  Deny
                </Button>
              </div>
            </div>
          ))}

          {pendingApprovals.length === 0 && (
            <Typography variant="body2" color="textSecondary" style={{ textAlign: 'center', marginTop: 32 }}>
              No pending approvals
            </Typography>
          )}
        </List>
      </div>
    </Drawer>
  );
}
```

---

## 🔔 Componente: Notification Badge

```typescript
// components/hitl/ApprovalNotificationBadge.tsx
import React from 'react';
import { IconButton, Badge } from '@mui/material';
import { NotificationsActive } from '@mui/icons-material';
import { useHITLStore } from '@/stores/hitl-store';

export function ApprovalNotificationBadge() {
  const { unreadCount, setDrawerOpen } = useHITLStore();

  return (
    <IconButton onClick={() => setDrawerOpen(true)} color="inherit">
      <Badge badgeContent={unreadCount} color="error">
        <NotificationsActive />
      </Badge>
    </IconButton>
  );
}
```

---

## 🧪 Test Example

```typescript
// stores/__tests__/hitl-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useHITLStore } from '../hitl-store';

describe('HITL Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useHITLStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should add pending approval', () => {
    const { result } = renderHook(() => useHITLStore());

    act(() => {
      result.current.addPendingApproval({
        approvalId: 'approval-1',
        taskId: 'task-1',
        type: 'email_send',
        status: 'pending',
        task: {
          title: 'Send email to client',
          description: 'Approve sending email to john@example.com',
          type: 'email_send',
        },
        requestedAt: new Date().toISOString(),
        priority: 'high',
      });
    });

    expect(result.current.pendingApprovals).toHaveLength(1);
    expect(result.current.unreadCount).toBe(1);
  });

  it('should approve task', () => {
    const { result } = renderHook(() => useHITLStore());

    act(() => {
      result.current.addPendingApproval({
        approvalId: 'approval-1',
        taskId: 'task-1',
        type: 'email_send',
        status: 'pending',
        task: {
          title: 'Test',
          description: 'Test',
          type: 'email_send',
        },
        requestedAt: new Date().toISOString(),
      });
    });

    act(() => {
      result.current.approveTask('approval-1', 'user-123');
    });

    expect(result.current.pendingApprovals).toHaveLength(0);
    expect(result.current.approvalHistory).toHaveLength(1);
    expect(result.current.approvalHistory[0].status).toBe('approved');
    expect(result.current.approvalHistory[0].approvedBy).toBe('user-123');
  });
});
```

---

## ✅ Checklist Implementazione

- [ ] Creare file `frontend/stores/hitl-store.ts`
- [ ] Copiare il codice template sopra
- [ ] Aggiungere import in `frontend/hooks/use-websocket.ts`
- [ ] Aggiungere handler eventi HITL in useEffect
- [ ] Aggiungere cleanup HITL events
- [ ] Aggiungere dependencies HITL al array useEffect
- [ ] Creare `ApprovalDrawer.tsx` component
- [ ] Creare `ApprovalNotificationBadge.tsx` component
- [ ] Aggiungere badge nella navbar
- [ ] Creare API client per approve/deny actions
- [ ] Testare evento `hitl:approval_required`
- [ ] Testare flow approve/deny completo
- [ ] Scrivere unit tests

---

**Template creato da**: Claude Code
**Data**: 2025-11-22
