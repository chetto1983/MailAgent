import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/router';
import {
  Alert,
  Box,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  //Typography,
  Button as MuiButton,
} from '@mui/material';
import { RefreshCw, Filter, Users as UsersIcon } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/lib/hooks/use-auth';
import { useTranslations } from '@/lib/hooks/use-translations';
import { useLocale } from '@/lib/hooks/use-locale';
import {
  contactsApi,
  type Contact,
} from '@/lib/api/contacts';
import {
  providersApi,
  type ProviderConfig,
} from '@/lib/api/providers';
import { ContactList } from '@/components/dashboard/contacts/ContactList';

type StatusMessage = {
  type: 'success' | 'error';
  text: string;
};

export default function ContactsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const translations = useTranslations();
  const copy = translations.dashboard.contacts;
  const locale = useLocale();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [providerFilter, setProviderFilter] = useState<'all' | string>('all');

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [reloadToken, setReloadToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [authLoading, user, router]);

  const providerOptions = useMemo(() => {
    if (providers.length === 0) {
      return [];
    }

    const providerIdsWithContacts = new Set(contacts.map((contact) => contact.providerId));

    return providers.filter((provider) => provider.supportsContacts || providerIdsWithContacts.has(provider.id));
  }, [providers, contacts]);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }
    let isMounted = true;
    providersApi
      .getProviders()
      .then((response) => {
        if (!isMounted) return;
        setProviders(response);
      })
      .catch((err) => {
        console.error('Failed to load providers', err);
      });

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  const loadContacts = useCallback(async () => {
    if (authLoading || !user) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await contactsApi.listContacts({
        providerId: providerFilter === 'all' ? undefined : providerFilter,
        search: searchQuery || undefined,
        company: companyFilter || undefined,
        limit: pageSize,
        offset: page * pageSize,
      });
      setContacts(response.contacts);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to load contacts', err);
      setError(copy.alerts.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    authLoading,
    user,
    providerFilter,
    searchQuery,
    companyFilter,
    page,
    pageSize,
    copy.alerts.loadError,
  ]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts, reloadToken]);

  const handleApplyFilters = (event?: React.FormEvent) => {
    event?.preventDefault();
    setSearchQuery(searchInput.trim());
    setCompanyFilter(companyInput.trim());
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setCompanyInput('');
    setSearchQuery('');
    setCompanyFilter('');
    setProviderFilter('all');
    setPage(0);
  };

  const handleProviderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProviderFilter(event.target.value);
    setPage(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadToken((value) => value + 1);
  };

  const handleSync = async () => {
    if (providerFilter === 'all') {
      return;
    }
    setSyncing(true);
    setStatusMessage(null);
    try {
      await contactsApi.syncProvider(providerFilter);
      setStatusMessage({
        type: 'success',
        text: copy.alerts.syncSuccess,
      });
      handleRefresh();
    } catch (err) {
      console.error('Failed to sync contacts', err);
      setStatusMessage({
        type: 'error',
        text: copy.alerts.syncError,
      });
    } finally {
      setSyncing(false);
    }
  };

  const showingLabel = useMemo(() => {
    if (total === 0) {
      return copy.list.showing
        .replace('{count}', '0')
        .replace('{total}', '0');
    }
    const start = page * pageSize;
    const end = Math.min(total, start + contacts.length);
    return copy.list.showing
      .replace('{count}', end.toString())
      .replace('{total}', total.toString());
  }, [copy.list.showing, total, page, pageSize, contacts.length]);

  const headerActions = (
    <Stack direction="row" spacing={1}>
      <MuiButton
        variant="outlined"
        startIcon={<RefreshCw size={16} />}
        onClick={handleRefresh}
        disabled={loading || refreshing}
      >
        {copy.refresh}
      </MuiButton>
      <Tooltip
        title={
          providerFilter === 'all' ? copy.syncDisabledTooltip : ''
        }
        disableHoverListener={providerFilter !== 'all'}
      >
        <span>
          <MuiButton
            variant="contained"
            startIcon={<UsersIcon size={16} />}
            onClick={handleSync}
            disabled={providerFilter === 'all' || syncing}
          >
            {syncing ? copy.syncing : copy.sync}
          </MuiButton>
        </span>
      </Tooltip>
    </Stack>
  );

  return (
    <DashboardLayout
      title={copy.title}
      description={copy.description}
      actions={headerActions}
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Box
              component="form"
              onSubmit={handleApplyFilters}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems="flex-start"
              >
                <TextField
                  fullWidth
                  label={copy.searchPlaceholder}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <TextField
                  fullWidth
                  label={copy.companyPlaceholder}
                  value={companyInput}
                  onChange={(event) => setCompanyInput(event.target.value)}
                />
                <TextField
                  select
                  label={copy.providerFilterLabel}
                  value={providerFilter}
                  onChange={handleProviderChange}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="all">
                    {copy.allProvidersLabel}
                  </MenuItem>
                  {providerOptions.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.displayName || provider.email}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 2 }}
              >
                <MuiButton
                  type="submit"
                  variant="contained"
                  startIcon={<Filter size={16} />}
                >
                  {copy.applyFilters}
                </MuiButton>
                <MuiButton
                  type="button"
                  variant="text"
                  onClick={handleClearFilters}
                >
                  {copy.clearFilters}
                </MuiButton>
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Stack spacing={2}>
            {error && (
              <Alert
                severity="error"
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
            {statusMessage && (
              <Alert
                severity={statusMessage.type}
                onClose={() => setStatusMessage(null)}
              >
                {statusMessage.text}
              </Alert>
            )}
            <ContactList
              contacts={contacts}
              loading={loading}
              total={total}
              page={page}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              locale={locale}
              showingLabel={showingLabel}
              copy={copy}
            />
          </Stack>
        </Grid>
      </Grid>
    </DashboardLayout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
