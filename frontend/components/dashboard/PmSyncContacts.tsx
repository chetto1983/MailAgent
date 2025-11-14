import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Button,
  IconButton,
  Divider,
  Chip,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Building,
  Calendar,
  Edit,
  Trash2,
  MessageSquare,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api-client';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  location?: string;
  tags?: string[];
  notes?: string;
  lastInteraction?: Date;
  avatar?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function PmSyncContacts() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/contacts', {
        params: { search: searchQuery || undefined, limit: 100 },
      });
      const contactsData = response.data.contacts || [];
      setContacts(contactsData);

      if (!selectedContact && contactsData[0]) {
        setSelectedContact(contactsData[0]);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedContact]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setTabValue(0);
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden' }}>
      {/* Contacts List */}
      <Paper
        sx={{
          width: { xs: '100%', md: 360 },
          borderRadius: 0,
          borderRight: 1,
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
              Contacts
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={18} />}
              onClick={() => router.push('/dashboard/contacts/new')}
            >
              New
            </Button>
          </Box>

          <TextField
            fullWidth
            size="small"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Contacts List */}
        <List sx={{ flex: 1, overflow: 'auto', p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : contacts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No contacts found
              </Typography>
            </Box>
          ) : (
            contacts.map((contact) => (
              <React.Fragment key={contact.id}>
                <ListItemButton
                  selected={selectedContact?.id === contact.id}
                  onClick={() => handleContactClick(contact)}
                  sx={{ px: 2, py: 1.5 }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {contact.name?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={contact.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {contact.company || contact.email}
                        </Typography>
                        {contact.tags && contact.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                            {contact.tags.slice(0, 2).map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
                <Divider />
              </React.Fragment>
            ))
          )}
        </List>
      </Paper>

      {/* Contact Detail Panel */}
      {selectedContact ? (
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: '2rem' }}>
                {selectedContact.name?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {selectedContact.name}
                </Typography>
                {selectedContact.position && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {selectedContact.position}
                    {selectedContact.company && ` at ${selectedContact.company}`}
                  </Typography>
                )}
                {selectedContact.tags && selectedContact.tags.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                    {selectedContact.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" color="primary" />
                    ))}
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Edit">
                  <IconButton size="small">
                    <Edit size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small">
                    <Trash2 size={18} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Mail size={18} />}
                  onClick={() => router.push(`/dashboard/email/compose?to=${selectedContact.email}`)}
                >
                  Email
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Calendar size={18} />}
                  onClick={() => router.push(`/dashboard/calendar?contact=${selectedContact.id}`)}
                >
                  Schedule
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button fullWidth variant="outlined" startIcon={<MessageSquare size={18} />}>
                  Add Note
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button fullWidth variant="outlined" startIcon={<Sparkles size={18} />}>
                  AI Insights
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="Details" />
              <Tab label="Activity" />
              <Tab label="Notes" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ flex: 1, overflow: 'auto', px: 3 }}>
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Contact Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Mail size={18} color="#0B7EFF" />
                        <Typography variant="subtitle2" color="text.secondary">
                          Email
                        </Typography>
                      </Box>
                      <Typography variant="body1">{selectedContact.email}</Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {selectedContact.phone && (
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Phone size={18} color="#00C853" />
                          <Typography variant="subtitle2" color="text.secondary">
                            Phone
                          </Typography>
                        </Box>
                        <Typography variant="body1">{selectedContact.phone}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedContact.company && (
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Building size={18} color="#FF9800" />
                          <Typography variant="subtitle2" color="text.secondary">
                            Company
                          </Typography>
                        </Box>
                        <Typography variant="body1">{selectedContact.company}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {selectedContact.location && (
                  <Grid item xs={12} sm={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <MapPin size={18} color="#9C27B0" />
                          <Typography variant="subtitle2" color="text.secondary">
                            Location
                          </Typography>
                        </Box>
                        <Typography variant="body1">{selectedContact.location}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Clock size={18} color="#757575" />
                        <Typography variant="subtitle2" color="text.secondary">
                          Last Interaction
                        </Typography>
                      </Box>
                      <Typography variant="body1">
                        {formatDate(selectedContact.lastInteraction)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {selectedContact.notes && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Notes
                  </Typography>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2">{selectedContact.notes}</Typography>
                    </CardContent>
                  </Card>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Recent Activity
              </Typography>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No recent activity
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Notes
              </Typography>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No notes yet
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  sx={{ mt: 2 }}
                >
                  Add Note
                </Button>
              </Box>
            </TabPanel>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Select a contact to view details
          </Typography>
        </Box>
      )}
    </Box>
  );
}
