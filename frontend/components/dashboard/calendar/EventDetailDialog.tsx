import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Stack,
  Divider,
} from '@mui/material';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  ExternalLink,
  Edit2,
  Trash2,
} from 'lucide-react';
import { CalendarEvent } from '@/lib/api/calendar';

export interface EventDetailDialogProps {
  open: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}

/**
 * EventDetailDialog Component
 *
 * Displays full details of a calendar event
 * Provides actions to edit or delete the event
 */
export function EventDetailDialog({
  open,
  onClose,
  event,
  onEdit,
  onDelete,
}: EventDetailDialogProps) {
  if (!event) return null;

  const formatDateTime = (date: string, isAllDay: boolean): string => {
    const d = new Date(date);
    if (isAllDay) {
      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    return d.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): 'default' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'tentative':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Calendar size={24} />
          <Typography variant="h6">Event Details</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Title */}
          <Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              {event.title}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={event.status}
                color={getStatusColor(event.status)}
                size="small"
              />
              {event.isAllDay && <Chip label="All day" size="small" variant="outlined" />}
              {event.isCancelled && <Chip label="Cancelled" color="error" size="small" />}
            </Box>
          </Box>

          <Divider />

          {/* Time */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Clock size={20} style={{ marginTop: 2, flexShrink: 0 }} />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Start
              </Typography>
              <Typography variant="body1">
                {formatDateTime(event.startTime, event.isAllDay)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 0.5 }}>
                End
              </Typography>
              <Typography variant="body1">
                {formatDateTime(event.endTime, event.isAllDay)}
              </Typography>
              {event.timeZone && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Time zone: {event.timeZone}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Location */}
          {event.location && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <MapPin size={20} style={{ marginTop: 2, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Location
                </Typography>
                <Typography variant="body1">{event.location}</Typography>
              </Box>
            </Box>
          )}

          {/* Description */}
          {event.description && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Description
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {event.description}
              </Typography>
            </Box>
          )}

          {/* Organizer */}
          {event.organizer && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Organizer
              </Typography>
              <Typography variant="body1">{event.organizer}</Typography>
            </Box>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Users size={20} style={{ marginTop: 2, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Attendees ({event.attendees.length})
                </Typography>
                <Stack spacing={0.5}>
                  {event.attendees.map((attendee: any, index: number) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="body2">
                        {attendee.name || attendee.email}
                      </Typography>
                      {attendee.responseStatus && (
                        <Chip
                          label={attendee.responseStatus}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          )}

          {/* Recurrence */}
          {event.recurrence && event.recurrence.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Recurrence
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {event.recurrence.join(', ')}
              </Typography>
            </Box>
          )}

          {/* External Link */}
          {event.htmlLink && (
            <Box>
              <Button
                href={event.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<ExternalLink size={16} />}
                size="small"
              >
                View in Calendar
              </Button>
            </Box>
          )}

          <Divider />

          {/* Metadata */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              Last synced: {new Date(event.lastSyncedAt).toLocaleString()}
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {onDelete && !event.isCancelled && (
            <Button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this event?')) {
                  onDelete(event.id);
                  onClose();
                }
              }}
              startIcon={<Trash2 size={16} />}
              color="error"
              variant="outlined"
            >
              Delete
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose}>Close</Button>
          {onEdit && !event.isCancelled && (
            <Button
              onClick={() => {
                onEdit(event);
                onClose();
              }}
              startIcon={<Edit2 size={16} />}
              variant="contained"
            >
              Edit
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}
