
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
} from '@mui/material';
import { useAuth } from '@/lib/hooks/use-auth';
import { usersApi } from '@/lib/api/users';

export function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await usersApi.updateProfile({ firstName, lastName });
      setUser(response.data);
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
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email"
            defaultValue={user.email}
            disabled
          />
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );
}
