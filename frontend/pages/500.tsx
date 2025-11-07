import Link from 'next/link';

export default function Custom500() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #0f172a, #1e293b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
        <h1 style={{ fontSize: '3.75rem', fontWeight: 'bold', color: 'white', marginBottom: '1rem' }}>500</h1>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#d1d5db', marginBottom: '1rem' }}>Server Error</h2>
        <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>
          Something went wrong on our end. Please try again later.
        </p>
        <Link href="/" style={{ display: 'inline-block', padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.5rem', textDecoration: 'none', fontWeight: '500' }}>
          Go Back Home
        </Link>
      </div>
    </div>
  );
}

