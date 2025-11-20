import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  Typography,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Home,
  Mail,
  Calendar,
  Users,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const DRAWER_WIDTH_EXPANDED = 240;
const DRAWER_WIDTH_COLLAPSED = 72;

interface NavigationItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
}

export interface PmSyncSidebarProps {
  open?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
  mobileOpen?: boolean;
}

export function Sidebar({
  open = true,
  collapsed = false,
  onToggleCollapse,
  onClose,
  mobileOpen = false,
}: PmSyncSidebarProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navigationItems: NavigationItem[] = [
    {
      label: 'Home',
      icon: <Home size={20} />,
      href: '/dashboard',
    },
    {
      label: 'Mail',
      icon: <Mail size={20} />,
      href: '/dashboard/email',
    },
    {
      label: 'Calendar',
      icon: <Calendar size={20} />,
      href: '/dashboard/calendar',
    },
    {
      label: 'Contacts',
      icon: <Users size={20} />,
      href: '/dashboard/contacts',
    },
  ];

  const isActive = (href: string) => {
    return router.pathname === href;
  };

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
      }}
    >
      {/* Logo and Brand */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 64,
        }}
      >
        {!collapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #0B7EFF 0%, #1E88E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.2rem' }}>
                M
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              MailAgent
            </Typography>
          </Box>
        )}
        {collapsed && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0B7EFF 0%, #1E88E5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '1.2rem' }}>
              M
            </Typography>
          </Box>
        )}
        {!isMobile && onToggleCollapse && (
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            sx={{
              display: collapsed ? 'none' : 'flex',
            }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Navigation Items */}
      <List sx={{ flex: 1, pt: 2, px: 1 }}>
        {navigationItems.map((item) => (
          <Tooltip
            key={item.href}
            title={collapsed ? item.label : ''}
            placement="right"
            arrow
          >
            <Link href={item.href} passHref legacyBehavior>
              <ListItemButton
                selected={isActive(item.href)}
                sx={{
                  mb: 0.5,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1.5 : 2,
                }}
                onClick={() => {
                  if (isMobile && onClose) {
                    onClose();
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: collapsed ? 'auto' : 40,
                    color: isActive(item.href) ? 'primary.contrastText' : 'text.secondary',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive(item.href) ? 600 : 500,
                    }}
                  />
                )}
              </ListItemButton>
            </Link>
          </Tooltip>
        ))}
      </List>

      {/* AI Assistant Button */}
      <Box sx={{ px: 1, pb: 2 }}>
        <Tooltip title={collapsed ? 'AI Assistant' : ''} placement="right" arrow>
          <Button
            fullWidth
            variant="contained"
            startIcon={!collapsed && <Sparkles size={18} />}
            sx={{
              mb: 1,
              justifyContent: collapsed ? 'center' : 'flex-start',
              minWidth: collapsed ? 48 : 'auto',
              px: collapsed ? 0 : 2,
            }}
            onClick={() => router.push('/dashboard/ai')}
          >
            {collapsed ? <Sparkles size={18} /> : 'AI Assistant'}
          </Button>
        </Tooltip>
      </Box>

      <Divider />

      {/* Settings */}
      <Box sx={{ p: 1 }}>
        <Tooltip title={collapsed ? 'Settings' : ''} placement="right" arrow>
          <Link href="/dashboard/settings" passHref legacyBehavior>
            <ListItemButton
              selected={isActive('/dashboard/settings')}
              sx={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1.5 : 2,
              }}
              onClick={() => {
                if (isMobile && onClose) {
                  onClose();
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 'auto' : 40,
                  color: isActive('/dashboard/settings')
                    ? 'primary.contrastText'
                    : 'text.secondary',
                }}
              >
                <Settings size={20} />
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary="Settings"
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isActive('/dashboard/settings') ? 600 : 500,
                  }}
                />
              )}
            </ListItemButton>
          </Link>
        </Tooltip>
      </Box>
    </Box>
  );

  // Mobile Drawer
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: DRAWER_WIDTH_EXPANDED,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop Drawer
  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        display: { xs: 'none', md: 'block' },
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
