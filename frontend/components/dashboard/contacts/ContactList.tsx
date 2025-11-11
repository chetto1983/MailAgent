import React, { useMemo } from 'react';
import {
  Avatar,
  Box,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { Star } from 'lucide-react';
import type { Contact } from '@/lib/api/contacts';
import type { AppTranslations } from '@/locales';

export interface ContactListProps {
  contacts: Contact[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  locale?: string;
  showingLabel?: string;
  copy: AppTranslations['dashboard']['contacts'];
}

const EMPTY_VALUE = '—';

const getInitials = (contact: Contact): string => {
  const fromDisplay = contact.displayName?.trim();
  if (fromDisplay) {
    const parts = fromDisplay.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0][0]?.toUpperCase() ?? '?';
  }

  const initials = [contact.firstName?.[0], contact.lastName?.[0]]
    .filter(Boolean)
    .map((char) => char!.toUpperCase());

  if (initials.length) {
    return initials.join('');
  }

  const email = contact.emails?.[0]?.value;
  return email ? email[0]!.toUpperCase() : '?';
};

const getPrimaryEmail = (contact: Contact): string => {
  const emails = contact.emails ?? [];
  const preferred = emails.find((email) => email.primary) ?? emails[0];
  return preferred?.value ?? EMPTY_VALUE;
};

const getPrimaryPhone = (contact: Contact): string => {
  const phones = contact.phoneNumbers ?? [];
  const preferred = phones.find((phone) => phone.primary) ?? phones[0];
  return preferred?.value ?? EMPTY_VALUE;
};

const formatName = (contact: Contact): string => {
  if (contact.displayName) {
    return contact.displayName;
  }
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  if (parts.length) {
    return parts.join(' ');
  }
  return getPrimaryEmail(contact);
};

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  locale,
  showingLabel,
  copy,
}) => {
  const dateFormatter = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale || undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }, [locale]);

  const handlePageChange = (_event: unknown, newPage: number) => {
    onPageChange(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onPageSizeChange(parseInt(event.target.value, 10));
  };

  return (
    <Paper sx={{ p: 0, overflow: 'hidden' }}>
      <Box sx={{ position: 'relative' }}>
        {loading && (
          <LinearProgress
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              zIndex: 1,
            }}
          />
        )}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{copy.list.tableHeaders.name}</TableCell>
                <TableCell>{copy.list.tableHeaders.email}</TableCell>
                <TableCell>{copy.list.tableHeaders.phone}</TableCell>
                <TableCell>{copy.list.tableHeaders.company}</TableCell>
                <TableCell>{copy.list.tableHeaders.provider}</TableCell>
                <TableCell>{copy.list.tableHeaders.lastSynced}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box
                      sx={{
                        py: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: 1,
                      }}
                    >
                      <Typography variant="h6">
                        {copy.list.emptyTitle}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {copy.list.emptyDescription}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          src={contact.photoUrl ?? undefined}
                          sx={{ width: 40, height: 40, fontSize: 14 }}
                        >
                          {getInitials(contact)}
                        </Avatar>
                        <Box>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography variant="subtitle2" component="div">
                              {formatName(contact)}
                            </Typography>
                            {(contact.isFavorite || contact.isStarred) && (
                              <Star size={14} color="#f5a623" fill="#f5a623" aria-label="favorite contact" />
                            )}
                          </Stack>
                          {contact.jobTitle && (
                            <Typography variant="body2" color="text.secondary">
                              {contact.jobTitle}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{getPrimaryEmail(contact)}</TableCell>
                    <TableCell>{getPrimaryPhone(contact)}</TableCell>
                    <TableCell>{contact.company || EMPTY_VALUE}</TableCell>
                    <TableCell>
                      {contact.provider?.displayName ||
                        contact.provider?.email ||
                        contact.providerId}
                    </TableCell>
                    <TableCell>
                      {contact.lastSyncedAt
                        ? dateFormatter.format(new Date(contact.lastSyncedAt))
                        : EMPTY_VALUE}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        sx={{ px: 2, py: 1 }}
        spacing={1}
      >
        <Typography variant="body2" color="text.secondary">
          {loading && contacts.length === 0
            ? copy.list.loading
            : showingLabel ?? ''}
        </Typography>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={pageSize}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} / ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      </Stack>
    </Paper>
  );
};

export default ContactList;
