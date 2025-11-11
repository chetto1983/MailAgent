import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Stack,
  MenuItem,
  Box,
  IconButton,
  Typography,
  Chip,
  InputAdornment,
} from '@mui/material';
import { X, MapPin, Users, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarEvent, CreateEventDto, UpdateEventDto } from '@/lib/api/calendar';
import { ProviderConfig } from '@/lib/api/providers';

export interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateEventDto | UpdateEventDto) => Promise<void>;
  providers: ProviderConfig[];
  event?: CalendarEvent | null;
  defaultDate?: Date;
  mode?: 'create' | 'edit';
}

/**
 * EventDialog Component
 *
 * Dialog for creating and editing calendar events
 * Supports all event properties including attendees, location, and reminders
 */
export function EventDialog({
  open,
  onClose,
  onSave,
  providers,
  event,
  defaultDate,
  mode = 'create',
}: EventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateEventDto>>({
    providerId: '',
    title: '',
    description: '',
    location: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000), // +1 hour
    isAllDay: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    attendees: [],
  });
  const [attendeeEmail, setAttendeeEmail] = useState('');

  // Initialize form data
  useEffect(() => {
    if (mode === 'edit' && event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        isAllDay: event.isAllDay,
        timeZone: event.timeZone,
        attendees: event.attendees || [],
      });
    } else if (mode === 'create') {
      const start = defaultDate || new Date();
      const end = new Date(start.getTime() + 3600000); // +1 hour
      setFormData({
        providerId: providers[0]?.id || '',
        title: '',
        description: '',
        location: '',
        startTime: start,
        endTime: end,
        isAllDay: false,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        attendees: [],
      });
    }
  }, [mode, event, defaultDate, providers, open]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === 'create') {
        await onSave(formData as CreateEventDto);
      } else {
        const updateData: UpdateEventDto = {
          title: formData.title,
          description: formData.description,
          location: formData.location,
          startTime: formData.startTime,
          endTime: formData.endTime,
          isAllDay: formData.isAllDay,
          timeZone: formData.timeZone,
          attendees: formData.attendees,
        };
        await onSave(updateData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttendee = () => {
    if (attendeeEmail && attendeeEmail.includes('@')) {
      setFormData({
        ...formData,
        attendees: [
          ...(formData.attendees || []),
          { email: attendeeEmail, name: attendeeEmail.split('@')[0] },
        ],
      });
      setAttendeeEmail('');
    }
  };

  const handleRemoveAttendee = (index: number) => {
    const newAttendees = [...(formData.attendees || [])];
    newAttendees.splice(index, 1);
    setFormData({ ...formData, attendees: newAttendees });
  };

  const formatDateTimeLocal = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().slice(0, 16);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon size={24} />
          <Typography variant="h6">
            {mode === 'create' ? 'Create Event' : 'Edit Event'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Provider Selection (only for create mode) */}
          {mode === 'create' && (
            <TextField
              select
              label="Calendar Provider"
              value={formData.providerId}
              onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
              fullWidth
              required
            >
              {providers
                .filter((p) => p.supportsCalendar)
                .map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.email} ({provider.providerType})
                  </MenuItem>
                ))}
            </TextField>
          )}

          {/* Title */}
          <TextField
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
            autoFocus
          />

          {/* Start and End Time */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Start"
              type="datetime-local"
              value={formatDateTimeLocal(formData.startTime)}
              onChange={(e) =>
                setFormData({ ...formData, startTime: new Date(e.target.value) })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="End"
              type="datetime-local"
              value={formatDateTimeLocal(formData.endTime)}
              onChange={(e) =>
                setFormData({ ...formData, endTime: new Date(e.target.value) })
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </Box>

          {/* All Day */}
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.isAllDay}
                onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
              />
            }
            label="All day event"
          />

          {/* Location */}
          <TextField
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MapPin size={20} />
                </InputAdornment>
              ),
            }}
          />

          {/* Description */}
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={4}
          />

          {/* Attendees */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Users size={18} />
              Attendees
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                placeholder="Add attendee email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAttendee();
                  }
                }}
                size="small"
                fullWidth
              />
              <Button onClick={handleAddAttendee} variant="outlined" size="small">
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {formData.attendees?.map((attendee, index) => (
                <Chip
                  key={index}
                  label={attendee.email}
                  onDelete={() => handleRemoveAttendee(index)}
                  size="small"
                />
              ))}
            </Box>
          </Box>

          {/* Time Zone */}
          <TextField
            label="Time Zone"
            value={formData.timeZone}
            onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Clock size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.title || (mode === 'create' && !formData.providerId)}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Event' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
