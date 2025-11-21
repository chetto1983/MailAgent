import React from 'react';
import { Box, ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme } from '@/theme/appTheme';
import { Mailbox } from '@/components/dashboard/Mailbox';
import { useAuth } from '@/lib/hooks/use-auth';
import { useWebSocket } from '@/hooks/use-websocket';

/**
 * Email Page - Fullscreen email interface like Gmail/Outlook
 *
 * Modular email interface with:
 * - EmailLayout, EmailSidebar, EmailList, EmailDetail components
 * - Centralized email-store (Zustand)
 * - Custom hooks (use-email-actions, use-keyboard-navigation)
 * - Performance optimized with memoization
 * - Fullscreen layout (no padding/container)
 */
export default function EmailPage() {
  const { token } = useAuth();
  useWebSocket(token || null, true);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <Mailbox />
      </Box>
    </ThemeProvider>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
