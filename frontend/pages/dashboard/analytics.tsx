
import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Box, Typography } from '@mui/material';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';

export default function AnalyticsPage() {
  return (
    <Layout>
      <Box>
        <Typography variant="h4" sx={{ mb: 4 }}>Analytics</Typography>
        <AnalyticsChart />
      </Box>
    </Layout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
