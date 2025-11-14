import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Settings,
  User,
  Bell,
  Mail,
  Moon,
  Globe,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/router';
import { providersApi, type ProviderConfig } from '@/lib/api/providers';
import { useAuth } from '@/lib/hooks/use-auth';
import { useTranslations } from '@/lib/hooks/use-translations';

type SettingsSection =
  | 'general'
  | 'ai'
  | 'accounts'
  | 'account'
  | 'notifications';

export function PmSyncSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations();
  const settingsCopy = useMemo(() => t.dashboard.settings, [t]);
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('general');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [language, setLanguage] = useState('en-US');
  const [timezone, setTimezone] = useState('GMT-08:00');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const sections = useMemo(
    () => [
      { id: 'general', label: settingsCopy.sections.general, icon: <Settings size={20} /> },
      { id: 'ai', label: settingsCopy.sections.ai, icon: <Sparkles size={20} /> },
      { id: 'accounts', label: settingsCopy.sections.accounts, icon: <Mail size={20} /> },
      { id: 'account', label: settingsCopy.sections.account, icon: <User size={20} /> },
      { id: 'notifications', label: settingsCopy.sections.notifications, icon: <Bell size={20} /> },
    ],
    [settingsCopy.sections],
  );

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setAccountsLoading(true);
        const response = await providersApi.getProviders();
        setProviders(response || []);
      } catch (error) {
        console.error('Failed to load providers:', error);
      } finally {
        setAccountsLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const generalCopy = settingsCopy.generalPanel;
  const aiCopy = settingsCopy.aiPanel;
  const mailAccountsCopy = settingsCopy.mailAccountsPanel;
  const accountCopy = settingsCopy.accountPanel;
  const notificationsCopy = settingsCopy.notificationsPanel;

  const formatProviderType = (type: ProviderConfig['providerType']) =>
    mailAccountsCopy.providerTypes[type] || type;

  const formatLastSynced = (value?: string | null) => {
    if (!value) {
      return mailAccountsCopy.neverSynced;
    }
    return new Date(value).toLocaleString();
  };

  const accountName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';

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
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Settings
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Manage your preferences
          </Typography>
        </Box>

        <Divider />

        <List sx={{ flex: 1, p: 1 }}>
          {sections.map((section) => (
            <ListItemButton
              key={section.id}
              selected={selectedSection === section.id}
              onClick={() => setSelectedSection(section.id as SettingsSection)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{section.icon}</ListItemIcon>
              <ListItemText
                primary={section.label}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
              />
            </ListItemButton>
          ))}
        </List>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Version 1.0.0
          </Typography>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {/* General Settings */}
        {selectedSection === 'general' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {generalCopy.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {generalCopy.description}
            </Typography>

            {/* Appearance */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  {generalCopy.appearanceTitle}
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Moon size={18} />
                    <Typography variant="subtitle2">{generalCopy.themeLabel}</Typography>
                  </Box>
                  <ToggleButtonGroup
                    value={theme}
                    exclusive
                    onChange={(_, newTheme) => newTheme && setTheme(newTheme)}
                    fullWidth
                  >
                    <ToggleButton value="light">Light</ToggleButton>
                    <ToggleButton value="dark">Dark</ToggleButton>
                    <ToggleButton value="system">System</ToggleButton>
                  </ToggleButtonGroup>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {generalCopy.themeHint}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Language & Region */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  {generalCopy.languageTitle}
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>{generalCopy.languageLabel}</InputLabel>
                    <Select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      label={generalCopy.languageLabel}
                      startAdornment={
                        <Box sx={{ mr: 1, display: 'flex' }}>
                          <Globe size={18} />
                        </Box>
                      }
                    >
                      <MenuItem value="en-US">English (US)</MenuItem>
                      <MenuItem value="it-IT">Italiano</MenuItem>
                      <MenuItem value="es-ES">Español</MenuItem>
                      <MenuItem value="fr-FR">Français</MenuItem>
                      <MenuItem value="de-DE">Deutsch</MenuItem>
                    </Select>
                  </FormControl>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {generalCopy.languageHint}
                  </Typography>
                </Box>

                <Box>
                  <FormControl fullWidth>
                    <InputLabel>{generalCopy.timezoneLabel}</InputLabel>
                    <Select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      label={generalCopy.timezoneLabel}
                      startAdornment={
                        <Box sx={{ mr: 1, display: 'flex' }}>
                          <Clock size={18} />
                        </Box>
                      }
                    >
                      <MenuItem value="GMT-08:00">(GMT-08:00) Pacific Time</MenuItem>
                      <MenuItem value="GMT-05:00">(GMT-05:00) Eastern Time</MenuItem>
                      <MenuItem value="GMT+00:00">(GMT+00:00) London</MenuItem>
                      <MenuItem value="GMT+01:00">(GMT+01:00) Rome</MenuItem>
                      <MenuItem value="GMT+09:00">(GMT+09:00) Tokyo</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  {generalCopy.notificationsTitle}
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                  }
                  label={generalCopy.notificationsTitle}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                  {generalCopy.notificationsDescription}
                </Typography>

                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button variant="outlined">{generalCopy.reset}</Button>
                  <Button variant="contained">{generalCopy.save}</Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Mail Accounts */}
        {selectedSection === 'accounts' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {mailAccountsCopy.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {mailAccountsCopy.description}
            </Typography>

            <Card>
              <CardContent>
                {accountsLoading ? (
                  <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : providers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {mailAccountsCopy.empty}
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {providers.map((provider) => (
                      <Paper
                        key={provider.id}
                        variant="outlined"
                        sx={{ p: 2, borderRadius: 2 }}
                      >
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          justifyContent="space-between"
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          spacing={1}
                        >
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {provider.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatProviderType(provider.providerType)}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1}>
                            {provider.isDefault && (
                              <Chip
                                label={mailAccountsCopy.defaultBadge}
                                size="small"
                                color="primary"
                              />
                            )}
                          </Stack>
                        </Stack>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                          {provider.supportsEmail && (
                            <Chip label={mailAccountsCopy.emailBadge} size="small" />
                          )}
                          {provider.supportsCalendar && (
                            <Chip label={mailAccountsCopy.calendarBadge} size="small" />
                          )}
                          {provider.supportsContacts && (
                            <Chip label={mailAccountsCopy.contactsBadge} size="small" />
                          )}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          {mailAccountsCopy.lastSyncPrefix} {formatLastSynced(provider.lastSyncedAt)}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}

                <Box sx={{ mt: 3 }}>
                  <Button variant="outlined" onClick={() => router.push('/dashboard/providers')}>
                    {mailAccountsCopy.manage}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* AI Settings */}
        {selectedSection === 'ai' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {aiCopy.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {aiCopy.description}
            </Typography>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  {aiCopy.title}
                </Typography>

                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label={aiCopy.smartReplies}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
                  {aiCopy.smartRepliesDescription}
                </Typography>

                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label={aiCopy.summarization}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
                  {aiCopy.summarizationDescription}
                </Typography>

                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label={aiCopy.scheduling}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                  {aiCopy.schedulingDescription}
                </Typography>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button variant="contained">{aiCopy.save}</Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Account Settings */}
        {selectedSection === 'account' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {accountCopy.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {accountCopy.description}
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  {accountCopy.profileInformation}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label={accountCopy.fullName} value={accountName} fullWidth disabled />
                  <TextField label={accountCopy.email} value={user?.email ?? ''} fullWidth disabled />
                  <TextField label={accountCopy.role} value={user?.role ?? ''} fullWidth disabled />
                </Box>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  {accountCopy.readOnlyNotice}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'error.main' }}>
                  {accountCopy.dangerTitle}
                </Typography>

                <Button variant="outlined" color="error">
                  {accountCopy.deleteCta}
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Notifications */}
        {selectedSection === 'notifications' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              {notificationsCopy.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {notificationsCopy.description}
            </Typography>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  {notificationsCopy.emailToggle}
                </Typography>

                <FormControlLabel control={<Switch defaultChecked />} label="New Emails" />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
                  Get notified when you receive new emails
                </Typography>

                <FormControlLabel control={<Switch defaultChecked />} label="Calendar Reminders" />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
                  Reminders for upcoming events
                </Typography>

                <FormControlLabel control={<Switch />} label="Task Deadlines" />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                  Alerts when tasks are due
                </Typography>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button variant="contained">Save Changes</Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
}
