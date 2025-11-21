import React from 'react';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';

/**
 * Props for EmailLayout component
 */
interface EmailLayoutProps {
  /**
   * Sidebar component (folders, navigation)
   */
  sidebar: React.ReactNode;

  /**
   * Email list component
   */
  list: React.ReactNode;

  /**
   * Email detail panel component (optional - shown when email is selected)
   */
  detail?: React.ReactNode;

  /**
   * Whether to show the detail panel
   */
  showDetail?: boolean;

  /**
   * Whether sidebar is open on mobile
   */
  sidebarOpen?: boolean;

  /**
   * Callback to close mobile sidebar
   */
  onSidebarClose?: () => void;

  /**
   * Custom height for the layout (default: '100vh')
   */
  height?: string;
}

/**
 * EmailLayout - Gmail/Outlook-style email interface
 *
 * Desktop (>= md):
 * - Fixed sidebar (240px)
 * - Email list (flex: 1)
 * - Detail panel (flex: 1) when email selected
 *
 * Mobile (< md):
 * - Drawer sidebar (swipeable)
 * - Fullscreen email list
 * - Fullscreen detail panel over list
 *
 * @example
 * ```tsx
 * <EmailLayout
 *   sidebar={<EmailSidebar />}
 *   list={<EmailList />}
 *   detail={<EmailDetail />}
 *   showDetail={!!selectedEmail}
 *   sidebarOpen={mobileDrawerOpen}
 *   onSidebarClose={() => setMobileDrawerOpen(false)}
 * />
 * ```
 */
export const EmailLayout: React.FC<EmailLayoutProps> = ({
  sidebar,
  list,
  detail,
  showDetail = false,
  sidebarOpen = false,
  onSidebarClose,
  height = '100vh',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isVerySmallMobile = useMediaQuery('(max-width:360px)');

  return (
    <Box
      sx={{
        height,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}
    >
      {/* Desktop Sidebar - Fixed */}
      {!isMobile && (
        <Box
          sx={{
            width: 240,
            borderRight: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            flexShrink: 0,
            bgcolor: 'background.paper',
          }}
        >
          {sidebar}
        </Box>
      )}

      {/* Mobile Sidebar - Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={sidebarOpen}
          onClose={onSidebarClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: isVerySmallMobile ? 'calc(100vw - 56px)' : 280,
              maxWidth: 280,
              boxSizing: 'border-box',
            },
          }}
        >
          {sidebar}
        </Drawer>
      )}

      {/* Email List - Hidden on mobile when detail shown */}
      <Box
        sx={{
          flex: 1,
          borderRight: { xs: 0, md: showDetail ? 1 : 0 },
          borderColor: 'divider',
          display: isMobile && showDetail ? 'none' : 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'background.default',
        }}
      >
        {list}
      </Box>

      {/* Email Detail - Fullscreen on mobile, panel on desktop */}
      {showDetail && detail && (
        <Box
          sx={{
            flex: isMobile ? 'none' : 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: isMobile ? 'fixed' : 'relative',
            top: isMobile ? 0 : 'auto',
            left: isMobile ? 0 : 'auto',
            right: isMobile ? 0 : 'auto',
            bottom: isMobile ? 0 : 'auto',
            width: isMobile ? '100%' : 'auto',
            height: isMobile ? '100%' : 'auto',
            zIndex: isMobile ? 1300 : 'auto',
            bgcolor: 'background.paper',
            // Smooth transitions for mobile slide-in effect
            transition: isMobile
              ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
            animation: isMobile ? 'slideInRight 0.3s ease-out' : 'none',
            '@keyframes slideInRight': {
              '0%': {
                transform: 'translateX(100%)',
              },
              '100%': {
                transform: 'translateX(0)',
              },
            },
          }}
        >
          {detail}
        </Box>
      )}
    </Box>
  );
};
