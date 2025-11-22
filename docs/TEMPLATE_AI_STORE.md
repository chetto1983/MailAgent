# Template: AI Store Implementation

**File da creare**: `frontend/stores/ai-store.ts`

Questo template mostra l'implementazione completa dello store AI mancante.

---

## 📁 File: `frontend/stores/ai-store.ts`

```typescript
import { create } from 'zustand';

/**
 * AI Classification for an email
 */
export interface AIClassification {
  emailId: string;
  category: string;        // e.g., "sales", "support", "newsletter"
  priority: string;        // e.g., "high", "medium", "low"
  sentiment: string;       // e.g., "positive", "negative", "neutral"
  confidence: number;      // 0-1
  timestamp: string;
  processingTime?: number; // milliseconds
}

/**
 * AI Task Suggestion
 */
export interface AITaskSuggestion {
  id: string;
  emailId?: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'suggested' | 'accepted' | 'rejected';
  timestamp: string;
  confidence?: number;
}

/**
 * AI Insight
 */
export interface AIInsight {
  id: string;
  emailId?: string;
  message: string;
  actionable: boolean;
  category?: 'trend' | 'warning' | 'opportunity' | 'info';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface AIState {
  // Data
  classifications: Map<string, AIClassification>;  // emailId -> classification
  taskSuggestions: AITaskSuggestion[];
  insights: AIInsight[];

  // UI State
  isProcessing: boolean;
  lastProcessedEmailId: string | null;

  // Statistics
  stats: {
    totalClassifications: number;
    totalTasksSuggested: number;
    totalInsights: number;
    avgConfidence: number;
  };

  // Actions - Classifications
  addClassification: (classification: AIClassification) => void;
  getClassification: (emailId: string) => AIClassification | undefined;
  clearClassification: (emailId: string) => void;

  // Actions - Task Suggestions
  addTaskSuggestion: (task: AITaskSuggestion) => void;
  acceptTaskSuggestion: (taskId: string) => void;
  rejectTaskSuggestion: (taskId: string) => void;
  getTaskSuggestionsForEmail: (emailId: string) => AITaskSuggestion[];

  // Actions - Insights
  addInsight: (insight: AIInsight) => void;
  dismissInsight: (insightId: string) => void;
  getInsightsForEmail: (emailId: string) => AIInsight[];
  getActionableInsights: () => AIInsight[];

  // Actions - UI
  setProcessing: (processing: boolean) => void;
  setLastProcessedEmailId: (emailId: string | null) => void;

  // Actions - Cleanup
  reset: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  // Initial State
  classifications: new Map(),
  taskSuggestions: [],
  insights: [],
  isProcessing: false,
  lastProcessedEmailId: null,
  stats: {
    totalClassifications: 0,
    totalTasksSuggested: 0,
    totalInsights: 0,
    avgConfidence: 0,
  },

  // Classifications
  addClassification: (classification) =>
    set((state) => {
      const newClassifications = new Map(state.classifications);
      newClassifications.set(classification.emailId, classification);

      // Update stats
      const confidenceSum = Array.from(newClassifications.values())
        .reduce((sum, c) => sum + c.confidence, 0);
      const avgConfidence = confidenceSum / newClassifications.size;

      return {
        classifications: newClassifications,
        lastProcessedEmailId: classification.emailId,
        stats: {
          ...state.stats,
          totalClassifications: newClassifications.size,
          avgConfidence,
        },
      };
    }),

  getClassification: (emailId) => {
    return get().classifications.get(emailId);
  },

  clearClassification: (emailId) =>
    set((state) => {
      const newClassifications = new Map(state.classifications);
      newClassifications.delete(emailId);
      return { classifications: newClassifications };
    }),

  // Task Suggestions
  addTaskSuggestion: (task) =>
    set((state) => {
      // Prevent duplicates
      if (state.taskSuggestions.some((t) => t.id === task.id)) {
        return state;
      }

      return {
        taskSuggestions: [task, ...state.taskSuggestions],
        stats: {
          ...state.stats,
          totalTasksSuggested: state.stats.totalTasksSuggested + 1,
        },
      };
    }),

  acceptTaskSuggestion: (taskId) =>
    set((state) => ({
      taskSuggestions: state.taskSuggestions.map((task) =>
        task.id === taskId ? { ...task, status: 'accepted' as const } : task
      ),
    })),

  rejectTaskSuggestion: (taskId) =>
    set((state) => ({
      taskSuggestions: state.taskSuggestions.map((task) =>
        task.id === taskId ? { ...task, status: 'rejected' as const } : task
      ),
    })),

  getTaskSuggestionsForEmail: (emailId) => {
    return get().taskSuggestions.filter((task) => task.emailId === emailId);
  },

  // Insights
  addInsight: (insight) =>
    set((state) => {
      // Prevent duplicates
      if (state.insights.some((i) => i.id === insight.id)) {
        return state;
      }

      return {
        insights: [insight, ...state.insights],
        stats: {
          ...state.stats,
          totalInsights: state.stats.totalInsights + 1,
        },
      };
    }),

  dismissInsight: (insightId) =>
    set((state) => ({
      insights: state.insights.filter((insight) => insight.id !== insightId),
    })),

  getInsightsForEmail: (emailId) => {
    return get().insights.filter((insight) => insight.emailId === emailId);
  },

  getActionableInsights: () => {
    return get().insights.filter((insight) => insight.actionable);
  },

  // UI
  setProcessing: (processing) => set({ isProcessing: processing }),

  setLastProcessedEmailId: (emailId) => set({ lastProcessedEmailId: emailId }),

  // Cleanup
  reset: () =>
    set({
      classifications: new Map(),
      taskSuggestions: [],
      insights: [],
      isProcessing: false,
      lastProcessedEmailId: null,
      stats: {
        totalClassifications: 0,
        totalTasksSuggested: 0,
        totalInsights: 0,
        avgConfidence: 0,
      },
    }),
}));
```

---

## 📁 File: `frontend/hooks/use-websocket.ts` (MODIFICHE)

Aggiungere al file esistente:

```typescript
// ======= AGGIUNGI ALL'INIZIO DEL FILE =======
import { useAIStore } from '@/stores/ai-store';  // ← NUOVO IMPORT

// ======= AGGIUNGI DENTRO LA FUNZIONE useWebSocket =======
export function useWebSocket(token: string | null, enabled = true) {
  // ... codice esistente ...

  // ✅ NUOVO: Store actions AI
  const {
    addClassification,
    addTaskSuggestion,
    addInsight,
    setProcessing,
  } = useAIStore();

  useEffect(() => {
    // ... codice esistente ...

    // ✅ NUOVO: AI EVENTS
    const unsubAIClassification = websocketClient.onAIClassification((data) => {
      console.log('[WS] AI Classification:', data);

      if (data.classification && data.emailId) {
        addClassification({
          emailId: data.emailId,
          category: data.classification.category,
          priority: data.classification.priority,
          sentiment: data.classification.sentiment,
          confidence: data.classification.confidence,
          timestamp: data.timestamp || new Date().toISOString(),
        });

        setProcessing(false);
      }
    });

    const unsubAITaskSuggest = websocketClient.onAITaskSuggest((data) => {
      console.log('[WS] AI Task Suggest:', data);

      if (data.task) {
        addTaskSuggestion({
          id: `task-${Date.now()}-${Math.random()}`,
          emailId: data.emailId,
          title: data.task.title,
          description: data.task.description,
          dueDate: data.task.dueDate,
          priority: data.task.priority as 'low' | 'medium' | 'high',
          status: 'suggested',
          timestamp: data.timestamp || new Date().toISOString(),
        });
      }
    });

    const unsubAIInsight = websocketClient.onAIInsight((data) => {
      console.log('[WS] AI Insight:', data);

      if (data.insight) {
        addInsight({
          id: `insight-${Date.now()}-${Math.random()}`,
          emailId: data.emailId,
          message: data.insight.message,
          actionable: data.insight.actionable,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      }
    });

    // ✅ MODIFICA: Cleanup
    return () => {
      // ... cleanup esistente ...
      unsubAIClassification();  // ← AGGIUNGI
      unsubAITaskSuggest();     // ← AGGIUNGI
      unsubAIInsight();         // ← AGGIUNGI
      disconnect();
    };
  }, [
    // ... dependencies esistenti ...
    addClassification,    // ← AGGIUNGI
    addTaskSuggestion,    // ← AGGIUNGI
    addInsight,           // ← AGGIUNGI
    setProcessing,        // ← AGGIUNGI
  ]);

  // ... resto del codice ...
}
```

---

## 🎨 Esempio Uso in Componente React

```typescript
// components/email/EmailDetail.tsx
import { useAIStore } from '@/stores/ai-store';

export function EmailDetail({ emailId }: { emailId: string }) {
  const { getClassification, getTaskSuggestionsForEmail, getInsightsForEmail } = useAIStore();

  const classification = getClassification(emailId);
  const taskSuggestions = getTaskSuggestionsForEmail(emailId);
  const insights = getInsightsForEmail(emailId);

  return (
    <div>
      <h1>Email Details</h1>

      {/* AI Classification Badge */}
      {classification && (
        <div className="ai-classification">
          <span className={`badge ${classification.priority}`}>
            {classification.category} - {classification.priority}
          </span>
          <span className="sentiment">{classification.sentiment}</span>
          <span className="confidence">
            {(classification.confidence * 100).toFixed(0)}% confident
          </span>
        </div>
      )}

      {/* Task Suggestions */}
      {taskSuggestions.length > 0 && (
        <div className="task-suggestions">
          <h3>AI Suggested Tasks</h3>
          {taskSuggestions
            .filter(t => t.status === 'suggested')
            .map((task) => (
              <TaskSuggestionCard key={task.id} task={task} />
            ))}
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="insights">
          <h3>AI Insights</h3>
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Test Example

```typescript
// stores/__tests__/ai-store.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAIStore } from '../ai-store';

describe('AI Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useAIStore());
    act(() => {
      result.current.reset();
    });
  });

  it('should add classification', () => {
    const { result } = renderHook(() => useAIStore());

    act(() => {
      result.current.addClassification({
        emailId: 'email-123',
        category: 'sales',
        priority: 'high',
        sentiment: 'positive',
        confidence: 0.95,
        timestamp: new Date().toISOString(),
      });
    });

    expect(result.current.classifications.size).toBe(1);
    expect(result.current.getClassification('email-123')).toMatchObject({
      category: 'sales',
      priority: 'high',
    });
  });

  it('should add task suggestion', () => {
    const { result } = renderHook(() => useAIStore());

    act(() => {
      result.current.addTaskSuggestion({
        id: 'task-1',
        emailId: 'email-123',
        title: 'Follow up with client',
        description: 'Client requested quote',
        priority: 'high',
        status: 'suggested',
        timestamp: new Date().toISOString(),
      });
    });

    expect(result.current.taskSuggestions).toHaveLength(1);
    expect(result.current.getTaskSuggestionsForEmail('email-123')).toHaveLength(1);
  });

  it('should accept task suggestion', () => {
    const { result } = renderHook(() => useAIStore());

    act(() => {
      result.current.addTaskSuggestion({
        id: 'task-1',
        title: 'Test task',
        description: 'Test',
        priority: 'medium',
        status: 'suggested',
        timestamp: new Date().toISOString(),
      });
    });

    act(() => {
      result.current.acceptTaskSuggestion('task-1');
    });

    expect(result.current.taskSuggestions[0].status).toBe('accepted');
  });
});
```

---

## ✅ Checklist Implementazione

- [ ] Creare file `frontend/stores/ai-store.ts`
- [ ] Copiare il codice template sopra
- [ ] Aggiungere import in `frontend/hooks/use-websocket.ts`
- [ ] Aggiungere handler eventi AI in useEffect
- [ ] Aggiungere cleanup AI events
- [ ] Aggiungere dependencies AI al array useEffect
- [ ] Testare evento `ai:classification_done`
- [ ] Testare evento `ai:task_suggest`
- [ ] Testare evento `ai:insight`
- [ ] Creare componenti UI per visualizzare dati AI
- [ ] Scrivere unit tests

---

## 🎯 Prossimi Passi

Dopo aver implementato l'AI Store:

1. **Creare HITL Store** usando template simile
2. **Creare UI Components**:
   - `AIClassificationBadge.tsx`
   - `TaskSuggestionCard.tsx`
   - `InsightNotification.tsx`
3. **Integrare in Email Detail View**
4. **Aggiungere analytics** per tracking AI performance

---

**Template creato da**: Claude Code
**Data**: 2025-11-22
