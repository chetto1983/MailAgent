
import React, { useState } from 'react';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Stack,
  Box,
} from '@mui/material';
import { useAuth } from '@/lib/hooks/use-auth';
import { usersApi } from '@/lib/api/users';

export function ProfileSettings() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await usersApi.updateProfile({ firstName, lastName });
      // TODO: Add success/error feedback using translations
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h6" gutterBottom>
        Profile Settings
      </Typography>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <TextField
            fullWidth
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Stack>
        <TextField
          fullWidth
          label="Email"
          defaultValue={user.email}
          disabled
        />
        <Box>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
