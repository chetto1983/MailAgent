
import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Box, Typography } from '@mui/material';
import { ProfileSettings } from '@/components/dashboard/ProfileSettings';

export default function ProfilePage() {
  return (
    <Layout>
      <Box>
        <Typography variant="h4" sx={{ mb: 4 }}>User Profile</Typography>
        <ProfileSettings />
      </Box>
    </Layout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
