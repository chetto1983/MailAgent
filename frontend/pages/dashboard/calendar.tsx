import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Fab,
  CircularProgress,
  Typography,
  Stack,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Plus, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { CalendarView } from '@/components/dashboard/calendar/CalendarView';
import { EventDialog } from '@/components/dashboard/calendar/EventDialog';
import { EventDetailDialog } from '@/components/dashboard/calendar/EventDetailDialog';
import {
  calendarApi,
  type CalendarEvent,
  type CreateEventDto,
  type UpdateEventDto,
} from '@/lib/api/calendar';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';

export default function CalendarPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | undefined>(undefined);

  const [viewRange, setViewRange] = useState<{ start?: string; end?: string }>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Load providers
  useEffect(() => {
    if (user) {
      loadProviders();
    }
  }, [user]);

  const loadProviders = async () => {
    try {
      const allProviders = await providersApi.getProviders();
      setProviders(allProviders.filter((p: ProviderConfig) => p.supportsCalendar && p.isActive));
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadEvents = useCallback(async () => {
    if (!viewRange.start || !viewRange.end) {
      return;
    }

    try {
      setLoading(true);
      const response = await calendarApi.listEvents({
        providerId: selectedProvider !== 'all' ? selectedProvider : undefined,
        startTime: viewRange.start,
        endTime: viewRange.end,
        limit: 1000,
      });
      setEvents(response.data.events);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProvider, viewRange.end, viewRange.start]);

  // Load events when providers or view changes
  useEffect(() => {
    if (user && providers.length > 0) {
      loadEvents();
    }
  }, [user, providers, loadEvents]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger sync for all calendar providers
      const calendarProviders = providers.filter((p) => p.supportsCalendar && p.isActive);
      await Promise.all(
        calendarProviders.map((provider) => calendarApi.syncProvider(provider.id))
      );
      // Reload events
      await loadEvents();
    } catch (error) {
      console.error('Failed to refresh calendars:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateEvent = async (data: CreateEventDto | UpdateEventDto) => {
    try {
      await calendarApi.createEvent(data as CreateEventDto);
      await loadEvents();
    } catch (error) {
      console.error('Failed to create event:', error);
      throw error;
    }
  };

  const handleUpdateEvent = async (data: CreateEventDto | UpdateEventDto) => {
    if (!selectedEvent) return;
    try {
      await calendarApi.updateEvent(selectedEvent.id, data as UpdateEventDto);
      await loadEvents();
    } catch (error) {
      console.error('Failed to update event:', error);
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await calendarApi.deleteEvent(eventId);
      await loadEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailDialogOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setCreateDefaultDate(date);
    setIsCreateDialogOpen(true);
  };

  const handleEventDrop = async (eventId: string, newStart: Date, newEnd: Date) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    try {
      await calendarApi.updateEvent(eventId, {
        startTime: newStart,
        endTime: newEnd,
      });
      await loadEvents();
    } catch (error) {
      console.error('Failed to update event:', error);
      // Reload events to revert the change
      await loadEvents();
    }
  };

  const handleEventResize = async (eventId: string, newStart: Date, newEnd: Date) => {
    try {
      await calendarApi.updateEvent(eventId, {
        startTime: newStart,
        endTime: newEnd,
      });
      await loadEvents();
    } catch (error) {
      console.error('Failed to update event:', error);
      // Reload events to revert the change
      await loadEvents();
    }
  };

  const handleDatesChange = useCallback((start: Date, end: Date) => {
    setViewRange((prev) => {
      const nextStart = start.toISOString();
      const nextEnd = end.toISOString();
      if (prev.start === nextStart && prev.end === nextEnd) {
        return prev;
      }
      return { start: nextStart, end: nextEnd };
    });
  }, []);

  const handleEditFromDetail = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditDialogOpen(true);
  };

  if (authLoading || !user) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DashboardLayout
      title="Calendar"
      description="Manage your calendar events"
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          {providers.length > 0 && (
            <TextField
              select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="all">All Calendars</MenuItem>
              {providers.map((provider) => (
                <MenuItem key={provider.id} value={provider.id}>
                  {provider.email}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Tooltip title="Refresh calendars">
            <IconButton
              onClick={handleRefresh}
              disabled={refreshing}
              color="primary"
            >
              <RefreshCw
                size={20}
                style={{
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      <Box
        sx={{
          height: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {loading && events.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
            }}
          >
            <CircularProgress />
          </Box>
        ) : providers.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
              gap: 2,
            }}
          >
            <CalendarIcon size={64} style={{ opacity: 0.3 }} />
            <Typography variant="h6" color="text.secondary">
              No calendar providers configured
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please configure a calendar provider in the Providers page
            </Typography>
          </Box>
        ) : (
          <CalendarView
            events={events}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            onDatesChange={handleDatesChange}
          />
        )}
      </Box>

      {/* FAB for creating new events */}
      <Fab
        color="primary"
        aria-label="add event"
        onClick={() => {
          setCreateDefaultDate(undefined);
          setIsCreateDialogOpen(true);
        }}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
        }}
      >
        <Plus size={24} />
      </Fab>

      {/* Create Event Dialog */}
      <EventDialog
        open={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setCreateDefaultDate(undefined);
        }}
        onSave={handleCreateEvent}
        providers={providers}
        defaultDate={createDefaultDate}
        mode="create"
      />

      {/* Edit Event Dialog */}
      <EventDialog
        open={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleUpdateEvent}
        providers={providers}
        event={selectedEvent}
        mode="edit"
      />

      {/* Event Detail Dialog */}
      <EventDetailDialog
        open={isDetailDialogOpen}
        onClose={() => {
          setIsDetailDialogOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteEvent}
      />

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </DashboardLayout>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
