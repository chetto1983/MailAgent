import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Check, Copy, Database, MessageSquare, RefreshCw, Search } from 'lucide-react';
import { aiApi, type MemorySearchItem } from '@/lib/api/ai';

interface MemorySearchCopy {
  memoryTitle: string;
  memoryDescription: string;
  memoryPlaceholder: string;
  memoryGenerate: string;
  memoryRegenerate: string;
  memoryLoading: string;
  memoryEmpty: string;
  memoryCopy: string;
  memoryCopied: string;
  memoryUse: string;
  memoryQueryRequired: string;
  memorySourceEmail: string;
  memorySourceDocument: string;
  memoryConfidenceLabel: string;
  memoryConfidenceHigh: string;
  memoryConfidenceMedium: string;
  memoryConfidenceLow: string;
  memoryUnknownSender: string;
  memoryLastQueryPrefix: string;
  memoryCopyError: string;
  memoryError: string;
}

interface MemorySearchProps {
  emailId?: string;
  locale: string;
  t: MemorySearchCopy;
  onSelectSnippet?: (text: string) => void;
}

const formatConfidenceLabel = (
  distance: number | null | undefined,
  t: MemorySearchCopy,
): string | null => {
  if (distance === null || distance === undefined) {
    return null;
  }

  if (distance < 0.35) {
    return t.memoryConfidenceHigh;
  }

  if (distance < 0.65) {
    return t.memoryConfidenceMedium;
  }

  return t.memoryConfidenceLow;
};

export function MemorySearch({ emailId, locale, t, onSelectSnippet }: MemorySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemorySearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canSearch = Boolean(emailId || query.trim().length >= 3);

  const buttonLabel = hasSearched ? t.memoryRegenerate : t.memoryGenerate;

  const lastQueryPreview = useMemo(() => {
    if (!lastQuery) {
      return '';
    }
    return lastQuery.length > 140 ? `${lastQuery.slice(0, 140)}…` : lastQuery;
  }, [lastQuery]);

  const handleSearch = async () => {
    const trimmedQuery = query.trim();
    if (!emailId && !trimmedQuery) {
      setError(t.memoryQueryRequired);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await aiApi.searchMemory({
        emailId,
        locale,
        query: trimmedQuery || undefined,
      });

      setResults(Array.isArray(data.items) ? data.items : []);
      setHasSearched(true);
      setLastQuery(data.usedQuery || trimmedQuery);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? (err as { message?: string }).message
          : null;
      setError(message || t.memoryError);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (item: MemorySearchItem) => {
    try {
      if (!navigator?.clipboard) {
        throw new Error('clipboard_unavailable');
      }
      await navigator.clipboard.writeText(item.snippet);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError(t.memoryCopyError);
    }
  };

  const handleUseSnippet = (item: MemorySearchItem) => {
    if (!onSelectSnippet) return;
    onSelectSnippet(item.snippet);
  };

  const renderResult = (item: MemorySearchItem) => {
    const formattedDate = item.receivedAt
      ? new Date(item.receivedAt).toLocaleString(locale, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : null;

    const sourceLabel =
      item.source === 'email'
        ? t.memorySourceEmail
        : item.source
        ? t.memorySourceDocument
        : null;

    const confidenceLabel = formatConfidenceLabel(item.distance, t);

    return (
      <Paper
        key={item.id}
        variant="outlined"
        sx={{ p: 1.5, borderRadius: 2, borderColor: 'divider' }}
      >
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {item.subject || t.memoryUnknownSender}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.from || t.memoryUnknownSender}
              {formattedDate ? ` • ${formattedDate}` : ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {sourceLabel && <Chip size="small" label={sourceLabel} variant="outlined" />}
            {confidenceLabel && (
              <Chip
                size="small"
                label={`${t.memoryConfidenceLabel}: ${confidenceLabel}`}
                variant="outlined"
              />
            )}
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1.5 }}>
          {item.snippet}
        </Typography>

        <Stack direction="row" spacing={1}>
          <Tooltip title={copiedId === item.id ? t.memoryCopied : t.memoryCopy}>
            <IconButton size="small" onClick={() => handleCopy(item)}>
              {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
            </IconButton>
          </Tooltip>
          {onSelectSnippet && (
            <Tooltip title={t.memoryUse}>
              <IconButton size="small" color="primary" onClick={() => handleUseSnippet(item)}>
                <MessageSquare size={14} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Paper>
    );
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Database size={16} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {t.memoryTitle}
          </Typography>
        </Stack>

        <Button
          size="small"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={14} /> : <RefreshCw size={14} />}
          disabled={!canSearch || loading}
          onClick={handleSearch}
        >
          {buttonLabel}
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1.5 }}>
        {t.memoryDescription}
      </Typography>

      <TextField
        fullWidth
        size="small"
        placeholder={t.memoryPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={14} />
            </InputAdornment>
          ),
        }}
      />

      {lastQueryPreview && hasSearched && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {t.memoryLastQueryPrefix} {lastQueryPreview}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            {t.memoryLoading}
          </Typography>
        </Stack>
      ) : results.length ? (
        <Stack spacing={1.5} sx={{ mt: 2 }}>
          {results.map((item) => renderResult(item))}
        </Stack>
      ) : hasSearched ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t.memoryEmpty}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t.memoryEmpty}
        </Typography>
      )}
    </Box>
  );
}

export default MemorySearch;
