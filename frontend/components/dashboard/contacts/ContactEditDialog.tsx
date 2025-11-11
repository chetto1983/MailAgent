import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Contact, UpdateContactDto } from '@/lib/api/contacts';
import type { AppTranslations } from '@/locales';

interface FormState {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
}

interface ContactEditDialogProps {
  open: boolean;
  contact?: Contact | null;
  onClose: () => void;
  onSave: (payload: UpdateContactDto) => Promise<void>;
  copy: AppTranslations['dashboard']['contacts']['editDialog'];
  saving?: boolean;
}

const toFormState = (contact?: Contact | null): FormState => {
  const primaryEmail = contact?.emails?.find((email) => email.primary)?.value ?? contact?.emails?.[0]?.value ?? '';
  const primaryPhone =
    contact?.phoneNumbers?.find((phone) => phone.primary)?.value ?? contact?.phoneNumbers?.[0]?.value ?? '';

  return {
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    displayName: contact?.displayName ?? '',
    email: primaryEmail ?? '',
    phone: primaryPhone ?? '',
    company: contact?.company ?? '',
    jobTitle: contact?.jobTitle ?? '',
  };
};

export function ContactEditDialog({
  open,
  contact,
  onClose,
  onSave,
  copy,
  saving,
}: ContactEditDialogProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(contact));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      setForm(toFormState(contact));
    }
  }, [contact]);

  const isDirty = useMemo(() => {
    if (!contact) return false;
    const initial = toFormState(contact);
    return (
      initial.firstName !== form.firstName ||
      initial.lastName !== form.lastName ||
      initial.displayName !== form.displayName ||
      initial.email !== form.email ||
      initial.phone !== form.phone ||
      initial.company !== form.company ||
      initial.jobTitle !== form.jobTitle
    );
  }, [contact, form]);

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const buildPayload = (): UpdateContactDto => {
    const payload: UpdateContactDto = {
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      displayName: form.displayName.trim() || undefined,
      company: form.company.trim() || undefined,
      jobTitle: form.jobTitle.trim() || undefined,
    };

    const emailValue = form.email.trim();
    if (emailValue) {
      payload.emails = [
        {
          value: emailValue,
          type: 'work',
          primary: true,
        },
      ];
    }

    const phoneValue = form.phone.trim();
    if (phoneValue) {
      payload.phoneNumbers = [
        {
          value: phoneValue,
          type: 'work',
          primary: true,
        },
      ];
    }

    return payload;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contact) return;
    setError(null);
    try {
      await onSave(buildPayload());
    } catch (err: any) {
      setError(err?.message ?? copy.error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {copy.description}
        </Typography>
        <Box component="form" id="contact-edit-form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={copy.firstName}
                value={form.firstName}
                onChange={handleChange('firstName')}
              />
              <TextField
                fullWidth
                label={copy.lastName}
                value={form.lastName}
                onChange={handleChange('lastName')}
              />
            </Stack>
            <TextField
              fullWidth
              label={copy.displayName}
              value={form.displayName}
              onChange={handleChange('displayName')}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={copy.email}
                type="email"
                value={form.email}
                onChange={handleChange('email')}
              />
              <TextField
                fullWidth
                label={copy.phone}
                value={form.phone}
                onChange={handleChange('phone')}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label={copy.company}
                value={form.company}
                onChange={handleChange('company')}
              />
              <TextField
                fullWidth
                label={copy.jobTitle}
                value={form.jobTitle}
                onChange={handleChange('jobTitle')}
              />
            </Stack>
            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {copy.cancel}
        </Button>
        <Button
          type="submit"
          form="contact-edit-form"
          variant="contained"
          disabled={saving || !contact || !isDirty}
        >
          {copy.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ContactEditDialog;
