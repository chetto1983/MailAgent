# Frontend-Backend API Integration Guide

## Overview

This document provides a comprehensive guide to all available backend API endpoints and their corresponding frontend API clients. The MailAgent application has a fully integrated frontend-backend architecture with real-time WebSocket communication.

## Table of Contents

1. [API Client Structure](#api-client-structure)
2. [Authentication & Users](#authentication--users)
3. [Email Management](#email-management)
4. [AI Features](#ai-features)
5. [Calendar](#calendar)
6. [Contacts](#contacts)
7. [Providers](#providers)
8. [Labels](#labels)
9. [Folders](#folders)
10. [Analytics](#analytics)
11. [Compliance](#compliance)
12. [Real-time WebSocket Events](#real-time-websocket-events)

---

## API Client Structure

All API clients are located in `/frontend/lib/api/` and use the centralized `apiClient` from `/frontend/lib/api-client.ts`.

### Available Clients

- `emailApi` - Email CRUD, search, sync, threading
- `aiApi` - Chat, summarization, smart replies, categorization, memory search
- `calendarApi` - Calendar event CRUD and sync
- `contactsApi` - Contact CRUD and sync
- `providersApi` - Provider connections (Google, Microsoft, Generic)
- `labelsApi` - Custom label management
- `foldersApi` - Folder management and sync
- `analyticsApi` - Email analytics and statistics
- `complianceApi` - GDPR compliance status
- `usersApi` - User profile management

---

## Authentication & Users

### User Profile

**Update Profile**
```typescript
import { usersApi } from '@/lib/api/users';

await usersApi.updateProfile({
  firstName: 'John',
  lastName: 'Doe'
});
```

---

## Email Management

### Email CRUD Operations

**List Emails**
```typescript
import { emailApi } from '@/lib/api/email';

const response = await emailApi.listEmails({
  page: 1,
  limit: 50,
  folder: 'INBOX',
  isRead: false,
  providerId: 'provider-id',
  search: 'important',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
// Returns: { emails: Email[], pagination: { page, limit, total, totalPages } }
```

**Get Single Email**
```typescript
const email = await emailApi.getEmail('email-id');
```

**Get Email Statistics**
```typescript
const stats = await emailApi.getStats('provider-id');
// Returns: { total, unread, starred, byFolder, byProvider }
```

**Search Emails**
```typescript
const results = await emailApi.searchEmails('project deadline', 'provider-id', 20);
```

**Update Email**
```typescript
await emailApi.updateEmail('email-id', {
  isRead: true,
  isStarred: false,
  folder: 'Archive'
});
```

**Delete Email**
```typescript
await emailApi.deleteEmail('email-id');
```

**Bulk Mark as Read/Unread**
```typescript
await emailApi.bulkMarkRead(['email-id-1', 'email-id-2'], true);
```

### Email Drafts

**Save Draft** (with autosave support)
```typescript
const draft = await emailApi.saveDraft({
  id: 'draft-id', // optional, for updates
  providerId: 'provider-id',
  to: ['recipient@example.com'],
  subject: 'Draft subject',
  bodyHtml: '<p>Draft content</p>',
  bodyText: 'Draft content'
});
```

**Get Draft**
```typescript
const draft = await emailApi.getDraft('draft-id');
```

**Delete Draft**
```typescript
await emailApi.deleteDraft('draft-id');
```

### Email Threading & Conversations

**Get Conversations** (threaded view)
```typescript
const conversations = await emailApi.getConversations({
  page: 1,
  limit: 50,
  providerId: 'provider-id'
});
```

**Get Thread**
```typescript
const emails = await emailApi.getThread('thread-id');
// Returns all emails in the thread
```

### Sending Emails

**Send New Email**
```typescript
await emailApi.sendEmail({
  providerId: 'provider-id',
  to: ['recipient@example.com'],
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
  subject: 'Subject',
  bodyHtml: '<p>HTML content</p>',
  bodyText: 'Plain text content',
  attachments: [{
    filename: 'document.pdf',
    contentType: 'application/pdf',
    contentBase64: 'base64-encoded-content'
  }]
});
```

**Reply to Email**
```typescript
await emailApi.replyToEmail('email-id', {
  to: ['recipient@example.com'],
  bodyHtml: '<p>Reply content</p>',
  bodyText: 'Reply content'
});
```

**Forward Email**
```typescript
await emailApi.forwardEmail('email-id', {
  to: ['recipient@example.com'],
  bodyHtml: '<p>Forward content</p>',
  bodyText: 'Forward content'
});
```

### Email Attachments

**Download Attachment**
```typescript
const attachment = await emailApi.downloadAttachment('email-id', 'attachment-id');
// Returns: { id, filename, mimeType, size, downloadUrl, message? }
```

### Email Sync

**Trigger Manual Sync**
```typescript
await emailApi.syncProvider('provider-id');
```

**Get Sync Status**
```typescript
const status = await emailApi.getSyncStatus();
```

### Email Retention

**Get Retention Stats**
```typescript
const stats = await emailApi.getRetentionStats();
// Returns: { totalEmails, archivedEmails, recentEmails, oldUnarchived, retentionDays, estimatedSpaceSavedMB }
```

**Run Retention Policy**
```typescript
const result = await emailApi.runRetention(90); // 90 days
// Returns: { count, emailIds }
```

**Fetch Archived Email**
```typescript
const email = await emailApi.fetchArchivedEmail('email-id');
```

---

## AI Features

### Chat Sessions

**List Chat Sessions**
```typescript
import { aiApi } from '@/lib/api/ai';

const response = await aiApi.listSessions();
// Returns: { success: boolean, sessions: ChatSession[] }
```

**Get Chat Session**
```typescript
const response = await aiApi.getSession('session-id');
// Returns: { success: boolean, session: ChatSession | null }
```

**Create Chat Session**
```typescript
const response = await aiApi.createSession('en'); // or 'it'
// Returns: { success: boolean, session: ChatSession }
```

**Delete Chat Session**
```typescript
await aiApi.deleteSession('session-id');
```

**Send Message to AI Agent**
```typescript
const response = await aiApi.sendAgentMessage({
  sessionId: 'session-id', // optional, will create new if not provided
  message: 'Help me organize my inbox',
  history: [
    { role: 'user', content: 'Previous message' },
    { role: 'assistant', content: 'Previous response' }
  ],
  locale: 'en'
});
// Returns: { success, sessionId, session, messages, response, steps? }
```

### Email AI Features

**Summarize Email**
```typescript
const response = await aiApi.summarizeEmail('email-id', 'en');
// Returns: { success: boolean, summary: string }
```

**Generate Smart Replies**
```typescript
const response = await aiApi.generateSmartReplies('email-id', 'en');
// Returns: { success: boolean, suggestions: string[] }
```

**Categorize Email**
```typescript
const response = await aiApi.categorizeEmail('email-id', 'en');
// Returns: { success: boolean, labels: string[] }
```

### Memory Search

**Search Email Memory**
```typescript
const response = await aiApi.searchMemory({
  emailId: 'email-id', // optional
  query: 'project deadline', // optional
  locale: 'en',
  limit: 10
});
// Returns: { success: boolean, usedQuery: string, items: MemorySearchItem[] }
```

---

## Calendar

### Calendar Events

**List Events**
```typescript
import { calendarApi } from '@/lib/api/calendar';

const response = await calendarApi.listEvents({
  providerId: 'provider-id',
  calendarId: 'calendar-id',
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-12-31T23:59:59Z',
  limit: 100,
  offset: 0
});
// Returns: { events: CalendarEvent[], total: number }
```

**Get Event**
```typescript
const event = await calendarApi.getEvent('event-id');
```

**Create Event**
```typescript
const event = await calendarApi.createEvent({
  providerId: 'provider-id',
  calendarId: 'calendar-id',
  title: 'Team Meeting',
  description: 'Weekly team sync',
  location: 'Conference Room A',
  startTime: '2024-12-01T10:00:00Z',
  endTime: '2024-12-01T11:00:00Z',
  isAllDay: false,
  timeZone: 'America/New_York',
  attendees: [
    { email: 'john@example.com', name: 'John Doe' }
  ],
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'email', minutes: 30 },
      { method: 'popup', minutes: 10 }
    ]
  }
});
```

**Update Event**
```typescript
const event = await calendarApi.updateEvent('event-id', {
  title: 'Updated Title',
  startTime: '2024-12-01T11:00:00Z'
});
```

**Delete Event**
```typescript
await calendarApi.deleteEvent('event-id');
```

**Sync Calendar**
```typescript
const result = await calendarApi.syncProvider('provider-id');
// Returns: CalendarSyncResult
```

---

## Contacts

### Contact Management

**List Contacts**
```typescript
import { contactsApi } from '@/lib/api/contacts';

const response = await contactsApi.listContacts({
  providerId: 'provider-id',
  search: 'john',
  company: 'Acme Inc',
  limit: 50,
  offset: 0
});
// Returns: { contacts: Contact[], total: number }
```

**Get Contact**
```typescript
const contact = await contactsApi.getContact('contact-id');
```

**Create Contact**
```typescript
const contact = await contactsApi.createContact({
  providerId: 'provider-id',
  firstName: 'John',
  lastName: 'Doe',
  displayName: 'John Doe',
  emails: [
    { value: 'john@example.com', type: 'work', primary: true }
  ],
  phoneNumbers: [
    { value: '+1234567890', type: 'mobile', primary: true }
  ],
  company: 'Acme Inc',
  jobTitle: 'Software Engineer',
  notes: 'Important client contact'
});
```

**Update Contact**
```typescript
const contact = await contactsApi.updateContact('contact-id', {
  jobTitle: 'Senior Software Engineer'
});
```

**Delete Contact**
```typescript
await contactsApi.deleteContact('contact-id');
```

**Sync Contacts**
```typescript
const result = await contactsApi.syncProvider('provider-id');
// Returns: { success: boolean, contactsSynced: number }
```

---

## Providers

### Provider Connections

**List Providers**
```typescript
import { providersApi } from '@/lib/api/providers';

const providers = await providersApi.getProviders();
// Returns: ProviderConfig[]
```

**Get Provider**
```typescript
const provider = await providersApi.getProvider('provider-id');
```

**Get Provider Aliases**
```typescript
const aliases = await providersApi.getAliases('provider-id');
// Returns: ProviderAlias[]
```

**Delete Provider**
```typescript
await providersApi.deleteProvider('provider-id');
```

### Google Provider

**Get OAuth URL**
```typescript
const { authUrl, state } = await providersApi.getGoogleAuthUrl([
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar'
]);
```

**Connect Google Account**
```typescript
const provider = await providersApi.connectGoogle({
  authorizationCode: 'auth-code-from-oauth-callback',
  email: 'user@gmail.com',
  supportsCalendar: true,
  supportsContacts: true,
  isDefault: true
});
```

### Microsoft Provider

**Get OAuth URL**
```typescript
const { authUrl, state } = await providersApi.getMicrosoftAuthUrl([
  'Mail.ReadWrite',
  'Calendars.ReadWrite'
]);
```

**Connect Microsoft Account**
```typescript
const provider = await providersApi.connectMicrosoft({
  authorizationCode: 'auth-code-from-oauth-callback',
  email: 'user@outlook.com',
  supportsCalendar: true,
  supportsContacts: true,
  isDefault: false
});
```

### Generic IMAP/SMTP Provider

**Connect Generic Account**
```typescript
const provider = await providersApi.connectGeneric({
  email: 'user@customdomain.com',
  displayName: 'Custom Mail',
  imapHost: 'imap.customdomain.com',
  imapPort: 993,
  imapUsername: 'user@customdomain.com',
  imapPassword: 'password',
  imapUseTls: true,
  smtpHost: 'smtp.customdomain.com',
  smtpPort: 465,
  smtpUsername: 'user@customdomain.com',
  smtpPassword: 'password',
  smtpUseTls: true,
  supportsCalendar: false,
  supportsContacts: false,
  isDefault: false
});
```

---

## Labels

### Label Management

**List Labels**
```typescript
import { labelsApi } from '@/lib/api/labels';

const response = await labelsApi.listLabels();
// Returns: { labels: Label[] }
```

**Get Label**
```typescript
const response = await labelsApi.getLabel('label-id');
// Returns: { label: Label }
```

**Create Label**
```typescript
const response = await labelsApi.createLabel({
  name: 'Important',
  color: '#FF5722',
  order: 1
});
```

**Update Label**
```typescript
const response = await labelsApi.updateLabel('label-id', {
  name: 'Very Important',
  color: '#F44336'
});
```

**Delete Label**
```typescript
await labelsApi.deleteLabel('label-id');
```

**Add Emails to Label**
```typescript
const result = await labelsApi.addEmailsToLabel('label-id', {
  emailIds: ['email-1', 'email-2', 'email-3']
});
// Returns: { count: number }
```

**Remove Email from Label**
```typescript
await labelsApi.removeEmailFromLabel('label-id', 'email-id');
```

**Get Emails for Label**
```typescript
const response = await labelsApi.getEmailsForLabel('label-id');
// Returns: { emails: any[] }
```

**Reorder Labels**
```typescript
await labelsApi.reorderLabels({
  labelIds: ['label-1', 'label-2', 'label-3']
});
```

---

## Folders

### Folder Management

**Get All Folders**
```typescript
import { getFolders } from '@/lib/api/folders';

const response = await getFolders();
// Returns: { providers: Provider[], foldersByProvider: Record<string, Folder[]> }
```

**Get Folders by Provider**
```typescript
import { getFoldersByProvider } from '@/lib/api/folders';

const response = await getFoldersByProvider('provider-id');
// Returns: { provider: Provider, folders: Folder[] }
```

**Sync Folders for Provider**
```typescript
import { syncFolders } from '@/lib/api/folders';

const result = await syncFolders('provider-id');
// Returns: { success: boolean, foldersCount: number, folders: Folder[] }
```

**Sync All Folders**
```typescript
import { syncAllFolders } from '@/lib/api/folders';

const result = await syncAllFolders();
// Returns: { success: boolean, results: Array<{ providerId, providerEmail, success, foldersCount?, error? }> }
```

**Update Folder Counts**
```typescript
import { updateFolderCounts } from '@/lib/api/folders';

const result = await updateFolderCounts('provider-id');
// Returns: { success: boolean, message: string }
```

---

## Analytics

### Email Analytics

**Get Email Analytics** (historical data)
```typescript
import { analyticsApi } from '@/lib/api/analytics';

const data = await analyticsApi.getEmailAnalytics();
// Returns: EmailAnalyticsDataPoint[] with sent/received stats over time
```

**Get Email Statistics**
```typescript
const stats = await analyticsApi.getEmailStats('provider-id');
// Returns: { total, unread, sent, received, drafts, starred, archived, byFolder, byProvider }
```

---

## Compliance

### GDPR Compliance

**Get GDPR Status**
```typescript
import { complianceApi } from '@/lib/api/compliance';

const status = await complianceApi.getGdprStatus();
// Returns: {
//   privacyPolicyUrl?,
//   termsOfServiceUrl?,
//   dataProcessingAgreementUrl?,
//   cookiePolicyUrl?,
//   dataRetentionDays?,
//   dataExportEnabled,
//   dataDeleteEnabled,
//   cookieConsentEnabled,
//   lastUpdated?
// }
```

---

## Real-time WebSocket Events

### Using WebSocket Client

**Import and Connect**
```typescript
import { websocketClient } from '@/lib/websocket-client';

// Connect with JWT token
await websocketClient.connect('your-jwt-token');

// Check connection status
const isConnected = websocketClient.isConnected();

// Send ping
websocketClient.ping();

// Join/leave rooms
websocketClient.joinRoom('room-name');
websocketClient.leaveRoom('room-name');

// Disconnect
websocketClient.disconnect();
```

### Using the React Hook

**Automatic Connection Management**
```typescript
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/lib/hooks/use-auth';

function MyComponent() {
  const { token } = useAuth();
  const { isConnected, ping } = useWebSocket(token, true);

  // WebSocket will automatically:
  // - Connect when component mounts
  // - Subscribe to all events
  // - Update global stores on events
  // - Disconnect when component unmounts
}
```

### Available WebSocket Events

#### Email Events

- `email:new` - New email received
- `email:update` - Email updated (read status, labels, folder)
- `email:delete` - Email deleted
- `email:unread_count_update` - Unread count changed
- `email:folder_counts_update` - Folder counts updated
- `email:thread_update` - Thread updated

#### Calendar Events

- `calendar:event_new` - New calendar event
- `calendar:event_update` - Calendar event updated
- `calendar:event_delete` - Calendar event deleted

#### Contact Events

- `contact:new` - New contact added
- `contact:update` - Contact updated
- `contact:delete` - Contact deleted

#### Sync Events

- `sync:status` - Sync status update (started, in_progress, completed, failed)

#### AI Events

- `ai:classification_done` - Email classification completed
- `ai:task_suggest` - Task suggestion from AI
- `ai:insight` - AI insight generated

#### HITL Events

- `hitl:approval_required` - Human approval required
- `hitl:approval_granted` - Approval granted
- `hitl:approval_denied` - Approval denied

### Custom Event Subscriptions

```typescript
// Subscribe to specific events
const unsubscribe = websocketClient.onEmailNew((data) => {
  console.log('New email:', data.email);
  // Handle new email
});

// Unsubscribe when done
unsubscribe();
```

---

## Error Handling

All API calls use the centralized `apiClient` which handles:

- **Authentication**: Automatic JWT token inclusion
- **Error Responses**: Standardized error format
- **Retries**: Configurable retry logic
- **Timeouts**: Request timeout handling

Example error handling:

```typescript
try {
  const emails = await emailApi.listEmails({ folder: 'INBOX' });
  // Handle success
} catch (error) {
  if (error.response?.status === 401) {
    // Handle unauthorized - redirect to login
  } else if (error.response?.status === 404) {
    // Handle not found
  } else {
    // Handle other errors
    console.error('API Error:', error.message);
  }
}
```

---

## Environment Configuration

Required environment variables:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# Backend WebSocket URL (defaults to API_URL)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# OAuth Redirect URL (for provider connections)
NEXT_PUBLIC_OAUTH_REDIRECT_URL=http://localhost:3001/auth/oauth-callback
```

---

## Feature Flags

Some features are gated by feature flags:

- **User Labels**: Custom label management (requires `userLabels` flag)

Check feature availability before using these features.

---

## Best Practices

1. **Always use TypeScript types** - All API clients are fully typed
2. **Handle loading states** - Show loading indicators during API calls
3. **Handle errors gracefully** - Display user-friendly error messages
4. **Use WebSocket for real-time updates** - Don't poll for changes
5. **Optimize pagination** - Use appropriate page sizes
6. **Cache when possible** - Store data in Zustand stores
7. **Debounce search** - Avoid excessive API calls during typing
8. **Clean up subscriptions** - Always unsubscribe from WebSocket events

---

## Support

For issues or questions about the API integration, please:

1. Check this documentation
2. Review the API client source code in `/frontend/lib/api/`
3. Check the backend API documentation
4. File an issue in the project repository

---

Last Updated: December 2024
