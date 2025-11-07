import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography, Alert } from '@mui/material';
import { aiApi } from '@/lib/api/ai';

interface EmailSummaryProps {
  emailId: string;
  locale: string;
  t: {
    summaryTitle: string;
    summaryGenerate: string;
    summaryRegenerate: string;
    summaryEmpty: string;
  };
}

export function EmailSummary({ emailId, locale, t }: EmailSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSummary(null);
    setError('');
  }, [emailId]);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await aiApi.summarizeEmail(emailId, locale);
      setSummary(data.summary);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message?: string }).message
          : 'Unable to generate summary';
      setError(message ?? 'Unable to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        p: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t.summaryTitle}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={handleGenerate}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : undefined}
        >
          {summary ? t.summaryRegenerate : t.summaryGenerate}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: summary ? 1.5 : 0 }}>
          {error}
        </Alert>
      )}

      {summary ? (
        <Typography variant="body2" color="text.secondary">
          {summary}
        </Typography>
      ) : !loading ? (
        <Typography variant="body2" color="text.secondary">
          {t.summaryEmpty}
        </Typography>
      ) : null}
    </Box>
  );
}

export default EmailSummary;
