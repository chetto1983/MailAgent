# Frontend Preparation Guide - MailAgent

**Date**: November 20, 2025
**Backend Status**: ✅ **100% COMPLETE - PRODUCTION READY**
**Frontend Status**: 🟡 **90% Complete** (Missing: Calendar UI, Contacts UI)
**Priority**: **P1 - High Priority** (Backend delivery complete, ready for frontend)

---

## Executive Summary

The **backend is 100% production ready** with full bidirectional sync for all providers (Gmail, Microsoft, IMAP). The frontend is 90% complete with a modern, responsive UI built on Next.js 14.

**Missing Components**:
- ❌ **Calendar UI** (0% - High Priority)
- ❌ **Contacts UI** (0% - High Priority)

**Available Infrastructure**:
- ✅ Complete REST APIs for Calendar and Contacts
- ✅ Real-time WebSocket events
- ✅ Authentication and authorization
- ✅ State management patterns (React Query + Zustand)
- ✅ Component library (shadcn/ui + Tailwind CSS)

---

## Table of Contents

1. [Current Frontend Status](#current-frontend-status)
2. [Backend APIs Available](#backend-apis-available)
3. [Real-time Integration](#real-time-integration)
4. [Authentication Flow](#authentication-flow)
5. [State Management](#state-management)
6. [Component Architecture](#component-architecture)
7. [Calendar UI Implementation](#calendar-ui-implementation)
8. [Contacts UI Implementation](#contacts-ui-implementation)
9. [Priority Roadmap](#priority-roadmap)
10. [Technical Specifications](#technical-specifications)

---

## Current Frontend Status

### ✅ Implemented Features (90%)

| Feature | Status | Coverage |
|---------|--------|----------|
| **Email Dashboard** | ✅ Complete | 100% |
| **Email List View** | ✅ Complete | 100% |
| **Email Detail View** | ✅ Complete | 100% |
| **Email Composition** | ✅ Complete | 100% |
| **Search & Filters** | ✅ Complete | 100% |
| **AI Features** | ✅ Complete | 100% |
| **Provider Management** | ✅ Complete | 100% |
| **Settings** | ✅ Complete | 100% |
| **OAuth Flows** | ✅ Complete | 100% |
| **Real-time Updates** | ✅ Complete | 100% |
| **Calendar UI** | ❌ Missing | 0% |
| **Contacts UI** | ❌ Missing | 0% |

### 🏗️ Frontend Tech Stack

```json
{
  "framework": "Next.js 14.2.5 (App Router)",
  "language": "TypeScript 5.3",
  "ui": "React 18.3",
  "styling": "Tailwind CSS 3.4 + shadcn/ui",
  "state": "React Query 5.28 + Zustand 4.5",
  "forms": "React Hook Form 7.51",
  "realtime": "Socket.IO Client 4.7",
  "http": "Axios 1.6",
  "icons": "Lucide React 0.376",
  "calendar": "date-fns 3.6 (ready for FullCalendar integration)",
  "rich-text": "Tiptap 2.3 (for email composition)"
}
```

### 📁 Frontend Structure

```
frontend/
├── app/                    # Next.js 14 App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Main application
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── dashboard/         # Dashboard components
│   ├── email/             # Email components ✅
│   ├── calendar/          # Calendar components ❌ (TO ADD)
│   ├── contacts/          # Contacts components ❌ (TO ADD)
│   ├── ai/                # AI features ✅
│   └── providers/         # Provider management ✅
├── lib/
│   ├── api/               # API client
│   ├── hooks/             # React hooks
│   ├── stores/            # Zustand stores
│   └── utils/             # Utilities
├── types/                 # TypeScript types
└── public/                # Static assets
```

---

## Backend APIs Available

### 📧 Email APIs (✅ In Use)

All email APIs are currently integrated and working in production.

```typescript
// Email Management
GET    /api/email                     // List emails with filters
GET    /api/email/:id                 // Get email details
POST   /api/email                     // Send email
PATCH  /api/email/:id/read            // Mark as read
PATCH  /api/email/:id/unread          // Mark as unread
PATCH  /api/email/:id/star            // Star email
PATCH  /api/email/:id/unstar          // Unstar email
DELETE /api/email/:id                 // Delete email (move to trash)
DELETE /api/email/:id/permanent       // Permanently delete
POST   /api/email/:id/move            // Move to folder

// Attachments (On-Demand Download)
GET    /api/email/:emailId/attachments/:attachmentId/download
```

### 📅 Calendar APIs (⏳ Ready for Frontend)

**Status**: Backend 100% complete with bidirectional sync
**Frontend**: Not yet implemented

```typescript
// Calendar Events
GET    /api/calendar/events                    // List events with filters
GET    /api/calendar/events/:id                // Get event details
POST   /api/calendar/events                    // Create event
PATCH  /api/calendar/events/:id                // Update event
DELETE /api/calendar/events/:id                // Delete event

// Calendar Event Attachments
GET    /api/calendar/events/:eventId/attachments
POST   /api/calendar/events/:eventId/attachments/upload
GET    /api/calendar/events/:eventId/attachments/:attachmentId/download

// Calendar Management
GET    /api/calendar/calendars                 // List calendars
POST   /api/calendar/calendars                 // Create calendar
PATCH  /api/calendar/calendars/:id             // Update calendar
DELETE /api/calendar/calendars/:id             // Delete calendar

// Query Parameters
?providerId=<uuid>           // Filter by provider
?tenantId=<uuid>             // Filter by tenant (auto-applied)
?startDate=2025-11-20        // Filter events by date range
?endDate=2025-11-27
?attendeeEmail=user@email.com // Filter by attendee
```

**TypeScript Types**:

```typescript
// /frontend/types/calendar.ts (TO CREATE)
interface CalendarEvent {
  id: string;
  tenantId: string;
  providerId: string;
  externalId: string;

  // Event Details
  subject: string;
  body?: string;
  bodyPreview?: string;
  location?: string;

  // Timing
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  timeZone?: string;

  // Recurrence
  recurrence?: string; // JSON string for recurrence rules
  seriesMasterId?: string;

  // Attendees
  organizer?: {
    email: string;
    name?: string;
  };
  attendees?: Array<{
    email: string;
    name?: string;
    status?: 'accepted' | 'declined' | 'tentative' | 'none';
  }>;

  // Status
  status?: 'confirmed' | 'cancelled' | 'tentative';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  showAs?: 'free' | 'tentative' | 'busy' | 'oof';

  // Metadata
  isCancelled: boolean;
  isOrganizer: boolean;
  responseRequested: boolean;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'none';

  // Attachments
  hasAttachments: boolean;
  attachments?: CalendarEventAttachment[];

  // Sync
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface CalendarEventAttachment {
  id: string;
  eventId: string;

  name: string;
  contentType: string;
  size: number;

  // Storage
  storageKey?: string; // S3/MinIO key
  externalId?: string; // Provider attachment ID

  // Provider-specific (Google Drive, OneDrive)
  driveFileId?: string;
  driveWebUrl?: string;
  driveDownloadUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

### 👥 Contacts APIs (⏳ Ready for Frontend)

**Status**: Backend 100% complete with bidirectional sync
**Frontend**: Not yet implemented

```typescript
// Contacts
GET    /api/contacts                           // List contacts with filters
GET    /api/contacts/:id                       // Get contact details
POST   /api/contacts                           // Create contact
PATCH  /api/contacts/:id                       // Update contact
DELETE /api/contacts/:id                       // Delete contact

// Contact Groups (Gmail) / Categories (Microsoft)
GET    /api/contacts/groups                    // List contact groups
POST   /api/contacts/groups                    // Create group
PATCH  /api/contacts/groups/:id                // Update group
DELETE /api/contacts/groups/:id                // Delete group

// Query Parameters
?providerId=<uuid>              // Filter by provider
?search=john                    // Search by name/email
?email=john@example.com         // Filter by exact email
```

**TypeScript Types**:

```typescript
// /frontend/types/contact.ts (TO CREATE)
interface Contact {
  id: string;
  tenantId: string;
  providerId: string;
  externalId: string;

  // Name
  displayName: string;
  givenName?: string;
  surname?: string;
  middleName?: string;
  title?: string;

  // Contact Info
  emailAddresses: Array<{
    address: string;
    displayName?: string;
    type?: 'work' | 'home' | 'other';
  }>;

  phoneNumbers?: Array<{
    number: string;
    type?: 'mobile' | 'work' | 'home' | 'other';
  }>;

  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    type?: 'work' | 'home' | 'other';
  }>;

  // Organization
  companyName?: string;
  jobTitle?: string;
  department?: string;

  // Social
  birthday?: Date;
  notes?: string;
  website?: string;

  // Groups/Categories
  categories?: string[]; // Contact groups

  // Sync
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 🔐 Provider APIs (✅ In Use)

```typescript
// Provider Management
GET    /api/providers                          // List providers
POST   /api/providers/google/connect           // Connect Google account
POST   /api/providers/microsoft/connect        // Connect Microsoft account
POST   /api/providers/imap/connect             // Connect IMAP account
DELETE /api/providers/:id                      // Disconnect provider
PATCH  /api/providers/:id/sync                 // Trigger manual sync
```

---

## Real-time Integration

### WebSocket Connection

The backend emits real-time events via Socket.IO. The frontend already has WebSocket integration for email updates.

**Frontend WebSocket Client**: `/frontend/lib/socket.ts` (✅ Implemented)

```typescript
import io from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL, {
  auth: {
    token: getAccessToken(), // JWT token
  },
  transports: ['websocket'],
});

// Email events (✅ Already implemented)
socket.on('email:created', (data) => {
  // Refetch emails or update cache
});

socket.on('email:updated', (data) => {
  // Update email in cache
});

socket.on('email:deleted', (data) => {
  // Remove email from cache
});

// Calendar events (⏳ To implement)
socket.on('calendar:event:created', (data: CalendarEvent) => {
  // Refetch calendar events or update cache
});

socket.on('calendar:event:updated', (data: CalendarEvent) => {
  // Update event in cache
});

socket.on('calendar:event:deleted', (data: { id: string }) => {
  // Remove event from cache
});

// Contact events (⏳ To implement)
socket.on('contact:created', (data: Contact) => {
  // Refetch contacts or update cache
});

socket.on('contact:updated', (data: Contact) => {
  // Update contact in cache
});

socket.on('contact:deleted', (data: { id: string }) => {
  // Remove contact from cache
});
```

**Backend Real-time Events**:

Location: `/backend/src/modules/realtime/services/realtime-events.service.ts`

```typescript
// Emitted by backend for calendar events
emitCalendarEvent(tenantId, eventType, eventData);
// Event types: 'created', 'updated', 'deleted'

// Emitted by backend for contacts
emitContactEvent(tenantId, contactType, contactData);
// Event types: 'created', 'updated', 'deleted'
```

---

## Authentication Flow

### Current Authentication (✅ Implemented)

The frontend uses JWT-based authentication with refresh tokens.

**Flow**:
1. User logs in → `/api/auth/login` → Returns `{ accessToken, refreshToken }`
2. Frontend stores tokens in `localStorage` (consider moving to `httpOnly` cookies)
3. All API requests include `Authorization: Bearer ${accessToken}` header
4. On 401 error → Refresh token → Retry request
5. On refresh failure → Redirect to login

**Frontend Auth Utils**: `/frontend/lib/auth.ts` (✅ Implemented)

```typescript
export const getAccessToken = () => localStorage.getItem('accessToken');
export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};
```

**Axios Interceptor**: `/frontend/lib/api/client.ts` (✅ Implemented)

```typescript
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = getRefreshToken();

      try {
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });
        setTokens(data.accessToken, data.refreshToken);
        error.config.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return axios.request(error.config);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
```

### Provider OAuth Flow (✅ Implemented)

**Google OAuth**:
1. User clicks "Connect Google" → Redirects to `/api/auth/google`
2. Backend redirects to Google OAuth consent screen
3. User authorizes → Google redirects to `/api/auth/google/callback`
4. Backend exchanges code for tokens → Saves encrypted tokens to database
5. Redirects to `/dashboard/providers` with success message

**Microsoft OAuth**: Same flow, endpoints `/api/auth/microsoft` and `/api/auth/microsoft/callback`

**IMAP**: Direct form submission (username, password, host, port, TLS)

---

## State Management

### Current Strategy (✅ Implemented)

The frontend uses a combination of **React Query** (server state) and **Zustand** (client state).

#### React Query (Server State)

**Purpose**: Caching, synchronization, and invalidation of server data

**Example**: Email List (✅ Implemented)

```typescript
// /frontend/lib/hooks/useEmails.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export const useEmails = (filters?: EmailFilters) => {
  return useQuery({
    queryKey: ['emails', filters],
    queryFn: async () => {
      const { data } = await api.get('/api/email', { params: filters });
      return data;
    },
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
  });
};

export const useMarkEmailAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emailId: string) => {
      await api.patch(`/api/email/${emailId}/read`);
    },
    onSuccess: () => {
      // Invalidate emails query to refetch
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
};
```

**Pattern for Calendar** (⏳ To Implement):

```typescript
// /frontend/lib/hooks/useCalendar.ts (TO CREATE)
export const useCalendarEvents = (filters?: CalendarFilters) => {
  return useQuery({
    queryKey: ['calendar-events', filters],
    queryFn: async () => {
      const { data } = await api.get('/api/calendar/events', { params: filters });
      return data;
    },
    staleTime: 30_000,
  });
};

export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: CreateCalendarEventDTO) => {
      const { data } = await api.post('/api/calendar/events', event);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
};

export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CalendarEvent> }) => {
      const { data } = await api.patch(`/api/calendar/events/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
};

export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
};
```

**Pattern for Contacts** (⏳ To Implement):

```typescript
// /frontend/lib/hooks/useContacts.ts (TO CREATE)
export const useContacts = (filters?: ContactFilters) => {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: async () => {
      const { data } = await api.get('/api/contacts', { params: filters });
      return data;
    },
    staleTime: 30_000,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: CreateContactDTO) => {
      const { data } = await api.post('/api/contacts', contact);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

// Similar patterns for update, delete
```

#### Zustand (Client State)

**Purpose**: UI state, user preferences, temporary form state

**Example**: UI State (✅ Implemented)

```typescript
// /frontend/lib/stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  selectedEmailId: string | null;

  toggleSidebar: () => void;
  setSelectedEmailId: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  selectedEmailId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSelectedEmailId: (id) => set({ selectedEmailId: id }),
}));
```

**Pattern for Calendar UI State** (⏳ To Implement):

```typescript
// /frontend/lib/stores/calendarStore.ts (TO CREATE)
interface CalendarUIState {
  view: 'month' | 'week' | 'day' | 'agenda';
  currentDate: Date;
  selectedEventId: string | null;
  isEventDialogOpen: boolean;

  setView: (view: CalendarUIState['view']) => void;
  setCurrentDate: (date: Date) => void;
  setSelectedEventId: (id: string | null) => void;
  openEventDialog: () => void;
  closeEventDialog: () => void;
}

export const useCalendarStore = create<CalendarUIState>((set) => ({
  view: 'month',
  currentDate: new Date(),
  selectedEventId: null,
  isEventDialogOpen: false,

  setView: (view) => set({ view }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  openEventDialog: () => set({ isEventDialogOpen: true }),
  closeEventDialog: () => set({ isEventDialogOpen: false }),
}));
```

---

## Component Architecture

### Design System (✅ Implemented)

The frontend uses **shadcn/ui** components with Tailwind CSS.

**Available Components**:
- Button, Input, Textarea, Select, Checkbox, Radio
- Dialog, Sheet, Popover, Dropdown Menu, Context Menu
- Table, Card, Badge, Avatar, Separator
- Tabs, Accordion, Collapsible, Toast, Alert
- Calendar (date picker - can be extended for full calendar)
- Form, Label, Switch, Slider, Progress
- Command, Combobox (autocomplete)
- Tooltip, Hover Card

**Location**: `/frontend/components/ui/`

### Component Pattern (✅ Established)

**Email Components** (Reference for Calendar/Contacts):

```
/frontend/components/email/
├── EmailList.tsx              # List view with virtualization
├── EmailListItem.tsx          # Individual email item
├── EmailDetail.tsx            # Email detail view
├── EmailComposer.tsx          # Email composition form
├── EmailFilters.tsx           # Filters sidebar
└── EmailSearch.tsx            # Search input with filters
```

**Pattern to Follow**:
1. **List Component** - Displays items with pagination/infinite scroll
2. **Item Component** - Individual item card/row
3. **Detail Component** - Full detail view with actions
4. **Form Component** - Create/edit form with validation
5. **Filter Component** - Filters and search

### Recommended Calendar Components

```
/frontend/components/calendar/          (TO CREATE)
├── CalendarView.tsx           # Main calendar view (month/week/day)
├── CalendarHeader.tsx         # Navigation and view selector
├── CalendarEventCard.tsx      # Event display card
├── CalendarEventDialog.tsx    # Create/edit event dialog
├── CalendarEventDetail.tsx    # Event detail modal
├── CalendarFilters.tsx        # Calendar/provider filters
├── CalendarSidebar.tsx        # Mini calendar + upcoming events
└── CalendarAttachments.tsx    # Event attachment management
```

### Recommended Contacts Components

```
/frontend/components/contacts/          (TO CREATE)
├── ContactList.tsx            # Contact list with search
├── ContactCard.tsx            # Contact card/item
├── ContactDetail.tsx          # Contact detail view
├── ContactForm.tsx            # Create/edit contact form
├── ContactFilters.tsx         # Filters (groups, providers)
├── ContactGroups.tsx          # Contact groups management
└── ContactAvatar.tsx          # Avatar with fallback initials
```

---

## Calendar UI Implementation

### Priority: **P1 - High**

### Estimated Effort: **1-2 weeks**

### Design Reference

Look at modern calendar applications:
- **Google Calendar** - Clean, simple, color-coded events
- **Outlook Calendar** - Professional, detailed views
- **Apple Calendar** - Minimalist, focused design

### Recommended Library

**FullCalendar** (https://fullcalendar.io/)
- React integration: `@fullcalendar/react`
- View plugins: `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/list`
- Supports drag-and-drop, event creation, timezone handling
- Highly customizable with Tailwind CSS

**Installation**:

```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
```

**Alternative**: Build custom calendar with `date-fns` (already installed)

### Implementation Steps

#### Step 1: Create Calendar Types

```bash
# Create types file
touch frontend/types/calendar.ts
```

Copy TypeScript interfaces from [Backend APIs Available](#backend-apis-available) section above.

#### Step 2: Create API Hooks

```bash
# Create hooks file
touch frontend/lib/hooks/useCalendar.ts
```

Implement hooks from [State Management](#state-management) section above.

#### Step 3: Create UI Store

```bash
# Create store file
touch frontend/lib/stores/calendarStore.ts
```

Implement store from [State Management](#state-management) section above.

#### Step 4: Create Components

```bash
# Create components directory
mkdir -p frontend/components/calendar
```

**Component 1: CalendarView.tsx** (Main calendar)

```typescript
'use client';

import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { useCalendarEvents } from '@/lib/hooks/useCalendar';
import { useCalendarStore } from '@/lib/stores/calendarStore';

export function CalendarView() {
  const { view, currentDate } = useCalendarStore();
  const { data: events, isLoading } = useCalendarEvents({
    startDate: /* calculate from currentDate */,
    endDate: /* calculate from currentDate */,
  });

  const handleEventClick = (info: any) => {
    // Open event detail dialog
  };

  const handleDateClick = (info: any) => {
    // Open create event dialog
  };

  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={view === 'month' ? 'dayGridMonth' : 'timeGridWeek'}
        initialDate={currentDate}
        events={events?.map(event => ({
          id: event.id,
          title: event.subject,
          start: event.startTime,
          end: event.endTime,
          allDay: event.isAllDay,
          backgroundColor: /* determine from provider or calendar */,
          extendedProps: event,
        }))}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        height="auto"
      />
    </div>
  );
}
```

**Component 2: CalendarEventDialog.tsx** (Create/Edit Event)

```typescript
'use client';

import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCalendarEvent, useUpdateCalendarEvent } from '@/lib/hooks/useCalendar';

interface CalendarEventDialogProps {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent; // If editing existing event
  defaultDate?: Date; // If creating new event
}

export function CalendarEventDialog({ open, onClose, event, defaultDate }: CalendarEventDialogProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: event || {
      subject: '',
      startTime: defaultDate || new Date(),
      endTime: defaultDate || new Date(),
      isAllDay: false,
    },
  });

  const createMutation = useCreateCalendarEvent();
  const updateMutation = useUpdateCalendarEvent();

  const onSubmit = async (data: any) => {
    if (event) {
      await updateMutation.mutateAsync({ id: event.id, updates: data });
    } else {
      await createMutation.mutateAsync(data);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register('subject', { required: 'Title is required' })}
            placeholder="Event title"
          />
          {errors.subject && <p className="text-sm text-red-500">{errors.subject.message}</p>}

          {/* Add more fields: startTime, endTime, location, description, attendees, etc. */}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">
              {event ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Component 3: CalendarEventDetail.tsx** (Event Detail Modal)

**Component 4: CalendarAttachments.tsx** (Attachment Management)

**Component 5: CalendarSidebar.tsx** (Mini Calendar + Upcoming Events)

#### Step 5: Create Calendar Page

```bash
# Create page
mkdir -p frontend/app/(dashboard)/calendar
touch frontend/app/(dashboard)/calendar/page.tsx
```

```typescript
// /frontend/app/(dashboard)/calendar/page.tsx
'use client';

import { CalendarView } from '@/components/calendar/CalendarView';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';

export default function CalendarPage() {
  return (
    <div className="flex h-screen">
      <CalendarSidebar />
      <div className="flex-1 flex flex-col">
        <CalendarHeader />
        <CalendarView />
      </div>
    </div>
  );
}
```

#### Step 6: Add Real-time Events

Update `/frontend/lib/socket.ts` to handle calendar events:

```typescript
socket.on('calendar:event:created', (data: CalendarEvent) => {
  queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
});

socket.on('calendar:event:updated', (data: CalendarEvent) => {
  queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
});

socket.on('calendar:event:deleted', (data: { id: string }) => {
  queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
});
```

#### Step 7: Add Navigation Link

Update `/frontend/components/layout/Sidebar.tsx` (or similar):

```typescript
const navItems = [
  { href: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
  { href: '/dashboard/email', icon: MailIcon, label: 'Email' },
  { href: '/dashboard/calendar', icon: CalendarIcon, label: 'Calendar' }, // NEW
  { href: '/dashboard/contacts', icon: UsersIcon, label: 'Contacts' }, // NEW
  { href: '/dashboard/settings', icon: SettingsIcon, label: 'Settings' },
];
```

### Testing Calendar UI

1. **Unit Tests** - Test individual components with Jest + React Testing Library
2. **Integration Tests** - Test calendar event creation/update/delete flows
3. **E2E Tests** - Test full user journey with Playwright
4. **Manual Testing**:
   - Create event → Verify in backend database
   - Update event → Verify sync to provider (Gmail/Microsoft)
   - Delete event → Verify deletion in provider
   - Test real-time updates (open two browser windows)

---

## Contacts UI Implementation

### Priority: **P1 - High**

### Estimated Effort: **1 week**

### Design Reference

Look at modern contact management applications:
- **Google Contacts** - Clean, card-based design
- **Outlook People** - Professional, detailed profiles
- **Apple Contacts** - Minimalist, focused on essentials

### Recommended Design

- **List View**: Contact cards with avatar, name, email, company
- **Detail View**: Full contact information with tabs (Info, Activity, Notes)
- **Create/Edit**: Modal form with multiple email/phone inputs
- **Search**: Real-time search with filters (groups, providers)
- **Groups**: Tag-based contact organization

### Implementation Steps

#### Step 1: Create Contact Types

```bash
# Create types file
touch frontend/types/contact.ts
```

Copy TypeScript interfaces from [Backend APIs Available](#backend-apis-available) section above.

#### Step 2: Create API Hooks

```bash
# Create hooks file
touch frontend/lib/hooks/useContacts.ts
```

Implement hooks from [State Management](#state-management) section above.

#### Step 3: Create Components

```bash
# Create components directory
mkdir -p frontend/components/contacts
```

**Component 1: ContactList.tsx** (Contact List)

```typescript
'use client';

import { useState } from 'react';
import { useContacts } from '@/lib/hooks/useContacts';
import { ContactCard } from './ContactCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function ContactList() {
  const [search, setSearch] = useState('');
  const { data: contacts, isLoading } = useContacts({ search });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button>+ New Contact</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts?.map(contact => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>
    </div>
  );
}
```

**Component 2: ContactCard.tsx** (Contact Card)

```typescript
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
  const initials = `${contact.givenName?.[0] || ''}${contact.surname?.[0] || ''}`.toUpperCase();
  const primaryEmail = contact.emailAddresses[0]?.address;

  return (
    <Card className="cursor-pointer hover:shadow-lg transition">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold">{contact.displayName}</h3>
            <p className="text-sm text-muted-foreground">{primaryEmail}</p>
            {contact.companyName && (
              <p className="text-xs text-muted-foreground">{contact.companyName}</p>
            )}
          </div>
        </div>

        {contact.categories && contact.categories.length > 0 && (
          <div className="flex gap-1 mt-2">
            {contact.categories.map(category => (
              <Badge key={category} variant="secondary" className="text-xs">
                {category}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Component 3: ContactForm.tsx** (Create/Edit Form)

**Component 4: ContactDetail.tsx** (Detail View)

**Component 5: ContactGroups.tsx** (Groups Management)

#### Step 4: Create Contacts Page

```bash
# Create page
mkdir -p frontend/app/(dashboard)/contacts
touch frontend/app/(dashboard)/contacts/page.tsx
```

```typescript
// /frontend/app/(dashboard)/contacts/page.tsx
'use client';

import { ContactList } from '@/components/contacts/ContactList';
import { ContactFilters } from '@/components/contacts/ContactFilters';

export default function ContactsPage() {
  return (
    <div className="flex h-screen">
      <ContactFilters />
      <div className="flex-1 p-6">
        <ContactList />
      </div>
    </div>
  );
}
```

#### Step 5: Add Real-time Events

Update `/frontend/lib/socket.ts` to handle contact events:

```typescript
socket.on('contact:created', (data: Contact) => {
  queryClient.invalidateQueries({ queryKey: ['contacts'] });
});

socket.on('contact:updated', (data: Contact) => {
  queryClient.invalidateQueries({ queryKey: ['contacts'] });
});

socket.on('contact:deleted', (data: { id: string }) => {
  queryClient.invalidateQueries({ queryKey: ['contacts'] });
});
```

### Testing Contacts UI

1. **Unit Tests** - Test individual components
2. **Integration Tests** - Test contact CRUD operations
3. **E2E Tests** - Test full user journey
4. **Manual Testing**:
   - Create contact → Verify in backend database
   - Update contact → Verify sync to provider (Gmail/Microsoft)
   - Delete contact → Verify deletion in provider
   - Test real-time updates

---

## Priority Roadmap

### Phase 1: Calendar UI (Week 1-2) 🔥 **PRIORITY**

| Task | Estimated Time | Status |
|------|----------------|--------|
| Setup FullCalendar | 2 hours | ⏳ To Do |
| Create types & hooks | 4 hours | ⏳ To Do |
| Implement CalendarView | 8 hours | ⏳ To Do |
| Implement CalendarEventDialog | 6 hours | ⏳ To Do |
| Implement CalendarEventDetail | 4 hours | ⏳ To Do |
| Implement CalendarSidebar | 4 hours | ⏳ To Do |
| Implement CalendarAttachments | 6 hours | ⏳ To Do |
| Add real-time updates | 2 hours | ⏳ To Do |
| Testing & bug fixes | 8 hours | ⏳ To Do |
| **Total** | **44 hours (1-2 weeks)** | |

### Phase 2: Contacts UI (Week 3) 🔥 **PRIORITY**

| Task | Estimated Time | Status |
|------|----------------|--------|
| Create types & hooks | 3 hours | ⏳ To Do |
| Implement ContactList | 4 hours | ⏳ To Do |
| Implement ContactCard | 2 hours | ⏳ To Do |
| Implement ContactForm | 6 hours | ⏳ To Do |
| Implement ContactDetail | 4 hours | ⏳ To Do |
| Implement ContactGroups | 4 hours | ⏳ To Do |
| Add real-time updates | 2 hours | ⏳ To Do |
| Testing & bug fixes | 6 hours | ⏳ To Do |
| **Total** | **31 hours (1 week)** | |

### Phase 3: Polish & Optimization (Week 4)

| Task | Estimated Time | Status |
|------|----------------|--------|
| UI/UX improvements | 8 hours | ⏳ To Do |
| Performance optimization | 4 hours | ⏳ To Do |
| Accessibility (ARIA, keyboard navigation) | 4 hours | ⏳ To Do |
| Mobile responsiveness | 6 hours | ⏳ To Do |
| E2E tests with Playwright | 8 hours | ⏳ To Do |
| Documentation | 4 hours | ⏳ To Do |
| **Total** | **34 hours (1 week)** | |

### **Total Estimated Effort: 3-4 weeks** for 100% frontend completion

---

## Technical Specifications

### API Client Configuration

**Base URL**: Set in `/frontend/.env.local`

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

**Production**:
```env
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

### Error Handling

All API calls should use consistent error handling:

```typescript
import { toast } from '@/components/ui/use-toast';

const createMutation = useMutation({
  mutationFn: async (data) => {
    const response = await api.post('/api/calendar/events', data);
    return response.data;
  },
  onSuccess: () => {
    toast({ title: 'Event created successfully' });
  },
  onError: (error: any) => {
    const message = error.response?.data?.message || 'Failed to create event';
    toast({ title: 'Error', description: message, variant: 'destructive' });
  },
});
```

### Performance Considerations

1. **Virtualization**: Use `@tanstack/react-virtual` for large lists
2. **Pagination**: Implement cursor-based pagination for calendar events
3. **Lazy Loading**: Load event details on demand
4. **Debouncing**: Debounce search inputs (300ms)
5. **Optimistic Updates**: Update UI immediately, rollback on error
6. **Caching**: Use React Query cache effectively (30s stale time)

### Accessibility

1. **Keyboard Navigation**: All interactive elements must be keyboard accessible
2. **ARIA Labels**: Add proper ARIA labels for screen readers
3. **Focus Management**: Manage focus for dialogs and modals
4. **Color Contrast**: Ensure WCAG AA compliance (4.5:1 ratio)
5. **Semantic HTML**: Use proper HTML5 semantic elements

### Mobile Responsiveness

1. **Breakpoints**: Use Tailwind CSS breakpoints (sm, md, lg, xl, 2xl)
2. **Touch Targets**: Minimum 44x44px for touch targets
3. **Calendar View**: Switch to agenda/list view on mobile
4. **Contacts**: Single column on mobile, multi-column on desktop
5. **Forms**: Stack form fields vertically on mobile

---

## Next Steps

### Immediate Actions (This Week)

1. ✅ **Backend delivery complete** - All APIs ready for frontend consumption
2. ⏳ **Create Calendar UI** - Start with basic calendar view (FullCalendar integration)
3. ⏳ **Create Contacts UI** - Start with basic contact list and detail views
4. ⏳ **Test bidirectional sync** - Verify frontend changes sync to providers

### Short-term Goals (Next 2 Weeks)

1. ⏳ Complete Calendar UI with all features (create, edit, delete, attachments)
2. ⏳ Complete Contacts UI with all features (CRUD, groups, search)
3. ⏳ Add real-time updates for calendar and contacts
4. ⏳ Implement E2E tests with Playwright

### Long-term Goals (Next Month)

1. ⏳ Advanced calendar features (recurring events, reminders, sharing)
2. ⏳ Advanced contacts features (import/export, merge duplicates, contact notes)
3. ⏳ Performance optimization and caching improvements
4. ⏳ Mobile app considerations (React Native or PWA)

---

## Resources & References

### Documentation
- [Backend Delivery Documentation](../BACKEND_DELIVERY.md)
- [Next Steps Analysis](./NEXT_STEPS_ANALYSIS.md)
- [Test Coverage Report](./TEST_COVERAGE_REPORT.md)
- [Project Status](./PROJECT_STATUS.md)

### Libraries
- **FullCalendar**: https://fullcalendar.io/docs/react
- **React Query**: https://tanstack.com/query/latest/docs/react/overview
- **Zustand**: https://docs.pmnd.rs/zustand/getting-started/introduction
- **shadcn/ui**: https://ui.shadcn.com/
- **React Hook Form**: https://react-hook-form.com/
- **date-fns**: https://date-fns.org/

### Design Inspiration
- **Google Calendar**: https://calendar.google.com
- **Google Contacts**: https://contacts.google.com
- **Outlook Calendar**: https://outlook.live.com/calendar
- **Notion Calendar**: https://www.notion.so/product/calendar

---

## Support & Questions

For questions or issues during frontend implementation:

1. **Backend APIs**: Refer to `/docs/BACKEND_DELIVERY.md`
2. **Real-time Events**: Check `/backend/src/modules/realtime/services/realtime-events.service.ts`
3. **TypeScript Types**: Check `/backend/src/modules/calendar/entities/` and `/backend/src/modules/contacts/entities/`
4. **Testing**: Follow patterns in existing email component tests

---

**Status**: ✅ **Ready for Frontend Development**
**Backend**: ✅ **100% COMPLETE - PRODUCTION READY**
**Frontend Priority**: 🔥 **Calendar UI + Contacts UI**
**Estimated Timeline**: **3-4 weeks to 100% frontend completion**

---

**Document Version**: 1.0
**Last Updated**: November 20, 2025
**Author**: Backend Team
**Next Review**: After Calendar UI completion
