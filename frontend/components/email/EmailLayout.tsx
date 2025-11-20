import React from 'react';
import { Box } from '@mui/material';

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
   * Custom height for the layout (default: 'calc(100vh - 64px)')
   */
  height?: string;
}

/**
 * EmailLayout - Main layout container for email interface
 *
 * Provides a 3-column layout:
 * - Sidebar (240px on desktop, full width on mobile)
 * - Email List (flex: 1)
 * - Email Detail (flex: 1, optional)
 *
 * @example
 * ```tsx
 * <EmailLayout
 *   sidebar={<EmailSidebar />}
 *   list={<EmailList />}
 *   detail={<EmailDetail email={selectedEmail} />}
 *   showDetail={!!selectedEmail}
 * />
 * ```
 */
export const EmailLayout: React.FC<EmailLayoutProps> = ({
  sidebar,
  list,
  detail,
  showDetail = false,
  height = 'calc(100vh - 64px)',
}) => {
  return (
    <Box
      sx={{
        height,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sidebar - hidden on mobile when detail is shown */}
      <Box
        sx={{
          width: { xs: '100%', sm: 240 },
          borderRight: { xs: 0, sm: 1 },
          borderColor: 'divider',
          display: showDetail ? { xs: 'none', sm: 'flex' } : { xs: 'flex', sm: 'flex' },
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {sidebar}
      </Box>

      {/* Email List - hidden on mobile when detail is shown */}
      <Box
        sx={{
          flex: 1,
          borderRight: { xs: 0, sm: 1 },
          borderColor: 'divider',
          display: showDetail ? { xs: 'none', sm: 'flex' } : { xs: 'flex', sm: 'flex' },
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {list}
      </Box>

      {/* Email Detail - fullscreen on mobile, side panel on desktop */}
      {showDetail && detail && (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: { xs: 'fixed', sm: 'relative' },
            top: { xs: 64, sm: 'auto' },
            left: { xs: 0, sm: 'auto' },
            right: { xs: 0, sm: 'auto' },
            bottom: { xs: 0, sm: 'auto' },
            zIndex: { xs: 1200, sm: 'auto' },
            bgcolor: 'background.paper',
          }}
        >
          {detail}
        </Box>
      )}
    </Box>
  );
};
