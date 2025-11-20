
import React from 'react';
import { PmSyncLayout } from '@/components/layout/PmSyncLayout';
import { Box, Typography } from '@mui/material';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';

export default function AnalyticsPage() {
  return (
    <PmSyncLayout>
      <Box>
        <Typography variant="h4" sx={{ mb: 4 }}>Analytics</Typography>
        <AnalyticsChart />
      </Box>
    </PmSyncLayout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
