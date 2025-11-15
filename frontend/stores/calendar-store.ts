import { create } from 'zustand';

export interface CalendarEvent {
  id: string;
  providerId: string;
  externalId: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  attendees?: string[];
  organizer?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
  recurrence?: string;
  reminders?: number[];
  color?: string;
}

interface CalendarState {
  events: CalendarEvent[];
  selectedEvent: CalendarEvent | null;
  isLoading: boolean;
  currentView: 'month' | 'week' | 'day';
  selectedDate: Date;

  // Actions
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  setSelectedEvent: (event: CalendarEvent | null) => void;
  setLoading: (loading: boolean) => void;
  setCurrentView: (view: 'month' | 'week' | 'day') => void;
  setSelectedDate: (date: Date) => void;

  // Queries
  getEventsByDate: (date: Date) => CalendarEvent[];
  getEventsByDateRange: (startDate: Date, endDate: Date) => CalendarEvent[];

  // Reset
  reset: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  selectedEvent: null,
  isLoading: false,
  currentView: 'month',
  selectedDate: new Date(),

  setEvents: (events) => set({ events }),

  addEvent: (event) =>
    set((state) => {
      // Prevent duplicates
      if (state.events.some((e) => e.id === event.id)) {
        return state;
      }
      return {
        events: [...state.events, event],
      };
    }),

  updateEvent: (id, updates) =>
    set((state) => {
      const eventIndex = state.events.findIndex((e) => e.id === id);
      if (eventIndex === -1) return state;

      const newEvents = [...state.events];
      newEvents[eventIndex] = { ...newEvents[eventIndex], ...updates };

      return {
        events: newEvents,
        selectedEvent: state.selectedEvent?.id === id
          ? newEvents[eventIndex]
          : state.selectedEvent,
      };
    }),

  deleteEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
      selectedEvent: state.selectedEvent?.id === id ? null : state.selectedEvent,
    })),

  setSelectedEvent: (event) => set({ selectedEvent: event }),

  setLoading: (loading) => set({ isLoading: loading }),

  setCurrentView: (view) => set({ currentView: view }),

  setSelectedDate: (date) => set({ selectedDate: date }),

  getEventsByDate: (date) => {
    const events = get().events;
    const targetDate = new Date(date).toISOString().split('T')[0];
    return events.filter((event) => {
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      return eventDate === targetDate;
    });
  },

  getEventsByDateRange: (startDate, endDate) => {
    const events = get().events;
    return events.filter((event) => {
      const eventStart = new Date(event.startTime);
      return eventStart >= startDate && eventStart <= endDate;
    });
  },

  reset: () =>
    set({
      events: [],
      selectedEvent: null,
      isLoading: false,
      currentView: 'month',
      selectedDate: new Date(),
    }),
}));
