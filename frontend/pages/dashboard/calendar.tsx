import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Paper,
  Grid,
  Checkbox,
  FormControlLabel,
  Button as MuiButton,
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
import { useTranslations } from '@/lib/hooks/use-translations';
import { useLocale } from '@/lib/hooks/use-locale';

type ParsedSseMessage = {
  type: string;
  data?: string;
};

const parseSseMessage = (chunk: string): ParsedSseMessage | null => {
  if (!chunk) {
    return null;
  }

  const lines = chunk.split(/\r?\n/);
  let type = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      type = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  return { type, data: dataLines.join('\n') };
};

export default function CalendarPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const translations = useTranslations();
  const calendarCopy = translations.dashboard.calendar;
  const locale = useLocale();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createDefaultDate, setCreateDefaultDate] = useState<Date | undefined>(undefined);

  const [viewRange, setViewRange] = useState<{ start: string; end: string }>(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setMilliseconds(end.getMilliseconds() - 1);
    return { start: start.toISOString(), end: end.toISOString() };
  });

  // Track if we've loaded providers to prevent infinite loops
  const hasProvidersRef = useRef(false);
  const [visibleCalendars, setVisibleCalendars] = useState<Set<string>>(new Set());

  const makeCalendarKey = useCallback((providerId: string, calendarId?: string | null) => {
    return `${providerId}:${calendarId ?? 'primary'}`;
  }, []);

  const calendarGroups = useMemo(() => {
    const groups = new Map<
      string,
      { providerId: string; providerLabel: string; calendars: Array<{ key: string; label: string }> }
    >();

    events.forEach((event) => {
      const providerId = event.providerId;
      const providerLabel =
        event.provider?.displayName || event.provider?.email || providerId;
      const calendarId = event.calendarId || 'primary';
      const calendarLabel = event.calendarId || calendarCopy.allCalendars;
      const key = makeCalendarKey(providerId, calendarId);

      if (!groups.has(providerId)) {
        groups.set(providerId, {
          providerId,
          providerLabel,
          calendars: [],
        });
      }

      const group = groups.get(providerId)!;
      if (!group.calendars.some((calendar) => calendar.key === key)) {
        group.calendars.push({
          key,
          label: calendarLabel,
        });
      }
    });

    return Array.from(groups.values());
  }, [events, makeCalendarKey, calendarCopy.allCalendars]);

  const allCalendarKeys = useMemo(
    () => calendarGroups.flatMap((group) => group.calendars.map((calendar) => calendar.key)),
    [calendarGroups],
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Load providers - memoized to prevent unnecessary re-creations
  const loadProviders = useCallback(async () => {
    try {
      setProvidersLoading(true);
      const allProviders = await providersApi.getProviders();
      setProviders(allProviders.filter((p: ProviderConfig) => p.supportsCalendar && p.isActive));
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setProvidersLoading(false);
    }
  }, []);

  // Load providers
  useEffect(() => {
    if (user) {
      loadProviders();
    }
  }, [user, loadProviders]);

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
      // Only update if the component is still mounted and the response is valid
      if (response?.data?.events) {
        setEvents(response.data.events);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      // Don't clear events on error to prevent flickering
    } finally {
      setLoading(false);
    }
  }, [selectedProvider, viewRange.end, viewRange.start]);

  const refreshCalendarData = useCallback(() => {
    void loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    if (visibleCalendars.size === 0) {
      return events;
    }

    return events.filter((event) =>
      visibleCalendars.has(makeCalendarKey(event.providerId, event.calendarId ?? 'primary')),
    );
  }, [events, visibleCalendars, makeCalendarKey]);

  const handleToggleCalendarVisibility = useCallback((key: string) => {
    setVisibleCalendars((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleToggleProviderCalendars = useCallback(
    (calendarKeys: string[], currentlyAllSelected: boolean) => {
      setVisibleCalendars((prev) => {
        const next = new Set(prev);
        calendarKeys.forEach((key) => {
          if (currentlyAllSelected) {
            next.delete(key);
          } else {
            next.add(key);
          }
        });
        return next;
      });
    },
    [],
  );

  const handleShowAllCalendars = useCallback(() => {
    setVisibleCalendars(new Set(allCalendarKeys));
  }, [allCalendarKeys]);

  const handleHideAllCalendars = useCallback(() => {
    setVisibleCalendars(new Set());
  }, []);

  // Load events when providers or view changes
  // Use a ref to track when providers are loaded to prevent infinite loops
  useEffect(() => {
    if (providers.length > 0) {
      hasProvidersRef.current = true;
    }
  }, [providers.length]);

  useEffect(() => {
    if (user && hasProvidersRef.current) {
      loadEvents();
    }
  }, [user, loadEvents]);

  useEffect(() => {
    setVisibleCalendars((prev) => {
      if (allCalendarKeys.length === 0) {
        return prev;
      }

      if (prev.size === 0) {
        return new Set(allCalendarKeys);
      }

      let changed = false;
      const next = new Set(prev);
      allCalendarKeys.forEach((key) => {
        if (!next.has(key)) {
          next.add(key);
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [allCalendarKeys]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      return undefined;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      return undefined;
    }

    let isCancelled = false;
    let retryDelay = 2000;
    let retryHandle: number | null = null;
    const controller = new AbortController();

    const connect = async () => {
      if (isCancelled) {
        return;
      }

      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          return;
        }

        const response = await fetch(`${baseUrl}/calendar-events/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Calendar SSE connection failed with status ${response.status}`);
        }

        retryDelay = 2000;
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (!isCancelled) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const rawEvent = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const parsed = parseSseMessage(rawEvent);

            if (parsed?.type === 'calendarUpdate' && parsed.data) {
              const shouldRefresh = typeof document === 'undefined' || !document.hidden;
              if (shouldRefresh) {
                refreshCalendarData();
              }
            }

            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const nextDelay = Math.min(retryDelay * 1.5, 30000);
        retryHandle = window.setTimeout(() => {
          retryDelay = nextDelay;
          connect();
        }, retryDelay);
      }
    };

    connect();

    return () => {
      isCancelled = true;
      controller.abort();
      if (retryHandle) {
        window.clearTimeout(retryHandle);
      }
    };
  }, [user, refreshCalendarData]);

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

  const renderCalendarFilters = () => (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1">{calendarCopy.title}</Typography>
        <Stack direction="row" spacing={1}>
          <MuiButton
            size="small"
            variant="text"
            onClick={handleShowAllCalendars}
            disabled={allCalendarKeys.length === 0}
          >
            {calendarCopy.allCalendars}
          </MuiButton>
          <MuiButton
            size="small"
            variant="text"
            onClick={handleHideAllCalendars}
            disabled={visibleCalendars.size === 0}
          >
            {calendarCopy.clearSelection ?? 'Hide all'}
          </MuiButton>
        </Stack>
      </Stack>

      {calendarGroups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {providersLoading ? calendarCopy.loading : calendarCopy.noProviders}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {calendarGroups.map((group) => {
            const keys = group.calendars.map((calendar) => calendar.key);
            const selectedCount = keys.filter((key) => visibleCalendars.has(key)).length;
            const allSelected = selectedCount === keys.length && keys.length > 0;
            const partiallySelected = selectedCount > 0 && selectedCount < keys.length;

            return (
              <Box
                key={group.providerId}
                sx={{
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  pb: 1,
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={allSelected}
                      indeterminate={partiallySelected}
                      onChange={() => handleToggleProviderCalendars(keys, allSelected)}
                    />
                  }
                  label={group.providerLabel}
                />
                <Stack sx={{ pl: 4 }}>
                  {group.calendars.map((calendar) => (
                    <FormControlLabel
                      key={calendar.key}
                      control={
                        <Checkbox
                          size="small"
                          checked={visibleCalendars.has(calendar.key)}
                          onChange={() => handleToggleCalendarVisibility(calendar.key)}
                        />
                      }
                      label={calendar.label}
                    />
                  ))}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );

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
      title={calendarCopy.title}
      description={calendarCopy.description}
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
              <MenuItem value="all">{calendarCopy.allCalendars}</MenuItem>
              {providers.map((provider) => (
                <MenuItem key={provider.id} value={provider.id}>
                  {provider.email}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Tooltip title={calendarCopy.refreshTooltip}>
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
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          {renderCalendarFilters()}
        </Grid>
        <Grid item xs={12} md={9}>
          <Box
            sx={{
              height: { xs: 'auto', md: 'calc(100vh - 200px)' },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {providersLoading ? (
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
                  {calendarCopy.noProviders}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {calendarCopy.noProvidersDescription}
                </Typography>
              </Box>
            ) : loading && events.length === 0 ? (
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
            ) : (
              <CalendarView
                events={filteredEvents}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                onDatesChange={handleDatesChange}
                locale={locale}
              />
            )}
          </Box>
        </Grid>
      </Grid>

      {/* FAB for creating new events */}
      <Fab
        color="primary"
        aria-label={calendarCopy.createEvent}
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
