import React from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { AuthProvider } from '@/lib/context/auth-context';
import { lightTheme, darkTheme } from '@/lib/theme/material-theme';
import { useAuth } from '@/lib/hooks/use-auth';
import '@/styles/globals.css';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

/**
 * Material UI Theme Wrapper
 * Syncs next-themes with Material UI theme
 */
function MaterialThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme, systemTheme } = useTheme();

  // Determine effective theme (respect system preference)
  // Default to 'light' during SSR to avoid undefined theme errors
  const effectiveTheme = theme === 'system' ? systemTheme : theme;
  const muiTheme = effectiveTheme === 'dark' ? darkTheme : lightTheme;

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
}

function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const requiresAuth = router.pathname.startsWith('/dashboard');

  React.useEffect(() => {
    if (!requiresAuth) {
      return;
    }

    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      const next = router.asPath && router.asPath !== '/auth/login' ? router.asPath : undefined;
      router.replace({
        pathname: '/auth/login',
        query: next ? { next } : undefined,
      });
    }
  }, [requiresAuth, isAuthenticated, isLoading, router]);

  if (requiresAuth && (!isAuthenticated || isLoading)) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={40} />
          </Box>
          <Typography variant="body1" color="text.primary">
            {isAuthenticated ? 'Loading dashboard...' : 'Redirecting to login...'}
          </Typography>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MaterialThemeWrapper>
        <AuthProvider>
          <RouteGuard>
            <Component {...pageProps} />
          </RouteGuard>
        </AuthProvider>
      </MaterialThemeWrapper>
    </NextThemeProvider>
  );
}
