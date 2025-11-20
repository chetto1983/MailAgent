import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Tabs,
  Tab,
  Stack,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
import { contactsApi, type Contact } from '@/lib/api/contacts';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';
import { useTranslations } from '@/lib/hooks/use-translations';

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

type ContactFormState = {
  displayName: string;
  company: string;
  jobTitle: string;
  email: string;
  notes: string;
  providerId?: string;
};

const getContactName = (contact: Contact) => {
  if (contact.displayName) return contact.displayName;
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return contact.emails?.[0]?.value || 'Unnamed contact';
};

const getPrimaryEmail = (contact?: Contact | null) =>
  contact?.emails?.find((email) => email.primary)?.value ||
  contact?.emails?.[0]?.value ||
  '';

const getPrimaryPhone = (contact?: Contact | null) =>
  contact?.phoneNumbers?.find((phone) => phone.primary)?.value ||
  contact?.phoneNumbers?.[0]?.value ||
  '';

export function Contacts() {
  const router = useRouter();
  const translations = useTranslations();
  const contactsCopy = translations.dashboard.contacts;
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactDialogMode, setContactDialogMode] = useState<'create' | 'edit'>('create');
  const [contactForm, setContactForm] = useState<ContactFormState>({
    displayName: '',
    company: '',
    jobTitle: '',
    email: '',
    notes: '',
    providerId: undefined,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const selectedContactIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedContactIdRef.current = selectedContact?.id ?? null;
  }, [selectedContact]);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await contactsApi.listContacts({
        search: searchQuery || undefined,
        limit: 100,
      });
      const contactsData = response.contacts || [];
      setContacts(contactsData);

      if (contactsData.length === 0) {
        setSelectedContact(null);
        return;
      }

      const previouslySelectedId = selectedContactIdRef.current;
      const updatedSelection =
        (previouslySelectedId && contactsData.find((contact) => contact.id === previouslySelectedId)) ||
        contactsData[0];
      setSelectedContact(updatedSelection);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const loadProviders = useCallback(async () => {
    try {
      const providerData = await providersApi.getProviders();
      setProviders(providerData || []);
      setContactForm((prev) => ({
        ...prev,
        providerId: prev.providerId || providerData?.[0]?.id,
      }));
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const openCreateContactDialog = () => {
    setContactDialogMode('create');
    setContactForm({
      displayName: '',
      company: '',
      jobTitle: '',
      email: '',
      notes: '',
      providerId: providers[0]?.id,
    });
    setContactDialogOpen(true);
  };

  const openEditContactDialog = () => {
    if (!selectedContact) return;
    setContactDialogMode('edit');
    setContactForm({
      displayName: getContactName(selectedContact),
      company: selectedContact.company || '',
      jobTitle: selectedContact.jobTitle || '',
      email: getPrimaryEmail(selectedContact),
      notes: selectedContact.notes || '',
      providerId: selectedContact.providerId,
    });
    setContactDialogOpen(true);
  };

  const handleContactFormChange = (field: keyof ContactFormState, value: string) => {
    setContactForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitContact = async () => {
    if (!contactForm.providerId) {
      alert(contactsCopy.alerts.selectProvider);
      return;
    }

    try {
      setActionLoading(true);
      if (contactDialogMode === 'create') {
        await contactsApi.createContact({
          providerId: contactForm.providerId,
          displayName: contactForm.displayName || undefined,
          company: contactForm.company || undefined,
          jobTitle: contactForm.jobTitle || undefined,
          notes: contactForm.notes || undefined,
          emails: contactForm.email
            ? [{ value: contactForm.email, primary: true }]
            : undefined,
        });
      } else if (selectedContact) {
        await contactsApi.updateContact(selectedContact.id, {
          displayName: contactForm.displayName || undefined,
          company: contactForm.company || undefined,
          jobTitle: contactForm.jobTitle || undefined,
          notes: contactForm.notes || undefined,
          emails: contactForm.email
            ? [{ value: contactForm.email, primary: true }]
            : undefined,
        });
      }

      await loadContacts();
      setContactDialogOpen(false);
    } catch (error) {
      console.error('Failed to save contact:', error);
      alert(contactsCopy.alerts.failedToSave);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!selectedContact) return;
    if (!confirm(contactsCopy.alerts.deleteConfirmDescription)) return;

    try {
      setActionLoading(true);
      await contactsApi.deleteContact(selectedContact.id);
      await loadContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
      alert(contactsCopy.alerts.deleteError);
    } finally {
      setActionLoading(false);
    }
  };

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

  const selectedContactName = selectedContact ? getContactName(selectedContact) : '';
  const selectedContactEmail = getPrimaryEmail(selectedContact);
  const selectedContactPhone = getPrimaryPhone(selectedContact);
  const selectedContactLocation =
    selectedContact?.addresses && selectedContact.addresses.length > 0
      ? [
          selectedContact.addresses[0].city,
          selectedContact.addresses[0].state,
          selectedContact.addresses[0].country,
        ]
          .filter(Boolean)
          .join(', ')
      : '';
  const selectedContactInteractionDate = selectedContact?.updatedAt
    ? new Date(selectedContact.updatedAt)
    : undefined;

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
              {contactsCopy.title}
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={18} />}
              onClick={openCreateContactDialog}
            >
              {contactsCopy.new}
            </Button>
          </Box>

          <TextField
            fullWidth
            size="small"
            placeholder={contactsCopy.searchPlaceholder}
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
                {contactsCopy.noContactsFound}
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
                      {getContactName(contact)?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                <ListItemText
                  primary={getContactName(contact)}
                  secondary={
                    contact.company || getPrimaryEmail(contact) ? (
                      <Typography variant="caption" color="text.secondary">
                        {contact.company || getPrimaryEmail(contact)}
                      </Typography>
                    ) : null
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
                {selectedContactName?.[0]?.toUpperCase() || 'U'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {selectedContactName}
                </Typography>
                {(selectedContact.jobTitle || selectedContact.company) && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {selectedContact.jobTitle}
                    {selectedContact.company && ` at ${selectedContact.company}`}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={openEditContactDialog}>
                    <Edit size={18} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={handleDeleteContact} disabled={actionLoading}>
                    <Trash2 size={18} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Mail size={18} />}
                disabled={!selectedContactEmail}
                onClick={() =>
                  selectedContactEmail &&
                  router.push(`/dashboard/email/compose?to=${selectedContactEmail}`)
                }
              >
                {contactsCopy.actions.email}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Calendar size={18} />}
                onClick={() => router.push(`/dashboard/calendar?contact=${selectedContact.id}`)}
              >
                {contactsCopy.actions.schedule}
              </Button>
              <Button fullWidth variant="outlined" startIcon={<MessageSquare size={18} />}>
                {contactsCopy.actions.addNote}
              </Button>
              <Button fullWidth variant="outlined" startIcon={<Sparkles size={18} />}>
                {contactsCopy.actions.aiInsights}
              </Button>
            </Stack>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label={contactsCopy.tabs.details} />
              <Tab label={contactsCopy.tabs.activity} />
              <Tab label={contactsCopy.tabs.notes} />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ flex: 1, overflow: 'auto', px: 3 }}>
            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {contactsCopy.details.contactInformation}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                  },
                }}
              >
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Mail size={18} color="#0B7EFF" />
                      <Typography variant="subtitle2" color="text.secondary">
                        {contactsCopy.details.email}
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {selectedContactEmail || contactsCopy.details.notAvailable}
                    </Typography>
                  </CardContent>
                </Card>

                {selectedContactPhone && (
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Phone size={18} color="#00C853" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {contactsCopy.details.phone}
                        </Typography>
                      </Box>
                      <Typography variant="body1">{selectedContactPhone}</Typography>
                    </CardContent>
                  </Card>
                )}

                {selectedContact.company && (
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Building size={18} color="#FF9800" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {contactsCopy.details.company}
                        </Typography>
                      </Box>
                      <Typography variant="body1">{selectedContact.company}</Typography>
                    </CardContent>
                  </Card>
                )}

                {selectedContactLocation && (
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <MapPin size={18} color="#9C27B0" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {contactsCopy.details.location}
                        </Typography>
                      </Box>
                      <Typography variant="body1">{selectedContactLocation}</Typography>
                    </CardContent>
                  </Card>
                )}

                <Card variant="outlined" sx={{ gridColumn: '1 / -1' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Clock size={18} color="#757575" />
                      <Typography variant="subtitle2" color="text.secondary">
                        {contactsCopy.details.lastInteraction}
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {formatDate(selectedContactInteractionDate)}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {selectedContact.notes && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    {contactsCopy.notes.title}
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
                {contactsCopy.activity.title}
              </Typography>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {contactsCopy.activity.noActivity}
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                {contactsCopy.notes.title}
              </Typography>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {contactsCopy.notes.noNotes}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  sx={{ mt: 2 }}
                >
                  {contactsCopy.notes.addNote}
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
            {contactsCopy.selectContactMessage}
          </Typography>
        </Box>
      )}

      <Dialog
        open={contactDialogOpen}
        onClose={() => setContactDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {contactDialogMode === 'create' ? contactsCopy.createDialog.title : contactsCopy.editDialog.title}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth disabled={contactDialogMode === 'edit'}>
              <InputLabel>{contactsCopy.createDialog.provider}</InputLabel>
              <Select
                label={contactsCopy.createDialog.provider}
                value={contactForm.providerId || ''}
                onChange={(event) =>
                  handleContactFormChange('providerId', String(event.target.value))
                }
              >
                {providers.map((provider) => (
                  <MenuItem key={provider.id} value={provider.id}>
                    {provider.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label={contactsCopy.createDialog.name}
              value={contactForm.displayName}
              onChange={(event) => handleContactFormChange('displayName', event.target.value)}
              fullWidth
            />

            <TextField
              label={contactsCopy.createDialog.email}
              value={contactForm.email}
              onChange={(event) => handleContactFormChange('email', event.target.value)}
              fullWidth
            />

            <TextField
              label={contactsCopy.createDialog.company}
              value={contactForm.company}
              onChange={(event) => handleContactFormChange('company', event.target.value)}
              fullWidth
            />

            <TextField
              label={contactsCopy.createDialog.jobTitle}
              value={contactForm.jobTitle}
              onChange={(event) => handleContactFormChange('jobTitle', event.target.value)}
              fullWidth
            />

            <TextField
              label={contactsCopy.createDialog.notes}
              value={contactForm.notes}
              onChange={(event) => handleContactFormChange('notes', event.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialogOpen(false)}>{contactsCopy.createDialog.cancel}</Button>
          <Button
            variant="contained"
            onClick={handleSubmitContact}
            disabled={actionLoading || (contactDialogMode === 'create' && !contactForm.providerId)}
          >
            {contactDialogMode === 'create' ? contactsCopy.createDialog.create : contactsCopy.editDialog.save}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
