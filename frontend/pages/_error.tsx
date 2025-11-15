import { NextPageContext } from 'next';
import Link from 'next/link';

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #0f172a, #1e293b)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
        <h1 style={{
          fontSize: '3.75rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '1rem'
        }}>
          {statusCode || 'Error'}
        </h1>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#d1d5db',
          marginBottom: '1rem'
        }}>
          {title}
        </h2>
        <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
          {message}
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
