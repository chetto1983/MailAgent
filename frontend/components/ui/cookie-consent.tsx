import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Link,
  Collapse,
  Switch,
  FormControlLabel,
  Stack,
} from '@mui/material';
import { X, Cookie, ChevronDown, ChevronUp } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'mailagent:cookie-consent';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true, non-modifiable
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a slight delay for better UX
      setTimeout(() => setVisible(true), 1000);
    }
  }, []);

  const handleAcceptAll = () => {
    const fullConsent: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(fullConsent));
    setVisible(false);
  };

  const handleAcceptSelected = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences));
    setVisible(false);
  };

  const handleRejectAll = () => {
    const minimalConsent: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(minimalConsent));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        p: 2,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 600,
          width: '100%',
          p: 3,
          pointerEvents: 'auto',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Cookie size={24} style={{ flexShrink: 0, marginTop: 4 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Cookie Settings
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We use cookies to enhance your browsing experience, serve personalized content, and
              analyze our traffic. By clicking "Accept All", you consent to our use of cookies.{' '}
              <Link href="/privacy" underline="hover" sx={{ color: 'primary.main' }}>
                Privacy Policy
              </Link>
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: showDetails ? 2 : 0,
                cursor: 'pointer',
              }}
              onClick={() => setShowDetails(!showDetails)}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {showDetails ? 'Hide Details' : 'Customize Cookies'}
              </Typography>
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Box>

            <Collapse in={showDetails}>
              <Stack spacing={1.5} sx={{ my: 2, pl: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.necessary}
                      disabled
                      sx={{ '&.Mui-disabled': { opacity: 0.6 } }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Necessary Cookies
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Required for the website to function properly. Cannot be disabled.
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.analytics}
                      onChange={(e) =>
                        setPreferences({ ...preferences, analytics: e.target.checked })
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Analytics Cookies
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Help us understand how you use our website to improve your experience.
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferences.marketing}
                      onChange={(e) =>
                        setPreferences({ ...preferences, marketing: e.target.checked })
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Marketing Cookies
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Used to deliver relevant advertisements and track campaign performance.
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </Collapse>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {showDetails ? (
                <>
                  <Button variant="outlined" onClick={handleRejectAll} size="small">
                    Reject All
                  </Button>
                  <Button variant="outlined" onClick={handleAcceptSelected} size="small">
                    Save Preferences
                  </Button>
                  <Button variant="contained" onClick={handleAcceptAll} size="small">
                    Accept All
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outlined" onClick={handleRejectAll} size="small">
                    Reject All
                  </Button>
                  <Button variant="contained" onClick={handleAcceptAll} size="small">
                    Accept All
                  </Button>
                </>
              )}
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => setVisible(false)}
            sx={{ flexShrink: 0 }}
            aria-label="Close"
          >
            <X size={18} />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
}
