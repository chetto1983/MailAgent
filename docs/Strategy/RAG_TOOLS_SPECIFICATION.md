# 🛠️ Specifiche Tool per Sistema RAG Multi-Agent
**Progetto**: MailAgent v2.0.0
**Data**: 7 Novembre 2025
**Versione**: 1.0

---

## 📋 Executive Summary

Questo documento definisce i tool necessari per il sistema multi-agent con RAG, specificando:
- Tool già implementati (funzionanti)
- Tool da implementare (priorità)
- Design patterns per nuovi tool
- Testing e validation strategy

---

## ✅ Tool Implementati (Funzionanti)

### 1. knowledge_search
**Status**: ✅ Implementato al 100%
**File**: `backend/src/modules/ai/services/agent.service.ts:125-165`

**Descrizione**: Cerca informazioni semanticamente simili nella knowledge base usando RAG

**Signature**:
```typescript
interface KnowledgeSearchInput {
  query: string;      // Query testuale
  limit?: number;     // Max risultati (default: 5)
  threshold?: number; // Similarity threshold (default: 0.7)
}

interface KnowledgeSearchOutput {
  results: Array<{
    content: string;     // Contenuto trovato
    similarity: number;  // Score 0.0-1.0
    metadata: {
      emailId?: string;
      subject?: string;
      from?: string;
      receivedAt?: string;
      chunkIndex?: number;
    };
  }>;
}
```

**Esempio**:
```json
// Input
{
  "query": "project alpha deadline",
  "limit": 3,
  "threshold": 0.75
}

// Output
{
  "results": [
    {
      "content": "Subject: Project Alpha - Q4 Deadline\nFrom: boss@company.com\nDeadline is December 15, 2025...",
      "similarity": 0.923,
      "metadata": {
        "emailId": "cm123...",
        "subject": "Project Alpha - Q4 Deadline",
        "from": "boss@company.com",
        "receivedAt": "2025-11-01T10:00:00Z"
      }
    }
  ]
}
```

**Use Cases**:
- "What did John say about the budget?"
- "Find emails related to Project Alpha"
- "When was the last mention of quarterly review?"

---

### 2. recent_emails
**Status**: ✅ Implementato al 100%
**File**: `backend/src/modules/ai/services/agent.service.ts:167-209`

**Descrizione**: Recupera email recenti per folder

**Signature**:
```typescript
interface RecentEmailsInput {
  folder?: string;  // Default: 'INBOX'
  limit?: number;   // Default: 10
}

interface RecentEmailsOutput {
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    snippet: string;
    receivedAt: string;
    isRead: boolean;
    folder: string;
  }>;
}
```

**Esempio**:
```json
// Input
{
  "folder": "INBOX",
  "limit": 5
}

// Output
{
  "emails": [
    {
      "id": "cm123...",
      "subject": "Q4 Budget Review",
      "from": "finance@company.com",
      "snippet": "Please review the attached Q4 budget...",
      "receivedAt": "2025-11-07T09:30:00Z",
      "isRead": false,
      "folder": "INBOX"
    }
  ]
}
```

**Use Cases**:
- "Show me recent unread emails"
- "What are the latest emails in my inbox?"
- "List recent sent emails"

---

### 3. summarize_email
**Status**: ✅ Implementato al 100%
**File**: `backend/src/modules/ai/services/email-insights.service.ts:28-74`

**Descrizione**: Genera riassunto conciso di un'email (max 5 frasi)

**Signature**:
```typescript
interface SummarizeEmailInput {
  emailId: string;
  locale?: 'en' | 'it';  // Default: 'en'
}

interface SummarizeEmailOutput {
  summary: string;  // Riassunto 3-5 frasi
}
```

**System Prompt** (italiano):
```
Sei un assistente che riassume email di lavoro. Rispondi con un breve riassunto dell'email (massimo 5 frasi), evidenziando:
- L'intento principale del mittente
- Eventuali richieste o domande
- Prossimi passi o scadenze menzionate
```

**Esempio**:
```json
// Output
{
  "summary": "Il team di finanza richiede la revisione del budget Q4 entro venerdì. Allegato il foglio Excel con le previsioni aggiornate. È necessaria l'approvazione del manager per procedere con gli acquisti pianificati. Si prega di confermare la disponibilità per una call di allineamento martedì prossimo."
}
```

---

### 4. generate_smart_replies
**Status**: ✅ Implementato al 100%
**File**: `backend/src/modules/ai/services/email-insights.service.ts:76-144`

**Descrizione**: Genera 2-3 possibili risposte contestuali a un'email

**Signature**:
```typescript
interface SmartRepliesInput {
  emailId: string;
  locale?: 'en' | 'it';
}

interface SmartRepliesOutput {
  replies: string[];  // Array di 2-3 suggerimenti
}
```

**System Prompt** (inglese):
```
You are an assistant helping draft professional email replies. Analyze the email and suggest 2-3 possible short reply options (1-2 sentences each). Make them:
- Professional and courteous
- Contextually appropriate
- Action-oriented when needed
- Varied in tone (e.g., one enthusiastic, one neutral)

Return ONLY a JSON object with a "replies" array of strings.
```

**Parsing Robusto** con `parseArrayFromAiPayload()`:
- Gestisce JSON puro: `{"replies":["..."]}`
- Gestisce markdown fences: ` ```json\n{...}\n``` `
- Gestisce array di oggetti: `{"replies":[{"body":"..."}]}`
- Gestisce chatter: "Here are...\n```json\n{...}\n```"

**Esempio**:
```json
{
  "replies": [
    "Thanks for the update! I'll review the budget spreadsheet and get back to you by Thursday.",
    "Received, I'll take a look at the Q4 projections and confirm my availability for Tuesday's call.",
    "Appreciate the heads up. I'll have my feedback ready before Friday's deadline."
  ]
}
```

---

### 5. suggest_email_labels
**Status**: ✅ Implementato al 100%
**File**: `backend/src/modules/ai/services/email-insights.service.ts:146-217`

**Descrizione**: Suggerisce fino a 3 label/categorie per un'email

**Predefined Labels**:
- Important
- Follow-up
- Action Items
- Info
- Personal
- Finance
- Promotions
- Updates

**Signature**:
```typescript
interface SuggestLabelsInput {
  emailId: string;
}

interface SuggestLabelsOutput {
  labels: string[];  // Max 3 label
}
```

**Esempio**:
```json
{
  "labels": ["Important", "Finance", "Action Items"]
}
```

**Use Cases**:
- Auto-categorization email
- Smart filtering
- Priority detection

---

## 🚧 Tool da Implementare

### PRIORITY 1 (Settimana 1-2)

#### 6. calendar_search
**Status**: 🔴 Da implementare
**Priority**: 🔥 ALTA
**Estimated**: 2 giorni

**Descrizione**: Cerca eventi nel calendario per data, partecipanti, titolo

**Signature**:
```typescript
interface CalendarSearchInput {
  query: string;          // Free-text query
  startDate?: string;     // ISO 8601
  endDate?: string;       // ISO 8601
  attendees?: string[];   // Email addresses
  calendarId?: string;    // Specific calendar
}

interface CalendarSearchOutput {
  events: Array<{
    id: string;
    title: string;
    description: string;
    start: string;
    end: string;
    location: string;
    attendees: Array<{ email: string; name: string }>;
    calendarName: string;
  }>;
}
```

**Implementation Plan**:
1. Create `CalendarToolsService` in `backend/src/modules/ai/tools/`
2. Query `CalendarEvent` model (da implementare in Prisma)
3. Support natural language: "meetings next week", "events with John"
4. Use embedding search se query testuale
5. Filter by date range, attendees, calendar

**Use Cases**:
- "When is my next meeting with Sarah?"
- "What's on my calendar for tomorrow?"
- "Find all project alpha meetings this month"

---

#### 7. detect_conflicts
**Status**: 🔴 Da implementare
**Priority**: 🔥 ALTA
**Estimated**: 1 giorno

**Descrizione**: Detecta conflitti nel calendario

**Signature**:
```typescript
interface DetectConflictsInput {
  startDate: string;  // ISO 8601
  endDate: string;    // ISO 8601
}

interface DetectConflictsOutput {
  conflicts: Array<{
    events: Array<{ id: string; title: string; start: string; end: string }>;
    overlapMinutes: number;
  }>;
}
```

**Algorithm**:
```
For each pair of events (A, B):
  if A.start < B.end AND B.start < A.end:
    conflict detected
    overlap = min(A.end, B.end) - max(A.start, B.start)
```

**Use Cases**:
- "Do I have any schedule conflicts this week?"
- "Check for overlapping meetings tomorrow"

---

#### 8. contact_lookup
**Status**: 🔴 Da implementare
**Priority**: 🔥 ALTA
**Estimated**: 1 giorno

**Descrizione**: Cerca contatti per nome, email, azienda

**Signature**:
```typescript
interface ContactLookupInput {
  query: string;      // Name, email, or company
  limit?: number;     // Default: 10
}

interface ContactLookupOutput {
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    jobTitle: string;
  }>;
}
```

**Implementation**:
1. Full-text search on `contacts` table
2. Fuzzy matching for typos (Levenshtein distance)
3. Rank by relevance

**Use Cases**:
- "Find John Smith's email"
- "Who works at Acme Corp?"
- "Get contact info for my manager"

---

### PRIORITY 2 (Settimana 3-4)

#### 9. send_email
**Status**: 🔴 Da implementare
**Priority**: ⚡ MEDIA
**Estimated**: 2 giorni

**Descrizione**: Invia email tramite agent (con conferma utente)

**Signature**:
```typescript
interface SendEmailInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  providerId?: string;  // Default provider if not specified
  requestConfirmation?: boolean;  // Default: true
}

interface SendEmailOutput {
  status: 'sent' | 'pending_confirmation' | 'failed';
  emailId?: string;
  message: string;
}
```

**Safety**:
- **Default**: `requestConfirmation: true` (mostra draft all'utente)
- User approval required prima dell'invio
- Audit log di tutte le email inviate via agent

**Use Cases**:
- "Send a thank you email to John"
- "Reply to the last email from Sarah saying I'll be there"

---

#### 10. schedule_email
**Status**: 🔴 Da implementare
**Priority**: ⚡ MEDIA
**Estimated**: 1 giorno

**Descrizione**: Schedula invio email per data/ora futura

**Signature**:
```typescript
interface ScheduleEmailInput {
  to: string[];
  subject: string;
  body: string;
  scheduledFor: string;  // ISO 8601
  timezone?: string;     // Default: user timezone
}

interface ScheduleEmailOutput {
  status: 'scheduled';
  scheduledEmailId: string;
  sendAt: string;
}
```

**Implementation**:
- Store in `scheduled_emails` table
- BullMQ delayed job
- Cancel/edit before send

**Use Cases**:
- "Send this email tomorrow at 9am"
- "Schedule a reminder email for next Monday"

---

#### 11. create_calendar_event
**Status**: 🔴 Da implementare
**Priority**: ⚡ MEDIA
**Estimated**: 2 giorni

**Descrizione**: Crea evento nel calendario

**Signature**:
```typescript
interface CreateEventInput {
  title: string;
  description?: string;
  start: string;       // ISO 8601
  end: string;         // ISO 8601
  location?: string;
  attendees?: string[];
  calendarId?: string; // Default calendar
}

interface CreateEventOutput {
  status: 'created' | 'conflict' | 'failed';
  eventId?: string;
  conflicts?: Array<{ id: string; title: string }>;
}
```

**Conflict Detection**:
- Check overlaps before creating
- Suggest alternative times if conflict

**Use Cases**:
- "Schedule a meeting with John next Tuesday at 2pm"
- "Add a reminder to my calendar for Friday at 10am"

---

### PRIORITY 3 (Settimana 5+)

#### 12. generate_report
**Status**: 🔴 Da implementare
**Priority**: 💡 BASSA
**Estimated**: 3 giorni

**Descrizione**: Genera report giornaliero/settimanale attività

**Signature**:
```typescript
interface GenerateReportInput {
  reportType: 'daily' | 'weekly' | 'monthly';
  startDate?: string;
  endDate?: string;
  includeEmails?: boolean;
  includeCalendar?: boolean;
  includeContacts?: boolean;
}

interface GenerateReportOutput {
  report: {
    period: string;
    summary: string;  // AI-generated summary
    metrics: {
      emailsReceived: number;
      emailsSent: number;
      meetingsAttended: number;
      topContacts: Array<{ name: string; interactions: number }>;
    };
    highlights: string[];  // Key events/emails
    suggestions: string[]; // Follow-ups needed
  };
}
```

**AI Summary**:
- Use Mistral to summarize week activity
- Identify patterns (busiest days, top correspondents)
- Suggest follow-ups

**Use Cases**:
- "Generate my weekly activity report"
- "Summarize what happened this month"

---

#### 13. detect_follow_ups
**Status**: 🔴 Da implementare
**Priority**: 💡 BASSA
**Estimated**: 2 giorni

**Descrizione**: Detecta email che richiedono follow-up

**Signature**:
```typescript
interface DetectFollowUpsInput {
  daysSince?: number;  // Default: 3
  folder?: string;     // Default: 'SENT'
}

interface DetectFollowUpsOutput {
  followUps: Array<{
    emailId: string;
    subject: string;
    to: string;
    sentAt: string;
    daysSince: number;
    reason: string;  // "No reply received", "Action item mentioned"
  }>;
}
```

**Detection Logic**:
1. Find sent emails > X days old
2. Check if reply received (threadId matching)
3. Use AI to detect if action was expected
4. Rank by urgency

**Use Cases**:
- "Which emails do I need to follow up on?"
- "Show me unreplied emails from this week"

---

#### 14. suggest_meeting_times
**Status**: 🔴 Da implementare
**Priority**: 💡 BASSA
**Estimated**: 2 giorni

**Descrizione**: Suggerisce slot disponibili per meeting

**Signature**:
```typescript
interface SuggestMeetingTimesInput {
  attendees: string[];     // Email addresses
  duration: number;        // Minutes
  startDate: string;       // Search from this date
  endDate: string;         // Search until this date
  workingHoursOnly?: boolean;  // Default: true
}

interface SuggestMeetingTimesOutput {
  suggestions: Array<{
    start: string;
    end: string;
    score: number;  // 0-1 (based on optimal time, attendee availability)
    conflicts: string[];  // Conflicting attendees (if any)
  }>;
}
```

**Algorithm**:
1. Fetch calendars of all attendees
2. Find free slots >= duration
3. Rank by:
   - No conflicts: score 1.0
   - Working hours (9am-5pm): +0.2
   - Not early morning/late evening: +0.1
4. Return top 5 suggestions

**Use Cases**:
- "Find a time for a 1-hour meeting with John and Sarah next week"
- "When can I schedule a 30-min call with the team?"

---

## 🎨 Design Patterns per Nuovi Tool

### 1. Tool Structure Template

```typescript
// backend/src/modules/ai/tools/my-tool.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MyToolService {
  private readonly logger = new Logger(MyToolService.name);

  constructor(
    private prisma: PrismaService,
    // other dependencies
  ) {}

  /**
   * Tool description for LangChain
   */
  getToolDefinition() {
    return {
      name: 'my_tool',
      description: 'Clear, concise description of what this tool does',
      parameters: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            description: 'Description of param1',
          },
          param2: {
            type: 'number',
            description: 'Description of param2',
            optional: true,
          },
        },
        required: ['param1'],
      },
    };
  }

  /**
   * Main execution method
   */
  async execute(input: MyToolInput, context: ToolContext): Promise<MyToolOutput> {
    const { tenantId, userId } = context;

    this.logger.log(`Executing my_tool for tenant ${tenantId}`);

    try {
      // 1. Validate input
      this.validateInput(input);

      // 2. Check permissions
      await this.checkPermissions(tenantId, userId);

      // 3. Execute business logic
      const result = await this.performAction(input, tenantId);

      // 4. Audit log
      await this.auditLog(tenantId, userId, 'my_tool', input, result);

      return result;

    } catch (error) {
      this.logger.error(`Tool execution failed: ${error.message}`, error.stack);
      throw new ToolExecutionError('my_tool', error.message);
    }
  }

  private validateInput(input: MyToolInput): void {
    if (!input.param1) {
      throw new ValidationError('param1 is required');
    }
    // Add validation logic
  }

  private async checkPermissions(tenantId: string, userId: string): Promise<void> {
    // Check if user has permission to execute this tool
    const user = await this.prisma.user.findUnique({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new PermissionError('User not found or no access');
    }
  }

  private async performAction(input: MyToolInput, tenantId: string): Promise<MyToolOutput> {
    // Main business logic here
    return { success: true };
  }

  private async auditLog(
    tenantId: string,
    userId: string,
    action: string,
    input: any,
    output: any,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        details: { input, output },
        timestamp: new Date(),
      },
    });
  }
}
```

### 2. Error Handling Pattern

```typescript
// Common error types
export class ToolExecutionError extends Error {
  constructor(
    public toolName: string,
    public message: string,
    public originalError?: Error,
  ) {
    super(`Tool '${toolName}' failed: ${message}`);
  }
}

export class ValidationError extends ToolExecutionError {
  constructor(message: string) {
    super('validation', message);
  }
}

export class PermissionError extends ToolExecutionError {
  constructor(message: string) {
    super('permission', message);
  }
}

// Usage in agent
try {
  const result = await tool.execute(input, context);
  return { success: true, result };
} catch (error) {
  if (error instanceof PermissionError) {
    return { success: false, error: 'Permission denied' };
  } else if (error instanceof ValidationError) {
    return { success: false, error: `Invalid input: ${error.message}` };
  } else {
    return { success: false, error: 'Tool execution failed' };
  }
}
```

### 3. Rate Limiting Pattern

```typescript
import { Injectable } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

@Injectable()
export class MyToolService {
  @Throttle({ default: { limit: 10, ttl: 60000 } })  // 10 req/min
  async execute(input: MyToolInput, context: ToolContext) {
    // Tool logic
  }
}
```

### 4. Caching Pattern

```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class MyToolService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async execute(input: MyToolInput, context: ToolContext) {
    const cacheKey = `my_tool:${context.tenantId}:${JSON.stringify(input)}`;

    // Try cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.log('Returning cached result');
      return cached;
    }

    // Execute tool
    const result = await this.performAction(input);

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }
}
```

---

## 🧪 Testing Strategy

### 1. Unit Tests (Per Tool)

```typescript
// my-tool.service.spec.ts
describe('MyToolService', () => {
  let service: MyToolService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MyToolService, PrismaService],
    }).compile();

    service = module.get<MyToolService>(MyToolService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('execute', () => {
    it('should execute successfully with valid input', async () => {
      const input = { param1: 'test' };
      const context = { tenantId: 'tenant1', userId: 'user1' };

      const result = await service.execute(input, context);

      expect(result.success).toBe(true);
    });

    it('should throw ValidationError with invalid input', async () => {
      const input = { param1: '' };
      const context = { tenantId: 'tenant1', userId: 'user1' };

      await expect(service.execute(input, context)).rejects.toThrow(ValidationError);
    });

    it('should throw PermissionError when user has no access', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      const input = { param1: 'test' };
      const context = { tenantId: 'tenant1', userId: 'invalid' };

      await expect(service.execute(input, context)).rejects.toThrow(PermissionError);
    });
  });
});
```

### 2. Integration Tests (Agent + Tool)

```typescript
describe('Agent with MyTool', () => {
  it('should use my_tool when appropriate', async () => {
    const agent = new AgentService(/* deps */);

    const response = await agent.chat({
      tenantId: 'tenant1',
      userId: 'user1',
      message: 'Do something with my_tool',
    });

    expect(response).toContain('Tool my_tool executed successfully');
  });
});
```

### 3. E2E Tests

```typescript
describe('MyTool E2E', () => {
  it('should execute tool via API', async () => {
    const response = await request(app.getHttpServer())
      .post('/ai/tools/my_tool')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ param1: 'test' })
      .expect(200);

    expect(response.body.success).toBe(true);
  });
});
```

---

## 📊 Tool Roadmap

### Novembre 2025:
- ✅ knowledge_search (implementato)
- ✅ recent_emails (implementato)
- ✅ summarize_email (implementato)
- ✅ generate_smart_replies (implementato)
- ✅ suggest_email_labels (implementato)

### Dicembre 2025 (Settimana 1-2):
- 🚧 calendar_search
- 🚧 detect_conflicts
- 🚧 contact_lookup

### Dicembre 2025 (Settimana 3-4):
- ⏳ send_email
- ⏳ schedule_email
- ⏳ create_calendar_event

### Gennaio 2026:
- 💡 generate_report
- 💡 detect_follow_ups
- 💡 suggest_meeting_times

---

## 🎯 Success Metrics

**Per Tool**:
- [ ] Execution time < 2s (95th percentile)
- [ ] Error rate < 1%
- [ ] Test coverage > 80%
- [ ] Clear documentation
- [ ] Audit logs complete

**Overall**:
- [ ] Agent tool success rate > 95%
- [ ] User satisfaction > 85%
- [ ] Tool usage balanced (no single tool > 50%)
- [ ] Response quality high (4/5+ rating)

---

**Documento Generato**: 7 Novembre 2025
**Prossima Review**: 14 Novembre 2025
**Owner**: MailAgent AI Team
