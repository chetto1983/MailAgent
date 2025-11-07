import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '@/lib/hooks/use-auth';

/**
 * Dashboard Index - Redirects to Email Page
 *
 * This page serves as the main dashboard entry point and automatically
 * redirects authenticated users to the email management page.
 */
export default function DashboardIndex() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect to email page
      router.replace('/dashboard/email');
    } else if (!isLoading && !user) {
      // Redirect to login if not authenticated
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={40} />
          </Box>
          <Typography variant="body1" color="text.primary">
            Loading...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={40} />
        </Box>
        <Typography variant="body1" color="text.primary">
          Redirecting to email...
        </Typography>
      </Box>
    </Box>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
