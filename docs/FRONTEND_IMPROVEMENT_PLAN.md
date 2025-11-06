# Frontend Improvement Plan
**Created**: 2025-11-06
**Status**: In Progress
**Priority**: CRITICAL

---

## Executive Summary

This document outlines the plan to modernize and complete the MailAgent frontend to create a production-ready PMSync application. Based on the roadmap analysis, the frontend is currently **45% complete** with several critical gaps blocking core user workflows.

### Critical Issues Identified

1. **Email Composition Missing (P0)** - Users cannot send emails
   - No rich text editor
   - No reply/forward functionality
   - No draft management
   - No attachment upload

2. **Delete Only Marks as Deleted (P0)** - Doesn't delete from server
   - Current: Only updates database (`isDeleted: true`)
   - Need: Actual server deletion via Gmail/Outlook/IMAP APIs

3. **AI Buttons Are Placeholders (P1)** - Not fully functional
   - Quick actions work but no visual feedback
   - No smart reply integration in composer
   - No email summarization in UI
   - No auto-categorization

4. **Redundant Chat Interface (P1)** - Duplicate functionality
   - Chat on main dashboard
   - AI assistant in email page
   - Should consolidate to unified AI panel

5. **Missing Calendar UI (P0)** - Major PMSync feature
   - Backend calendar sync ready
   - No frontend calendar view
   - No event management

6. **Missing Contacts UI (P1)** - Incomplete communication suite
   - Backend contacts API ready
   - No frontend contacts list
   - No contact management

7. **No Daily Reports (P1)** - Key differentiator missing
   - No report generation
   - No follow-up alerts
   - No report history viewer

---

## Architecture Overview

### Current Structure
```
frontend/
├── pages/
│   ├── dashboard/
│   │   ├── index.tsx          # AI Chat (redundant)
│   │   ├── email.tsx           # Email viewer + AI assistant
│   │   ├── providers.tsx       # Provider management
│   │   └── settings.tsx        # User settings
│   └── auth/
│       ├── login.tsx
│       ├── register.tsx
│       └── reset-password.tsx
├── components/
│   ├── dashboard/
│   │   ├── EmailList.tsx       # Email list view
│   │   ├── EmailView.tsx       # Email detail view
│   │   └── AiAssistant.tsx     # AI sidebar
│   └── ui/                     # Shadcn components
└── lib/
    ├── api/
    │   ├── email.ts
    │   ├── ai.ts
    │   └── providers.ts
    └── hooks/
```

### Proposed New Structure
```
frontend/
├── pages/
│   ├── dashboard/
│   │   ├── index.tsx           # NEW: Unified dashboard
│   │   ├── email/
│   │   │   ├── index.tsx       # Email inbox
│   │   │   └── compose.tsx     # NEW: Email composer
│   │   ├── calendar.tsx        # NEW: Calendar view
│   │   ├── contacts.tsx        # NEW: Contacts management
│   │   ├── reports.tsx         # NEW: Daily reports
│   │   ├── providers.tsx
│   │   └── settings.tsx
├── components/
│   ├── dashboard/
│   │   ├── email/
│   │   │   ├── EmailList.tsx
│   │   │   ├── EmailView.tsx
│   │   │   ├── EmailComposer.tsx      # NEW: Rich text editor
│   │   │   ├── EmailToolbar.tsx       # NEW: Actions bar
│   │   │   └── AttachmentUpload.tsx   # NEW: File upload
│   │   ├── calendar/
│   │   │   ├── Calendar.tsx           # NEW: FullCalendar wrapper
│   │   │   ├── EventDialog.tsx        # NEW: Event editor
│   │   │   └── EventList.tsx          # NEW: Event list sidebar
│   │   ├── contacts/
│   │   │   ├── ContactsList.tsx       # NEW: Contacts grid
│   │   │   ├── ContactDialog.tsx      # NEW: Contact editor
│   │   │   └── ContactCard.tsx        # NEW: Contact card
│   │   ├── reports/
│   │   │   ├── DailyReport.tsx        # NEW: Report viewer
│   │   │   ├── FollowUpAlerts.tsx     # NEW: Alert center
│   │   │   └── ReportHistory.tsx      # NEW: Report list
│   │   ├── ai/
│   │   │   ├── AiPanel.tsx            # NEW: Unified AI panel
│   │   │   ├── SmartReply.tsx         # NEW: Reply suggestions
│   │   │   └── EmailSummary.tsx       # NEW: Summary card
│   │   └── layout/
│   │       ├── Sidebar.tsx            # NEW: Navigation sidebar
│   │       ├── Header.tsx             # NEW: Top header
│   │       └── QuickActions.tsx       # NEW: FAB menu
└── lib/
    ├── api/
    │   ├── email.ts              # EXTEND: Add send/delete APIs
    │   ├── calendar.ts           # NEW
    │   ├── contacts.ts           # NEW
    │   └── reports.ts            # NEW
```

---

## Phase 1: Critical Blockers (Week 1-2)

### 1.1 Email Composer (3-4 days) - CRITICAL

**Files to Create**:
- `frontend/components/dashboard/email/EmailComposer.tsx`
- `frontend/components/dashboard/email/AttachmentUpload.tsx`
- `frontend/pages/dashboard/email/compose.tsx`
- `backend/src/modules/email/services/email-send.service.ts`

**Frontend Tasks**:
1. Install TipTap editor
   ```bash
   npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image
   ```

2. Create `EmailComposer.tsx` component:
   - Rich text editor with toolbar (bold, italic, lists, links)
   - To/Cc/Bcc recipient fields with autocomplete
   - Subject line
   - Attachment upload with preview
   - Draft auto-save every 30 seconds
   - Send/Save as Draft buttons

3. Implement Reply/Forward logic:
   - Extract original email content
   - Add quote styling (> prefix)
   - Set proper headers (In-Reply-To, References)
   - Pre-fill recipient fields

4. Draft management:
   - Auto-save draft to backend
   - Load draft on page refresh
   - Show draft indicator in toolbar

**Backend Tasks**:
1. Create `EmailSendService`:
   ```typescript
   async sendEmail(data: {
     tenantId: string;
     providerId: string;
     to: string[];
     cc?: string[];
     bcc?: string[];
     subject: string;
     bodyHtml: string;
     bodyText: string;
     inReplyTo?: string;
     references?: string;
     attachments?: File[];
   }): Promise<{ success: boolean; messageId: string }>
   ```

2. Add send endpoints to `EmailsController`:
   - `POST /emails/send` - Send new email
   - `POST /emails/:id/reply` - Reply to email
   - `POST /emails/:id/forward` - Forward email
   - `PATCH /emails/drafts/:id` - Save draft
   - `POST /emails/drafts/:id/send` - Send draft

3. Implement provider-specific sending:
   - Gmail: Use Gmail API `messages.send`
   - Outlook: Use Graph API `/me/sendMail`
   - Generic: Use Nodemailer SMTP

**Acceptance Criteria**:
- ✅ User can compose email with rich text formatting
- ✅ User can reply to emails with quoted content
- ✅ User can forward emails
- ✅ Drafts auto-save every 30 seconds
- ✅ User can attach files (< 25MB)
- ✅ Email sends successfully via provider
- ✅ Sent email appears in Sent folder

---

### 1.2 Fix Email Delete to Server (1 day) - CRITICAL

**Problem**: Currently `DELETE /emails/:id` only marks as deleted in database, doesn't delete from server.

**Files to Modify**:
- `backend/src/modules/email/services/emails.service.ts`
- `backend/src/modules/providers/services/google-oauth.service.ts`
- `backend/src/modules/providers/services/microsoft-oauth.service.ts`
- `backend/src/modules/providers/services/imap.service.ts`

**Implementation**:

```typescript
// emails.service.ts
async deleteEmail(id: string, tenantId: string) {
  const email = await this.prisma.email.findFirst({
    where: { id, tenantId },
    include: { provider: true },
  });

  if (!email) {
    throw new NotFoundException('Email not found');
  }

  // Delete from email server first
  try {
    const accessToken = await this.getProviderAccessToken(email.provider);

    switch (email.provider.type) {
      case 'google':
        await this.googleService.deleteEmail(accessToken, email.externalId);
        break;
      case 'microsoft':
        await this.microsoftService.deleteEmail(accessToken, email.externalId);
        break;
      case 'generic':
        await this.imapService.deleteEmail(email.provider.config, email.externalId);
        break;
    }
  } catch (error) {
    this.logger.error(`Failed to delete email from server: ${error.message}`);
    // Continue with local deletion even if server fails
  }

  // Then delete from local database
  await this.prisma.email.delete({
    where: { id },
  });

  this.logger.log(`Email ${id} deleted from server and database`);
  return { success: true };
}
```

**Provider-specific deletion**:

```typescript
// GoogleOAuthService
async deleteEmail(accessToken: string, messageId: string): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth: this.createOAuth2Client() });
  gmail.context._options.auth = accessToken;

  await gmail.users.messages.trash({
    userId: 'me',
    id: messageId,
  });
}

// MicrosoftOAuthService
async deleteEmail(accessToken: string, messageId: string): Promise<void> {
  await axios.delete(
    `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}

// ImapService
async deleteEmail(config: any, uid: string): Promise<void> {
  const client = await this.connectImap(config);
  await client.messageDelete([uid], { uid: true });
  await client.logout();
}
```

**Acceptance Criteria**:
- ✅ Email deleted from Gmail server
- ✅ Email deleted from Outlook server
- ✅ Email deleted from IMAP server
- ✅ Email removed from local database
- ✅ Graceful handling if server deletion fails

---

### 1.3 Replace AI Placeholder Buttons (2 days) - HIGH

**Problem**: AI quick actions work but lack visual feedback and integration.

**Files to Modify**:
- `frontend/components/dashboard/AiAssistant.tsx`
- `frontend/components/dashboard/email/EmailView.tsx`
- Create: `frontend/components/dashboard/ai/SmartReply.tsx`
- Create: `frontend/components/dashboard/ai/EmailSummary.tsx`

**Improvements**:

1. **Add loading states and visual feedback**:
   ```tsx
   // AiAssistant.tsx
   const [actionLoading, setActionLoading] = useState<string | null>(null);

   const handleQuickAction = async (action: string) => {
     setActionLoading(action);
     try {
       // ... existing logic
     } finally {
       setActionLoading(null);
     }
   };

   // In UI:
   <Button
     onClick={() => handleQuickAction('summarize')}
     disabled={actionLoading !== null}
   >
     {actionLoading === 'summarize' ? (
       <><Loader2 className="animate-spin" /> Summarizing...</>
     ) : (
       <><FileText /> Summarize</>
     )}
   </Button>
   ```

2. **Add inline email summary card**:
   ```tsx
   // EmailSummary.tsx
   export function EmailSummary({ email, onSummarize }) {
     const [summary, setSummary] = useState<string | null>(null);
     const [loading, setLoading] = useState(false);

     const generateSummary = async () => {
       setLoading(true);
       const result = await aiApi.summarizeEmail(email.id);
       setSummary(result.summary);
       setLoading(false);
     };

     return (
       <Card className="mb-4">
         {!summary ? (
           <Button onClick={generateSummary} disabled={loading}>
             {loading ? 'Generating summary...' : 'Generate AI Summary'}
           </Button>
         ) : (
           <div className="prose">
             <h4>AI Summary</h4>
             <p>{summary}</p>
           </div>
         )}
       </Card>
     );
   }
   ```

3. **Add smart reply suggestions**:
   ```tsx
   // SmartReply.tsx
   export function SmartReply({ email, onSelectReply }) {
     const [replies, setReplies] = useState<string[]>([]);

     useEffect(() => {
       aiApi.generateReplies(email.id).then(r => setReplies(r.suggestions));
     }, [email.id]);

     return (
       <div className="space-y-2">
         <h4>Smart Replies</h4>
         {replies.map((reply, i) => (
           <Button
             key={i}
             variant="outline"
             onClick={() => onSelectReply(reply)}
           >
             {reply}
           </Button>
         ))}
       </div>
     );
   }
   ```

**Backend Tasks**:
1. Add dedicated AI endpoints:
   - `POST /ai/summarize/:emailId` - Generate email summary
   - `POST /ai/smart-reply/:emailId` - Generate reply suggestions
   - `POST /ai/categorize/:emailId` - Suggest labels/categories

**Acceptance Criteria**:
- ✅ All AI buttons show loading states
- ✅ Email summary appears inline
- ✅ Smart reply suggestions work
- ✅ Labels auto-suggested when viewing email
- ✅ Error handling with user-friendly messages

---

## Phase 2: Modern Dashboard (Week 3-4)

### 2.1 Unified Dashboard Layout (3 days) - HIGH

**Goal**: Create a modern, unified dashboard replacing the separate chat page.

**Files to Create**:
- `frontend/components/dashboard/layout/DashboardLayout.tsx`
- `frontend/components/dashboard/layout/Sidebar.tsx`
- `frontend/components/dashboard/layout/QuickActions.tsx`
- Modify: `frontend/pages/dashboard/index.tsx`

**Design**:
```
┌──────────────────────────────────────────────────────────┐
│  Header                                                   │
│  [Logo] PMSync               [Search]  [Profile] [⚙️]     │
├──────────────────────────────────────────────────────────┤
│ │                                                         │
│ │  Main Content Area                                     │
│S│  ┌─────────────────────────────────────────────────┐  │
│i│  │                                                  │  │
│d│  │  Dashboard Cards                                 │  │
│e│  │  - Unread count                                  │  │
│b│  │  - Today's calendar                              │  │
│a│  │  - Follow-up alerts                              │  │
│r│  │  - Recent activity                               │  │
│ │  │                                                  │  │
│ │  └─────────────────────────────────────────────────┘  │
│ │                                                         │
│ │  [+ Quick Actions FAB]                                 │
└──────────────────────────────────────────────────────────┘
```

**Sidebar Navigation**:
- 📊 Dashboard (home)
- 📧 Email
- 📅 Calendar
- 👤 Contacts
- 📈 Reports
- 🔗 Providers
- ⚙️ Settings

**Dashboard Cards**:
1. **Email Stats Card**:
   - Unread count by folder
   - Recent emails preview
   - Quick compose button

2. **Calendar Today Card**:
   - Today's events
   - Next upcoming event
   - Quick add event

3. **Follow-up Alerts Card**:
   - Emails awaiting reply
   - Overdue tasks
   - Action items

4. **AI Insights Card**:
   - Daily summary
   - Key topics
   - Sentiment analysis

**Quick Actions FAB** (Floating Action Button):
- 📝 Compose Email
- 📅 New Event
- 👤 Add Contact
- 🤖 Ask AI

**Remove Redundant Chat**:
- Delete standalone chat page
- Move AI assistant to sidebar panel (accessible from any page)
- Show/hide with keyboard shortcut (Cmd+K)

---

### 2.2 Calendar UI (4-5 days) - CRITICAL

**Files to Create**:
- `frontend/pages/dashboard/calendar.tsx`
- `frontend/components/dashboard/calendar/Calendar.tsx`
- `frontend/components/dashboard/calendar/EventDialog.tsx`
- `frontend/components/dashboard/calendar/EventList.tsx`
- `frontend/lib/api/calendar.ts`

**Install Dependencies**:
```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
```

**Calendar.tsx** - FullCalendar wrapper:
```tsx
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export function Calendar() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    calendarApi.getEvents().then(data => setEvents(data));
  }, []);

  const handleDateClick = (info) => {
    // Open create event dialog
    setSelectedEvent({
      start: info.date,
      allDay: info.allDay,
    });
  };

  const handleEventClick = (info) => {
    // Open edit event dialog
    setSelectedEvent(info.event);
  };

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        editable={true}
        selectable={true}
      />

      {selectedEvent && (
        <EventDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSave={handleSaveEvent}
        />
      )}
    </>
  );
}
```

**EventDialog.tsx** - Create/Edit event modal:
- Title input
- Start/End date/time pickers
- All-day checkbox
- Location input
- Description textarea
- Attendees (email autocomplete)
- Recurrence options
- Save/Cancel buttons

**Backend API** (already exists, just need frontend):
- `GET /calendar/events` - List events
- `POST /calendar/events` - Create event
- `PATCH /calendar/events/:id` - Update event
- `DELETE /calendar/events/:id` - Delete event

**Acceptance Criteria**:
- ✅ Month/Week/Day views work
- ✅ Events display correctly
- ✅ Click date to create event
- ✅ Click event to edit
- ✅ Drag to reschedule
- ✅ Multi-provider support (Google, Microsoft, CalDAV)
- ✅ Responsive mobile design

---

### 2.3 Contacts UI (3-4 days) - HIGH

**Files to Create**:
- `frontend/pages/dashboard/contacts.tsx`
- `frontend/components/dashboard/contacts/ContactsList.tsx`
- `frontend/components/dashboard/contacts/ContactDialog.tsx`
- `frontend/components/dashboard/contacts/ContactCard.tsx`
- `frontend/lib/api/contacts.ts`

**ContactsList.tsx** - Grid view of contacts:
```tsx
export function ContactsList() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    contactsApi.listContacts({ search }).then(data => setContacts(data));
  }, [search]);

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map(contact => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onClick={() => setSelectedContact(contact)}
          />
        ))}
      </div>

      {selectedContact && (
        <ContactDialog
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}
```

**ContactCard.tsx** - Individual contact card:
- Avatar (initials or photo)
- Name
- Email
- Phone
- Company
- Quick actions: Email, Call, Edit

**ContactDialog.tsx** - View/Edit contact:
- Full name
- Email addresses (multiple)
- Phone numbers (multiple)
- Company & Job title
- Notes
- Tags
- Save/Delete buttons

**Backend API** (already exists):
- `GET /contacts` - List contacts
- `GET /contacts/:id` - Get contact
- `POST /contacts` - Create contact
- `PATCH /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact

**Acceptance Criteria**:
- ✅ Grid view of all contacts
- ✅ Search by name/email
- ✅ Click to view details
- ✅ Edit contact info
- ✅ Quick email compose from contact
- ✅ Multi-provider sync (Google, Microsoft)

---

## Phase 3: Reports & Alerts (Week 5-6)

### 3.1 Daily Reports Dashboard (4-5 days) - HIGH

**Files to Create**:
- `frontend/pages/dashboard/reports.tsx`
- `frontend/components/dashboard/reports/DailyReport.tsx`
- `frontend/components/dashboard/reports/FollowUpAlerts.tsx`
- `frontend/components/dashboard/reports/ReportHistory.tsx`
- `frontend/lib/api/reports.ts`
- `backend/src/modules/reports/reports.module.ts`
- `backend/src/modules/reports/services/report.service.ts`
- `backend/src/modules/reports/services/alert.service.ts`

**DailyReport.tsx** - Today's report viewer:
```tsx
export function DailyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.getTodayReport().then(data => {
      setReport(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Skeleton />;

  return (
    <Card>
      <CardHeader>
        <h2>Daily Report - {formatDate(report.date)}</h2>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* AI Summary */}
          <section>
            <h3>Summary</h3>
            <p className="text-slate-300">{report.summary}</p>
          </section>

          {/* Stats */}
          <section>
            <h3>Email Activity</h3>
            <div className="grid grid-cols-4 gap-4">
              <StatCard label="Received" value={report.stats.received} />
              <StatCard label="Sent" value={report.stats.sent} />
              <StatCard label="Replied" value={report.stats.replied} />
              <StatCard label="Unread" value={report.stats.unread} />
            </div>
          </section>

          {/* Follow-ups */}
          <section>
            <h3>Needs Follow-up</h3>
            {report.followUps.map(item => (
              <FollowUpCard key={item.id} item={item} />
            ))}
          </section>

          {/* Key Topics */}
          <section>
            <h3>Key Topics</h3>
            <div className="flex flex-wrap gap-2">
              {report.topics.map(topic => (
                <Badge key={topic}>{topic}</Badge>
              ))}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Backend ReportService**:
```typescript
@Injectable()
export class ReportService {
  @Cron('0 8 * * *') // Daily at 8 AM
  async generateDailyReports() {
    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });

    for (const tenant of tenants) {
      await this.generateReportForTenant(tenant.id);
    }
  }

  async generateReportForTenant(tenantId: string) {
    // Get yesterday's email activity
    const yesterday = subDays(new Date(), 1);
    const emails = await this.getEmailsForDate(tenantId, yesterday);

    // Generate AI summary
    const summary = await this.aiService.generateDailySummary(emails);

    // Detect follow-ups
    const followUps = await this.detectFollowUps(tenantId, emails);

    // Extract key topics
    const topics = await this.extractTopics(emails);

    // Calculate stats
    const stats = {
      received: emails.filter(e => e.folder === 'INBOX').length,
      sent: emails.filter(e => e.folder === 'SENT').length,
      replied: emails.filter(e => e.inReplyTo).length,
      unread: emails.filter(e => !e.isRead).length,
    };

    // Save report
    return this.prisma.dailyReport.create({
      data: {
        tenantId,
        date: yesterday,
        summary,
        stats,
        followUps,
        topics,
      },
    });
  }

  async detectFollowUps(tenantId: string, emails: Email[]) {
    // Find emails with no reply in 3+ days
    const candidates = await this.prisma.email.findMany({
      where: {
        tenantId,
        folder: 'INBOX',
        isRead: true,
        receivedAt: { lte: subDays(new Date(), 3) },
        // No reply in thread
        thread: {
          is: {
            emails: {
              none: {
                folder: 'SENT',
                sentAt: { gte: subDays(new Date(), 3) },
              },
            },
          },
        },
      },
      take: 10,
    });

    return candidates.map(e => ({
      emailId: e.id,
      subject: e.subject,
      from: e.from,
      daysSince: differenceInDays(new Date(), e.receivedAt),
    }));
  }
}
```

**Acceptance Criteria**:
- ✅ Daily report generated at 8 AM
- ✅ AI summary of yesterday's activity
- ✅ Follow-up alerts for emails > 3 days old
- ✅ Email stats (sent, received, replied)
- ✅ Key topics extraction
- ✅ Report history (last 30 days)
- ✅ Export to PDF

---

## Phase 4: Polish & Optimization (Week 7-8)

### 4.1 Remove Redundant Features (1 day)

**Tasks**:
1. Delete standalone chat page:
   - Remove `frontend/pages/dashboard/index.tsx` (old chat)
   - Create new unified dashboard

2. Consolidate AI interfaces:
   - Single `AiPanel.tsx` component
   - Accessible via sidebar or Cmd+K
   - Context-aware (knows what page you're on)

3. Clean up duplicate components:
   - Merge similar email list views
   - Remove unused imports
   - Delete deprecated API methods

### 4.2 Performance Optimization (2-3 days)

**Tasks**:
1. **Email List Virtual Scrolling**:
   ```bash
   npm install react-virtual
   ```
   ```tsx
   import { useVirtual } from 'react-virtual';

   const parentRef = useRef();
   const rowVirtualizer = useVirtual({
     size: emails.length,
     parentRef,
     estimateSize: useCallback(() => 80, []),
   });
   ```

2. **Lazy Loading**:
   - Code split calendar page
   - Code split contacts page
   - Lazy load TipTap editor

3. **Image Optimization**:
   - Use Next.js Image component
   - Lazy load avatars
   - Compress uploaded attachments

4. **API Optimization**:
   - Add Redis caching for email stats
   - Debounce search queries
   - Paginate large lists

### 4.3 Mobile Responsiveness (2 days)

**Tasks**:
1. **Mobile Navigation**:
   - Collapsible sidebar → hamburger menu
   - Bottom tab bar for mobile
   - Swipe gestures for email actions

2. **Touch Optimization**:
   - Larger touch targets (min 44px)
   - Swipe to delete email
   - Pull to refresh

3. **Responsive Layouts**:
   - Single column on mobile
   - Hide AI panel on mobile (show via button)
   - Simplified toolbar

---

## Testing Strategy

### Unit Tests (Jest + RTL)
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

**Test Coverage Goals**:
- EmailComposer: 80%
- Calendar: 70%
- Contacts: 70%
- AI components: 60%

**Example Test**:
```tsx
// EmailComposer.test.tsx
describe('EmailComposer', () => {
  it('should render compose form', () => {
    render(<EmailComposer />);
    expect(screen.getByPlaceholderText('To')).toBeInTheDocument();
  });

  it('should auto-save draft every 30 seconds', async () => {
    jest.useFakeTimers();
    const saveDraft = jest.fn();
    render(<EmailComposer onSaveDraft={saveDraft} />);

    userEvent.type(screen.getByPlaceholderText('Subject'), 'Test');
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(saveDraft).toHaveBeenCalledTimes(1);
    });
  });
});
```

### E2E Tests (Playwright)
```bash
npm install --save-dev @playwright/test
```

**Critical Flows to Test**:
1. Email Composition Flow:
   - Compose → Enter recipients → Type message → Send
   - Reply to email → Edit content → Send
   - Forward email → Add recipient → Send

2. Calendar Flow:
   - Create event → Set time → Add attendees → Save
   - Edit event → Change time → Save
   - Delete event

3. AI Assistant Flow:
   - Select email → Click "Summarize" → View summary
   - Ask AI question → Receive answer

---

## Success Metrics

### Before (Current State)
- Email composition: ❌ 0% (cannot send)
- Server deletion: ❌ 0% (only marks as deleted)
- AI integration: ⚠️ 40% (basic chat only)
- Calendar: ❌ 0% (no UI)
- Contacts: ❌ 0% (no UI)
- Reports: ❌ 0% (no reports)

### After (Target State)
- Email composition: ✅ 100% (compose, reply, forward, attachments)
- Server deletion: ✅ 100% (deletes from Gmail/Outlook/IMAP)
- AI integration: ✅ 90% (smart replies, summaries, labels)
- Calendar: ✅ 80% (view, create, edit events)
- Contacts: ✅ 80% (list, search, edit)
- Reports: ✅ 70% (daily reports, follow-ups)

### User Experience Metrics
- Time to send first email: < 30 seconds
- Calendar page load: < 2 seconds
- AI response time: < 5 seconds
- Mobile usability: 90% (touch-friendly)

---

## Timeline Summary

| Phase | Duration | Focus | Priority |
|-------|----------|-------|----------|
| **Phase 1** | Week 1-2 | Email composer + delete fix + AI improvements | P0 - CRITICAL |
| **Phase 2** | Week 3-4 | Unified dashboard + Calendar + Contacts | P0 - CRITICAL |
| **Phase 3** | Week 5-6 | Daily reports + Alerts | P1 - HIGH |
| **Phase 4** | Week 7-8 | Polish + Performance + Mobile | P2 - MEDIUM |

**Total Duration**: 8 weeks (2 months)

---

## Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| TipTap complexity | HIGH | MEDIUM | Use starter kit, prototype early |
| Calendar sync delay | MEDIUM | LOW | Backend already ready, focus on UI |
| AI rate limiting | MEDIUM | MEDIUM | Add request queuing, show loading states |
| Mobile performance | MEDIUM | MEDIUM | Virtual scrolling, lazy loading |
| User adoption | HIGH | MEDIUM | Gradual rollout, gather feedback |

---

## Next Steps (This Week)

### Immediate Actions
1. **Start Email Composer** (Day 1-2)
   - Set up TipTap editor
   - Create basic compose form
   - Wire up to backend

2. **Fix Email Delete** (Day 3)
   - Implement server deletion
   - Test with Gmail/Outlook/IMAP
   - Add error handling

3. **Improve AI Buttons** (Day 4-5)
   - Add loading states
   - Create inline summary component
   - Test smart reply suggestions

---

**Plan Owner**: Development Team
**Last Updated**: 2025-11-06
**Next Review**: 2025-11-13 (weekly review)
