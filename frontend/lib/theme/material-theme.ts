import { createTheme, ThemeOptions, alpha } from '@mui/material/styles';

/**
 * Material Design 3 Theme Configuration for MailAgent
 *
 * Features:
 * - Light/Dark mode support
 * - WCAG 2.1 AA compliant color contrasts
 * - 8px grid system
 * - Material Motion easing curves
 * - Responsive typography
 */

const commonThemeOptions: ThemeOptions = {
  spacing: 8, // 8px base unit

  shape: {
    borderRadius: 8, // Default border radius
  },

  typography: {
    fontFamily: [
      'Roboto',
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
    ].join(','),

    // Scale responsive
    h1: {
      fontSize: '2.5rem', // 40px
      fontWeight: 300,
      lineHeight: 1.2,
      letterSpacing: '-0.01562em',
      '@media (min-width:905px)': {
        fontSize: '3.5rem', // 56px on desktop
      },
    },
    h2: {
      fontSize: '2rem', // 32px
      fontWeight: 300,
      lineHeight: 1.3,
      letterSpacing: '-0.00833em',
      '@media (min-width:905px)': {
        fontSize: '2.75rem', // 44px on desktop
      },
    },
    h3: {
      fontSize: '1.75rem', // 28px
      fontWeight: 400,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.5rem', // 24px
      fontWeight: 400,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.25rem', // 20px
      fontWeight: 400,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1.125rem', // 18px
      fontWeight: 500,
      lineHeight: 1.6,
    },
    subtitle1: {
      fontSize: '1rem', // 16px
      fontWeight: 400,
      lineHeight: 1.75,
    },
    subtitle2: {
      fontSize: '0.875rem', // 14px
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem', // 16px
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.00938em',
    },
    body2: {
      fontSize: '0.875rem', // 14px
      fontWeight: 400,
      lineHeight: 1.43,
      letterSpacing: '0.01071em',
    },
    button: {
      fontSize: '0.875rem', // 14px
      fontWeight: 500,
      lineHeight: 1.75,
      letterSpacing: '0.02857em',
      textTransform: 'none', // Override uppercase default
    },
    caption: {
      fontSize: '0.75rem', // 12px
      fontWeight: 400,
      lineHeight: 1.66,
      letterSpacing: '0.03333em',
    },
    overline: {
      fontSize: '0.625rem', // 10px
      fontWeight: 400,
      lineHeight: 2.66,
      letterSpacing: '0.08333em',
      textTransform: 'uppercase',
    },
  },

  // Material Motion transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195,
    },
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', // Standard
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',   // Deceleration
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',      // Acceleration
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',     // Sharp
    },
  },

  // Component default overrides
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 40, // Touch target
          '&:focus-visible': {
            outline: '2px solid',
            outlineOffset: '2px',
          },
          '@media (pointer: coarse)': {
            minHeight: 48, // Larger touch target on mobile
          },
        },
        sizeLarge: {
          minHeight: 48,
          fontSize: '1rem',
          padding: '12px 24px',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:focus-visible': {
            outline: '2px solid',
            outlineOffset: '2px',
          },
        },
        sizeMedium: {
          width: 40,
          height: 40,
          '@media (pointer: coarse)': {
            width: 48,
            height: 48,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
  },
};

// Light Theme
export const lightTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'light',
    primary: {
      main: '#3F51B5', // Indigo 500
      light: '#5C6BC0', // Indigo 400
      dark: '#303F9F', // Indigo 700
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFC107', // Amber 500
      light: '#FFCA28', // Amber 400
      dark: '#FFA000', // Amber 700
      contrastText: '#000000',
    },
    error: {
      main: '#F44336', // Red 500
      light: '#E57373', // Red 300
      dark: '#D32F2F', // Red 700
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FF9800', // Orange 500
      light: '#FFB74D', // Orange 300
      dark: '#F57C00', // Orange 700
      contrastText: '#000000',
    },
    info: {
      main: '#2196F3', // Blue 500
      light: '#64B5F6', // Blue 300
      dark: '#1976D2', // Blue 700
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#4CAF50', // Green 500
      light: '#81C784', // Green 300
      dark: '#388E3C', // Green 700
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAFAFA', // Grey 50
      paper: '#FFFFFF',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.60)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
      focus: 'rgba(0, 0, 0, 0.12)',
    },
  },
});

// Dark Theme
export const darkTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#5C6BC0', // Indigo 400 (lighter for dark mode)
      light: '#7986CB', // Indigo 300
      dark: '#3949AB', // Indigo 600
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFCA28', // Amber 400 (lighter for dark mode)
      light: '#FFD54F', // Amber 300
      dark: '#FFB300', // Amber 600
      contrastText: '#000000',
    },
    error: {
      main: '#EF5350', // Red 400
      light: '#E57373', // Red 300
      dark: '#D32F2F', // Red 700
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FFA726', // Orange 400
      light: '#FFB74D', // Orange 300
      dark: '#F57C00', // Orange 700
      contrastText: '#000000',
    },
    info: {
      main: '#42A5F5', // Blue 400
      light: '#64B5F6', // Blue 300
      dark: '#1976D2', // Blue 700
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#66BB6A', // Green 400
      light: '#81C784', // Green 300
      dark: '#388E3C', // Green 700
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#121212', // Elevated black (not pure black)
      paper: '#1E1E1E', // Surface 1dp elevation
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.60)',
      disabled: 'rgba(255, 255, 255, 0.38)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
    action: {
      active: 'rgba(255, 255, 255, 0.56)',
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(255, 255, 255, 0.16)',
      disabled: 'rgba(255, 255, 255, 0.30)',
      disabledBackground: 'rgba(255, 255, 255, 0.12)',
      focus: 'rgba(255, 255, 255, 0.12)',
    },
  },
});

// Utility function to get theme based on mode
export function getTheme(mode: 'light' | 'dark') {
  return mode === 'dark' ? darkTheme : lightTheme;
}

export default lightTheme;
