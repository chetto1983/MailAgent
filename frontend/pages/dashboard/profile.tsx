
import React from 'react';
import { PmSyncLayout } from '@/components/layout/PmSyncLayout';
import { Box, Typography } from '@mui/material';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';

export default function ProfilePage() {
  return (
    <PmSyncLayout>
      <Box>
        <Typography variant="h4" sx={{ mb: 4 }}>User Profile</Typography>
        <ProfileSettings />
      </Box>
    </PmSyncLayout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
