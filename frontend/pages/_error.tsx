import { NextPageContext } from 'next';
import Link from 'next/link';
import { Box, Typography, Button } from '@mui/material';

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  const title = statusCode === 404
    ? 'Page Not Found'
    : statusCode
    ? `Server Error ${statusCode}`
    : 'An error occurred';

  const message = statusCode === 404
    ? "Sorry, we couldn't find the page you're looking for."
    : 'Something went wrong on our end. Please try again later.';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
      }}
    >
      <Box sx={{ textAlign: 'center', maxWidth: '28rem' }}>
        <Typography variant="h1" sx={{ fontWeight: 'bold', color: 'white', mb: 1 }}>
          {statusCode || 'Error'}
        </Typography>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 600, color: '#d1d5db', mb: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ color: '#9ca3af', mb: 2 }}>
          {message}
        </Typography>
        <Button
          component={Link}
          href="/"
          variant="contained"
          sx={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Go Back Home
        </Button>
      </Box>
    </Box>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
