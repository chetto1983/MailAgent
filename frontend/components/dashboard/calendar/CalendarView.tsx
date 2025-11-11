import React, { useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg, EventDragStopArg, EventResizeDoneArg } from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import allLocales from '@fullcalendar/core/locales-all';
import {
  EventClickArg,
  EventContentArg,
  EventInput,
  DatesSetArg,
} from '@fullcalendar/core';
import { Box, Paper, useTheme, alpha } from '@mui/material';
import { darken } from '@mui/material/styles';
import { CalendarEvent } from '@/lib/api/calendar';

export interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onEventDrop?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onDatesChange?: (start: Date, end: Date) => void;
  locale?: string;
  calendarColors?: Record<string, string>;
}

/**
 * CalendarView Component
 *
 * Full-featured calendar component using FullCalendar
 * Supports multiple views (month, week, day, list)
 * Supports drag-and-drop and resizing
 */
export function CalendarView({
  events,
  onEventClick,
  onDateClick,
  onEventDrop,
  onEventResize,
  onDatesChange,
  locale = 'en',
  calendarColors,
}: CalendarViewProps) {
  const theme = useTheme();
  const calendarRef = useRef<FullCalendar>(null);
  const getCalendarKey = (event: CalendarEvent) =>
    `${event.providerId}:${event.calendarId ?? 'primary'}`;

  // Convert CalendarEvent to FullCalendar EventInput
  const calendarEvents: EventInput[] = events.map((event) => {
    const key = getCalendarKey(event);
    const backgroundColor = getEventColor(event, theme, calendarColors?.[key]);
    const borderColor = getEventBorderColor(event, theme, calendarColors?.[key]);

    return {
      id: event.id,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      allDay: event.isAllDay,
      backgroundColor,
      borderColor,
      textColor: theme.palette.getContrastText(backgroundColor),
      extendedProps: {
        ...event,
      },
    };
  });

  // Handle event click
  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      if (onEventClick) {
        const event = clickInfo.event.extendedProps as CalendarEvent;
        onEventClick(event);
      }
    },
    [onEventClick]
  );

  // Handle date click
  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      if (onDateClick) {
        onDateClick(arg.date);
      }
    },
    [onDateClick]
  );

  // Handle event drop (drag and drop)
  const handleEventDrop = useCallback(
    (info: EventDragStopArg) => {
      if (onEventDrop && info.event.start && info.event.end) {
        const eventId = info.event.id;
        onEventDrop(eventId, info.event.start, info.event.end);
      }
    },
    [onEventDrop]
  );

  // Handle event resize
  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      if (onEventResize && info.event.start && info.event.end) {
        const eventId = info.event.id;
        onEventResize(eventId, info.event.start, info.event.end);
      }
    },
    [onEventResize]
  );

  // Handle dates change (when view changes or navigates)
  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      if (onDatesChange) {
        onDatesChange(arg.start, arg.end);
      }
    },
    [onDatesChange]
  );

  // Custom event content rendering
  const renderEventContent = useCallback((eventInfo: EventContentArg) => {
    const event = eventInfo.event.extendedProps as CalendarEvent;

    return (
      <Box
        sx={{
          p: 0.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '0.85rem',
        }}
      >
        <Box component="span" sx={{ fontWeight: 'bold' }}>
          {eventInfo.timeText && `${eventInfo.timeText} `}
        </Box>
        <Box component="span">{eventInfo.event.title}</Box>
        {event.location && (
          <Box
            component="span"
            sx={{
              ml: 0.5,
              fontSize: '0.75rem',
              opacity: 0.8,
            }}
          >
            📍 {event.location}
          </Box>
        )}
      </Box>
    );
  }, []);

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        '& .fc': {
          height: '100%',
        },
        '& .fc-toolbar': {
          gap: 1,
          flexWrap: 'wrap',
          mb: 2,
        },
        '& .fc-toolbar-title': {
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          fontWeight: 600,
          color: 'text.primary',
        },
        '& .fc-button': {
          textTransform: 'none',
          bgcolor: 'primary.main',
          border: 'none',
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          '&:disabled': {
            opacity: 0.5,
          },
        },
        '& .fc-button-active': {
          bgcolor: 'primary.dark',
        },
        '& .fc-button-group': {
          gap: 0.5,
        },
        '& .fc-daygrid-day': {
          cursor: 'pointer',
        },
        '& .fc-daygrid-day:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.05),
        },
        '& .fc-daygrid-day-number': {
          color: 'text.primary',
          p: 1,
        },
        '& .fc-col-header-cell': {
          bgcolor: 'background.default',
          borderColor: 'divider',
          py: 1.5,
        },
        '& .fc-col-header-cell-cushion': {
          color: 'text.secondary',
          fontWeight: 600,
          textDecoration: 'none',
        },
        '& .fc-daygrid-day-frame': {
          borderColor: 'divider',
        },
        '& .fc-scrollgrid': {
          borderColor: 'divider',
        },
        '& .fc-event': {
          cursor: 'pointer',
          borderRadius: 0.5,
        },
        '& .fc-daygrid-event': {
          borderRadius: 0.5,
          mb: 0.5,
        },
        '& .fc-timegrid-event': {
          borderRadius: 0.5,
        },
        '& .fc-list-event:hover td': {
          bgcolor: alpha(theme.palette.primary.main, 0.05),
        },
        '& .fc-timegrid-slot': {
          height: '3em',
        },
        '& .fc-today-button': {
          textTransform: 'capitalize',
        },
      }}
    >
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        locales={allLocales}
        locale={locale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        initialView="dayGridMonth"
        events={calendarEvents}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={3}
        weekends={true}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        datesSet={handleDatesSet}
        eventContent={renderEventContent}
        height="100%"
        nowIndicator={true}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        expandRows={true}
        stickyHeaderDates={true}
        navLinks={true}
        businessHours={{
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: '09:00',
          endTime: '18:00',
        }}
      />
    </Paper>
  );
}

/**
 * Get event background color based on status
 */
function getEventColor(event: CalendarEvent, theme: any, customColor?: string): string {
  if (customColor) {
    return customColor;
  }

  if (event.isCancelled) {
    return theme.palette.error.main;
  }

  if (event.status === 'tentative') {
    return theme.palette.warning.main;
  }

  // Use different colors based on provider or other criteria
  return theme.palette.primary.main;
}

/**
 * Get event border color based on status
 */
function getEventBorderColor(event: CalendarEvent, theme: any, customColor?: string): string {
  if (customColor) {
    return darken(customColor, 0.2);
  }

  if (event.isCancelled) {
    return theme.palette.error.dark;
  }

  if (event.status === 'tentative') {
    return theme.palette.warning.dark;
  }

  return theme.palette.primary.dark;
}
