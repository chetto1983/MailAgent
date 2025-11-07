import React from 'react';
import type { AppProps } from 'next/app';
import { ThemeProvider as NextThemeProvider, useTheme } from 'next-themes';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider } from '@/lib/context/auth-context';
import { lightTheme, darkTheme } from '@/lib/theme/material-theme';
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

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MaterialThemeWrapper>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
      </MaterialThemeWrapper>
    </NextThemeProvider>
  );
}
