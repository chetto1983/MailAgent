import { apiClient } from '../api-client';

// ===== TYPES =====

export type CalendarEvent = {
  id: string;
  tenantId: string;
  providerId: string;
  externalId: string;
  calendarId?: string;
  iCalUID?: string;
  title: string;
  description?: string;
  location?: string;
  organizer?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    responseStatus?: string;
  }>;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  timeZone: string;
  recurrence: string[];
  recurringEventId?: string;
  status: string;
  visibility: string;
  isDeleted: boolean;
  isCancelled: boolean;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  metadata?: Record<string, unknown>;
  htmlLink?: string;
  lastSyncedAt: string;
  syncVersion: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateEventDto = {
  providerId: string;
  calendarId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date | string;
  endTime: Date | string;
  isAllDay?: boolean;
  timeZone?: string;
  attendees?: Array<{ email: string; name?: string }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
};

export type UpdateEventDto = {
  title?: string;
  description?: string;
  location?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  isAllDay?: boolean;
  timeZone?: string;
  attendees?: Array<{ email: string; name?: string }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
};

export type CalendarEventListParams = {
  providerId?: string;
  calendarId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
};

export type CalendarEventListResponse = {
  events: CalendarEvent[];
  total: number;
};

export type CalendarSyncResult = {
  success: boolean;
  providerId: string;
  eventsProcessed: number;
  newEvents: number;
  updatedEvents: number;
  deletedEvents: number;
  syncDuration: number;
};

// ===== API CLIENT =====

export const calendarApi = {
  /**
   * List calendar events with filters
   * GET /calendar/events
   */
  listEvents(params?: CalendarEventListParams) {
    const queryParams = new URLSearchParams();

    if (params?.providerId) queryParams.append('providerId', params.providerId);
    if (params?.calendarId) queryParams.append('calendarId', params.calendarId);
    if (params?.startTime) queryParams.append('startTime', params.startTime);
    if (params?.endTime) queryParams.append('endTime', params.endTime);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return apiClient.get<CalendarEventListResponse>(`/calendar/events${query ? `?${query}` : ''}`);
  },

  /**
   * Get calendar event by ID
   * GET /calendar/events/:id
   */
  getEvent(id: string) {
    return apiClient.get<CalendarEvent>(`/calendar/events/${id}`);
  },

  /**
   * Create a new calendar event
   * POST /calendar/events
   */
  createEvent(data: CreateEventDto) {
    return apiClient.post<CalendarEvent>('/calendar/events', data);
  },

  /**
   * Update a calendar event
   * PATCH /calendar/events/:id
   */
  updateEvent(id: string, data: UpdateEventDto) {
    return apiClient.patch<CalendarEvent>(`/calendar/events/${id}`, data);
  },

  /**
   * Delete a calendar event
   * DELETE /calendar/events/:id
   */
  deleteEvent(id: string) {
    return apiClient.delete<void>(`/calendar/events/${id}`);
  },

  /**
   * Trigger manual sync for a provider
   * POST /calendar/sync/:providerId
   */
  syncProvider(providerId: string) {
    return apiClient.post<CalendarSyncResult>(`/calendar/sync/${providerId}`);
  },
};
