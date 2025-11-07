import { useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography, Alert } from '@mui/material';
import { aiApi } from '@/lib/api/ai';

interface SmartReplyProps {
  emailId: string;
  locale: string;
  disabled?: boolean;
  t: {
    smartRepliesTitle: string;
    smartRepliesLoading: string;
    smartRepliesEmpty: string;
  };
  onSelect: (reply: string) => void;
}

export function SmartReply({ emailId, locale, disabled, t, onSelect }: SmartReplyProps) {
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setReplies([]);
    setError('');
    setLoading(true);

    aiApi
      .generateSmartReplies(emailId, locale)
      .then(({ data }) => {
        if (!active) return;
        setReplies(data.suggestions);
      })
      .catch((err) => {
        if (!active) return;
        const message =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message?: string }).message
            : 'Unable to fetch smart replies';
        setError(message ?? 'Unable to fetch smart replies');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [emailId, locale]);

  const handleApply = (reply: string) => {
    onSelect(reply);
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
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
        {t.smartRepliesTitle}
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
            {t.smartRepliesLoading}
          </Typography>
        </Stack>
      ) : replies.length ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
          {replies.map((reply, index) => (
            <Button
              key={index}
              variant="outlined"
              size="small"
              onClick={() => handleApply(reply)}
              disabled={disabled}
              sx={{ textTransform: 'none', justifyContent: 'flex-start', maxWidth: '100%' }}
            >
              <Typography variant="body2" sx={{ maxWidth: 240 }} noWrap>
                {reply}
              </Typography>
            </Button>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t.smartRepliesEmpty}
        </Typography>
      )}
    </Box>
  );
}

export default SmartReply;
