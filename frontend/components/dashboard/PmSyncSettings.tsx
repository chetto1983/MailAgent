import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Settings,
  User,
  Bell,
  Building,
  Moon,
  Globe,
  Clock,
  Sparkles,
} from 'lucide-react';

type SettingsSection =
  | 'general'
  | 'ai'
  | 'tenant'
  | 'account'
  | 'notifications';

export function PmSyncSettings() {
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('general');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [language, setLanguage] = useState('en-US');
  const [timezone, setTimezone] = useState('GMT-08:00');
  const [emailNotifications, setEmailNotifications] = useState(true);

  const sections = [
    { id: 'general', label: 'General', icon: <Settings size={20} /> },
    { id: 'ai', label: 'AI Agent', icon: <Sparkles size={20} /> },
    { id: 'tenant', label: 'Tenant Settings', icon: <Building size={20} /> },
    { id: 'account', label: 'Account', icon: <User size={20} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} /> },
  ];

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
              General Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Configure your application&apos;s appearance, language, and notifications.
            </Typography>

            {/* Appearance */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Appearance
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Moon size={18} />
                    <Typography variant="subtitle2">Theme</Typography>
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
                    Choose &lsquo;System&rsquo; to automatically match your operating system&apos;s light or dark mode settings.
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Language & Region */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Language & Region
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      label="Language"
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
                    This setting changes the language of the PmSync interface. It does not affect the language of your emails or calendar events.
                  </Typography>
                </Box>

                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      label="Timezone"
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
                  Notifications
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                    />
                  }
                  label="Email Notifications"
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                  Fine-tune how you receive alerts. Push notifications require you to have the PmSync app installed and permissions enabled on your device.
                </Typography>

                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button variant="outlined">Reset</Button>
                  <Button variant="contained">Save Changes</Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* AI Settings */}
        {selectedSection === 'ai' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              AI Agent Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Configure your AI assistant preferences
            </Typography>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  AI Features
                </Typography>

                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Enable Smart Replies"
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
                  AI-generated quick reply suggestions for your emails
                </Typography>

                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Email Summarization"
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
                  Automatic summaries of long email threads
                </Typography>

                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Smart Scheduling"
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
                  AI-powered meeting time suggestions
                </Typography>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button variant="contained">Save Changes</Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Account Settings */}
        {selectedSection === 'account' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              Account Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Manage your account information
            </Typography>

            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Profile Information
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Full Name" defaultValue="Alex Johnson" fullWidth />
                  <TextField label="Email" defaultValue="alex@example.com" fullWidth />
                  <TextField label="Phone" defaultValue="+1 234 567 8900" fullWidth />
                </Box>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button variant="contained">Save Changes</Button>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'error.main' }}>
                  Danger Zone
                </Typography>

                <Button variant="outlined" color="error">
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Tenant Settings */}
        {selectedSection === 'tenant' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              Tenant Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Manage organization settings
            </Typography>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Organization Information
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Organization Name" defaultValue="Acme Corp" fullWidth />
                  <TextField label="Domain" defaultValue="acme.com" fullWidth />
                </Box>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button variant="contained">Save Changes</Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Notifications */}
        {selectedSection === 'notifications' && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
              Notification Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Control when and how you receive notifications
            </Typography>

            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Email Notifications
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
