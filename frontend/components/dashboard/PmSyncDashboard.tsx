import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  List,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Divider,
  LinearProgress,
  Badge,
} from '@mui/material';
import {
  Calendar,
  Mail,
  Users,
  CheckSquare,
  TrendingUp,
  Clock,
  Star,
  ArrowRight,
  Sparkles,
  Video,
  MapPin,
} from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';

interface Email {
  id: string;
  subject: string;
  from: { name: string; email: string };
  preview: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  provider?: {
    providerType: string;
  };
}

interface Event {
  id: string;
  title: string;
  startTime: Date;
  endTime?: Date;
  location?: string;
  type: 'meeting' | 'event';
}

interface Contact {
  id: string;
  name: string;
  email: string;
  company?: string;
  lastInteraction?: Date;
}

interface Stats {
  unreadEmails: number;
  todayEvents: number;
  pendingTasks: number;
  totalContacts: number;
}

export function PmSyncDashboard() {
  const router = useRouter();
  const [_loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<Email[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<Stats>({
    unreadEmails: 0,
    todayEvents: 0,
    pendingTasks: 0,
    totalContacts: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load emails
      const emailsResponse = await apiClient.get('/emails', {
        params: { limit: 5, isStarred: true },
      });
      setEmails(emailsResponse.data.emails || []);

      // Load stats
      const statsResponse = await apiClient.get('/emails/stats');
      setStats({
        unreadEmails: statsResponse.data.unread || 0,
        todayEvents: 0,
        pendingTasks: 0,
        totalContacts: 0,
      });

      // Load contacts (recent)
      const contactsResponse = await apiClient.get('/contacts', {
        params: { limit: 5 },
      });
      setContacts(contactsResponse.data.contacts || []);

      // TODO: Load events from calendar API
      setEvents([]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getProviderIcon = (providerType?: string) => {
    switch (providerType) {
      case 'google':
        return '📧';
      case 'microsoft':
        return '📨';
      default:
        return '📬';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
          {getGreeting()}, Alex
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Here&apos;s what&apos;s happening today
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          mb: 3,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        {[
          {
            value: stats.unreadEmails,
            label: 'Unread Emails',
            icon: <Mail size={24} color="white" />,
            color: 'primary.main',
          },
          {
            value: stats.todayEvents,
            label: "Today's Events",
            icon: <Calendar size={24} color="white" />,
            color: 'success.main',
          },
          {
            value: stats.pendingTasks,
            label: 'Pending Tasks',
            icon: <CheckSquare size={24} color="white" />,
            color: 'warning.main',
          },
          {
            value: stats.totalContacts,
            label: 'Contacts',
            icon: <Users size={24} color="white" />,
            color: 'info.main',
          },
        ].map((stat) => (
          <DashboardCard key={stat.label}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: stat.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {stat.icon}
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            </Box>
          </DashboardCard>
        ))}
      </Box>

      {/* Main Content Grid */}
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            md: '2fr 1fr',
          },
        }}
      >
        {/* Left Column */}
        <Box>
          {/* Upcoming Events */}
          <DashboardCard
            title="Upcoming Events"
            subtitle="Your schedule for today"
            sx={{ mb: 3 }}
          >
            {events.length === 0 ? (
              <Box
                sx={{
                  textAlign: 'center',
                  py: 4,
                }}
              >
                <Calendar size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  No events scheduled for today
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Calendar size={18} />}
                  sx={{ mt: 2 }}
                  onClick={() => router.push('/dashboard/calendar')}
                >
                  View Calendar
                </Button>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {events.map((event, index) => (
                  <React.Fragment key={event.id}>
                    {index > 0 && <Divider />}
                    <ListItemButton onClick={() => router.push('/dashboard/calendar')}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {event.type === 'meeting' ? (
                            <Video size={20} />
                          ) : (
                            <Calendar size={20} />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={event.title}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Clock size={14} />
                            <span>
                              {new Date(event.startTime).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {event.location && (
                              <>
                                <MapPin size={14} style={{ marginLeft: 8 }} />
                                <span>{event.location}</span>
                              </>
                            )}
                          </Box>
                        }
                      />
                      <Button size="small" variant="outlined">
                        Join
                      </Button>
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            )}
          </DashboardCard>

          {/* Priority Inbox */}
          <DashboardCard title="Priority Inbox" subtitle="Starred and important emails">
            {emails.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Star size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                <Typography variant="body2" color="text.secondary">
                  No starred emails
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {emails.slice(0, 5).map((email, index) => (
                  <React.Fragment key={email.id}>
                    {index > 0 && <Divider />}
                    <ListItemButton onClick={() => router.push(`/dashboard/email?id=${email.id}`)}>
                      <ListItemAvatar>
                        <Badge
                          badgeContent={getProviderIcon(email.provider?.providerType)}
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                          }}
                          sx={{
                            '& .MuiBadge-badge': {
                              fontSize: '0.6rem',
                              minWidth: 18,
                              height: 18,
                              padding: 0,
                              backgroundColor: 'transparent',
                            },
                          }}
                        >
                          <Avatar>
                            {email.from.name?.[0]?.toUpperCase() || 'U'}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: email.isRead ? 400 : 600 }}
                            >
                              {email.from.name}
                            </Typography>
                            {email.isStarred && (
                              <Star size={14} fill="currentColor" color="#FFB300" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: email.isRead ? 400 : 600,
                                color: 'text.primary',
                              }}
                            >
                              {email.subject}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {email.preview}
                            </Typography>
                          </Box>
                        }
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(email.date)}
                      </Typography>
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            )}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                endIcon={<ArrowRight size={18} />}
                onClick={() => router.push('/dashboard/email')}
              >
                View All Emails
              </Button>
            </Box>
          </DashboardCard>
        </Box>

        {/* Right Column */}
        <Box>
          {/* AI Insights */}
          <DashboardCard
            title="AI Insights"
            subtitle="Smart suggestions for you"
            sx={{ mb: 3 }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Sparkles size={20} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Smart Reply Ready
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                You have 3 emails that can be quickly replied to with AI-generated responses.
              </Typography>
              <Button
                variant="contained"
                size="small"
                sx={{
                  mt: 2,
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}
                onClick={() => router.push('/dashboard/ai')}
              >
                View Suggestions
              </Button>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Email Response Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={85}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  mb: 0.5,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                85% - Excellent!
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<TrendingUp size={18} />}
                  onClick={() => router.push('/dashboard/ai')}
                >
                  Analyze Inbox
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Sparkles size={18} />}
                  onClick={() => router.push('/dashboard/ai')}
                >
                  Smart Compose
                </Button>
              </Box>
            </Box>
          </DashboardCard>

          {/* Recent Connections */}
          <DashboardCard title="Recent Connections" subtitle="Latest contacts">
            {contacts.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent contacts
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {contacts.slice(0, 5).map((contact, index) => (
                  <React.Fragment key={contact.id}>
                    {index > 0 && <Divider />}
                    <ListItemButton
                      onClick={() => router.push(`/dashboard/contacts?id=${contact.id}`)}
                    >
                      <ListItemAvatar>
                        <Avatar>{contact.name?.[0]?.toUpperCase() || 'U'}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={contact.name}
                        secondary={contact.company || contact.email}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                        secondaryTypographyProps={{
                          fontSize: '0.75rem',
                        }}
                      />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            )}
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                endIcon={<ArrowRight size={18} />}
                onClick={() => router.push('/dashboard/contacts')}
              >
                View All
              </Button>
            </Box>
          </DashboardCard>
        </Box>
      </Box>
    </Box>
  );
}

