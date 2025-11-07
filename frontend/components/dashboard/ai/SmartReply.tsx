import { useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography, Alert } from '@mui/material';
import { aiApi } from '@/lib/api/ai';

interface SmartReplyProps {
  emailId: string;
  locale: string;
  disabled?: boolean;
  t: {
    smartRepliesTitle: string;
    smartRepliesGenerate: string;
    smartRepliesRegenerate: string;
    smartRepliesLoading: string;
    smartRepliesEmpty: string;
  };
  onSelect: (reply: string) => void;
}

const normalizeReply = (value: string): string =>
  value
    .replace(/```/g, '')
    .replace(/^"+|"+$/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

export function SmartReply({ emailId, locale, disabled, t, onSelect }: SmartReplyProps) {
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleApply = (reply: string) => {
    onSelect(reply);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setReplies([]);
    setHasGenerated(true);
    try {
      const { data } = await aiApi.generateSmartReplies(emailId, locale);
      const normalized = Array.isArray(data?.suggestions)
        ? data.suggestions.map((item: string) => normalizeReply(item)).filter(Boolean)
        : [];
      setReplies(normalized);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message?: string }).message
          : 'Unable to fetch smart replies';
      setError(message ?? 'Unable to fetch smart replies');
    } finally {
      setLoading(false);
    }
  };

  const showPlaceholder = !hasGenerated && !loading;

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

      <Button
        size="small"
        variant="outlined"
        onClick={handleGenerate}
        disabled={loading}
        startIcon={loading ? <CircularProgress size={14} /> : undefined}
        sx={{ mb: 1.5, alignSelf: 'flex-start' }}
      >
        {hasGenerated ? t.smartRepliesRegenerate : t.smartRepliesGenerate}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      {showPlaceholder ? (
        <Typography variant="body2" color="text.secondary">
          {t.smartRepliesEmpty}
        </Typography>
      ) : loading ? (
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
              title={reply}
              sx={{
                textTransform: 'none',
                justifyContent: 'flex-start',
                maxWidth: '100%',
                minHeight: 40,
                whiteSpace: 'normal',
              }}
            >
              <Typography
                variant="body2"
                sx={{ maxWidth: 260, textAlign: 'left' }}
                noWrap
              >
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
