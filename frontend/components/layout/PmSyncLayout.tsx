import React, { useState, useEffect, useCallback } from 'react';
import { Box, ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { PmSyncSidebar } from './PmSyncSidebar';
import { PmSyncHeader } from './PmSyncHeader';
import { darkTheme, lightTheme } from '@/theme/pmSyncTheme';
import {
  DEFAULT_USER_SETTINGS,
  getStoredUserSettings,
  persistUserSettings,
  resolveThemePreference,
  type ThemePreference,
  USER_SETTINGS_EVENT,
  USER_SETTINGS_STORAGE_KEY,
} from '@/lib/utils/user-settings';
import { useAuth } from '@/lib/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';

const DRAWER_WIDTH_EXPANDED = 240;
const DRAWER_WIDTH_COLLAPSED = 72;

export interface PmSyncLayoutProps {
  children: React.ReactNode;
}

export function PmSyncLayout({ children }: PmSyncLayoutProps) {
  const { token } = useAuth();
  useWebSocket(token || null, true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    DEFAULT_USER_SETTINGS.theme,
  );

  const resolvedThemeMode = resolveThemePreference(themePreference, prefersDarkMode);
  const theme = resolvedThemeMode === 'dark' ? darkTheme : lightTheme;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Load initial settings
    const stored = getStoredUserSettings();
    setThemePreference(stored.theme ?? DEFAULT_USER_SETTINGS.theme);

    const handleSettingsEvent = (event: Event) => {
      const detail = (event as CustomEvent<typeof stored>).detail;
      if (detail?.theme) {
        setThemePreference(detail.theme);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === USER_SETTINGS_STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed.theme) {
            setThemePreference(parsed.theme);
          }
        } catch {
          // Ignore JSON errors
        }
      }
    };

    window.addEventListener(USER_SETTINGS_EVENT, handleSettingsEvent as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(USER_SETTINGS_EVENT, handleSettingsEvent as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleMobileDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const persistTheme = useCallback((preference: ThemePreference) => {
    setThemePreference(preference);
    if (typeof window === 'undefined') {
      return;
    }
    persistUserSettings({ theme: preference });
  }, []);

  const handleThemeToggle = () => {
    const next = resolvedThemeMode === 'dark' ? 'light' : 'dark';
    persistTheme(next);
  };

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <PmSyncSidebar
          collapsed={collapsed}
          onToggleCollapse={handleToggleCollapse}
          mobileOpen={mobileOpen}
          onClose={handleMobileDrawerToggle}
        />

        {/* Main Content Area */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            width: {
              xs: '100%',
              md: `calc(100% - ${drawerWidth}px)`,
            },
            ml: {
              xs: 0,
              md: `${drawerWidth}px`,
            },
            transition: (theme) =>
              theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          }}
        >
          {/* Header */}
          <PmSyncHeader
            onMenuClick={handleMobileDrawerToggle}
            onThemeToggle={handleThemeToggle}
            isDarkMode={resolvedThemeMode === 'dark'}
          />

          {/* Page Content */}
          <Box
            sx={{
              flexGrow: 1,
              p: { xs: 2, sm: 3 },
              mt: '64px', // Header height
              backgroundColor: 'background.default',
              minHeight: 'calc(100vh - 64px)',
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
