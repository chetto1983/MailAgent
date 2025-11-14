import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { calendarApi, type CalendarEvent, type CreateEventDto } from '@/lib/api/calendar';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';

interface CalendarCategory {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
}

export function PmSyncCalendar() {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentMonth, setCurrentMonth] = useState('');
  const [currentYear, setCurrentYear] = useState('');
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('month');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedProvider, _setSelectedProvider] = useState<string | undefined>();

  const categoryPalette = ['#9C27B0', '#00C853', '#FF9800', '#0B7EFF', '#E91E63', '#3F51B5'];
  const [categories, setCategories] = useState<CalendarCategory[]>([]);

  const [quickEventText, setQuickEventText] = useState('');
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: '',
    end: '',
    calendar: 'work',
    description: '',
  });

  const updateCalendarHeader = useCallback(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const date = calendarApi.getDate();
      setCurrentMonth(date.toLocaleDateString('en-US', { month: 'long' }));
      setCurrentYear(date.getFullYear().toString());
    }
  }, []);

  // Convert backend CalendarEvent to FullCalendar EventInput
  const convertToFullCalendarEvent = (event: CalendarEvent): EventInput => {
    const category = categories.find((c) => c.id === event.providerId);
    return {
      id: event.id,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      allDay: event.isAllDay,
      backgroundColor: category?.color || '#0B7EFF',
      extendedProps: {
        description: event.description,
        location: event.location,
        calendar: category?.name || event.calendarName || 'calendar',
        providerId: event.providerId,
      },
    };
  };

  // Load providers and events
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load providers
      const providersRes = await providersApi.getProviders();
      setProviders(providersRes || []);

      // Get date range from calendar (current view)
      let startTime: Date;
      let endTime: Date;

      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        const view = calendarApi.view;
        startTime = view.activeStart;
        endTime = view.activeEnd;
      } else {
        // Default to current month
        const now = new Date();
        startTime = new Date(now.getFullYear(), now.getMonth(), 1);
        endTime = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      // Load events
      const eventsRes = await calendarApi.listEvents({
        providerId: selectedProvider,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      setEvents((eventsRes.data.events || []).map(convertToFullCalendarEvent));
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedProvider, categories]);

  useEffect(() => {
    updateCalendarHeader();
  }, [updateCalendarHeader]);

  useEffect(() => {
    setCategories((prev) => {
      const map = new Map(prev.map((cat) => [cat.id, cat]));
      return providers.map((provider, index) => ({
        id: provider.id,
        name: provider.email,
        color: map.get(provider.id)?.color || categoryPalette[index % categoryPalette.length],
        enabled: map.get(provider.id)?.enabled ?? true,
      }));
    });
  }, [providers]);

  useEffect(() => {
    if (!calendarRef.current) return;
    const calendarApi = calendarRef.current.getApi();
    const viewName =
      viewType === 'day'
        ? 'timeGridDay'
        : viewType === 'week'
        ? 'timeGridWeek'
        : 'dayGridMonth';
    calendarApi.changeView(viewName);
  }, [viewType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePrevMonth = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().prev();
      updateCalendarHeader();
      loadData(); // Reload events for new date range
    }
  };

  const handleNextMonth = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().next();
      updateCalendarHeader();
      loadData(); // Reload events for new date range
    }
  };

  const handleToday = () => {
    if (calendarRef.current) {
      calendarRef.current.getApi().today();
      updateCalendarHeader();
      loadData(); // Reload events for new date range
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setNewEvent({
      title: '',
      start: selectInfo.startStr,
      end: selectInfo.endStr,
      calendar: 'work',
      description: '',
    });
    setEventDialogOpen(true);
  };

  const handleEventClick = (_clickInfo: EventClickArg) => {
    // Open event details dialog (planned)
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title) return;

    // Get first calendar provider (or use selected provider)
    const provider = selectedProvider
      ? providers.find(p => p.id === selectedProvider)
      : providers.find(p => p.supportsCalendar);

    if (!provider) {
      alert('No calendar provider available. Please connect a calendar provider first.');
      return;
    }

    try {
      const eventData: CreateEventDto = {
        providerId: provider.id,
        title: newEvent.title,
        description: newEvent.description,
        startTime: newEvent.start,
        endTime: newEvent.end || newEvent.start,
        isAllDay: false,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        calendarName: newEvent.calendar,
      };

      await calendarApi.createEvent(eventData);

      // Reload events from backend
      await loadData();

      setEventDialogOpen(false);
      setNewEvent({
        title: '',
        start: '',
        end: '',
        calendar: 'work',
        description: '',
      });
    } catch (error) {
      console.error('Failed to create event:', error);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleQuickEvent = async () => {
    if (!quickEventText.trim()) return;

    const provider = selectedProvider
      ? providers.find((p) => p.id === selectedProvider)
      : providers.find((p) => p.supportsCalendar);

    if (!provider) {
      alert('No calendar provider available. Please connect a provider first.');
      return;
    }

    try {
      const start = new Date();
      const end = new Date(start.getTime() + 30 * 60 * 1000);

      await calendarApi.createEvent({
        providerId: provider.id,
        title: quickEventText.trim(),
        description: '',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        isAllDay: false,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      setQuickEventText('');
      await loadData();
    } catch (error) {
      console.error('Failed to create quick event:', error);
      alert('Failed to create quick event. Please try again.');
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
      )
    );
  };

  const filteredEvents = events.filter((event) => {
    const providerId = event.extendedProps?.providerId as string | undefined;
    const category = categories.find((c) => c.id === providerId);
    return category?.enabled !== false;
  });

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Paper
        sx={{
          width: 280,
          borderRadius: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          p: 2,
        }}
      >
        {/* Quick Event Input */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Schedule a team sync for Friday morning..."
            value={quickEventText}
            onChange={(e) => setQuickEventText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleQuickEvent()}
            sx={{ mb: 1 }}
          />
          <Button
            fullWidth
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setEventDialogOpen(true)}
          >
            New Event
          </Button>
        </Box>

        {/* Calendars */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Calendars
        </Typography>
        <List sx={{ mb: 2 }}>
          {categories.map((category) => (
            <ListItem key={category.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  size="small"
                  checked={category.enabled}
                  onChange={() => handleToggleCategory(category.id)}
                  sx={{
                    color: category.color,
                    '&.Mui-checked': {
                      color: category.color,
                    },
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={category.name}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: category.color,
                }}
              />
            </ListItem>
          ))}
        </List>

        {/* AI Assistant */}
        <Box
          sx={{
            mt: 'auto',
            p: 2,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Sparkles size={20} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              AI Suggestions
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', mb: 1.5, opacity: 0.9 }}>
            There&apos;s a conflict with &lsquo;Project Alpha Review&rsquo;. Suggest moving to 3 PM?
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              Accept 3 PM
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Decline
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Calendar Main */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {currentMonth} {currentYear}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={handlePrevMonth}>
              <ChevronLeft size={20} />
            </IconButton>
            <IconButton size="small" onClick={handleNextMonth}>
              <ChevronRight size={20} />
            </IconButton>
          </Box>
          <Button variant="outlined" size="small" onClick={handleToday}>
            Today
          </Button>

          <Box sx={{ flex: 1 }} />

          <ToggleButtonGroup
            value={viewType}
            exclusive
            onChange={(_, newView) => newView && setViewType(newView)}
            size="small"
          >
            <ToggleButton value="day">Day</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Calendar Grid */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3, position: 'relative' }}>
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(0, 0, 0, 0.05)',
                zIndex: 10,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            events={filteredEvents}
            select={handleDateSelect}
            eventClick={handleEventClick}
            height="100%"
            eventDisplay="block"
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
            }}
          />
        </Box>
      </Box>

      {/* Create Event Dialog */}
      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Event Title"
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />
            <TextField
              fullWidth
              label="Start Date/Time"
              type="datetime-local"
              value={newEvent.start}
              onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="End Date/Time"
              type="datetime-local"
              value={newEvent.end}
              onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Calendar</InputLabel>
              <Select
                value={newEvent.calendar}
                onChange={(e) => setNewEvent({ ...newEvent, calendar: e.target.value })}
                label="Calendar"
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: cat.color,
                        }}
                      />
                      {cat.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateEvent}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
