import { useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography, Alert } from '@mui/material';
import { aiApi } from '@/lib/api/ai';

interface LabelSuggestionsProps {
  emailId: string;
  locale: string;
  t: {
    labelTitle: string;
    labelEmpty: string;
  };
}

export function LabelSuggestions({ emailId, locale, t }: LabelSuggestionsProps) {
  const [labels, setLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLabels([]);
    setError('');
    setLoading(true);

    aiApi
      .categorizeEmail(emailId, locale)
      .then(({ data }) => {
        if (!active) return;
        setLabels(data.labels);
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message?: string }).message
            : 'Unable to fetch label suggestions';
        setError(message ?? 'Unable to fetch label suggestions');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [emailId, locale]);

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        p: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {t.labelTitle}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            {t.labelEmpty}
          </Typography>
        </Stack>
      ) : labels.length ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {labels.map((label) => (
            <Chip
              key={label}
              label={label}
              variant="outlined"
              size="small"
              color="primary"
              sx={{ fontWeight: 600, letterSpacing: '0.08em' }}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t.labelEmpty}
        </Typography>
      )}
    </Box>
  );
}

export default LabelSuggestions;
