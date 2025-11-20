import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Mailbox } from '@/components/dashboard/Mailbox';

/**
 * Email Page
 *
 * Modular email interface with:
 * - EmailLayout, EmailSidebar, EmailList, EmailDetail components
 * - Centralized email-store (Zustand)
 * - Custom hooks (use-email-actions, use-keyboard-navigation)
 * - Performance optimized with memoization
 */
export default function EmailPage() {
  return (
    <Layout>
      <Mailbox />
    </Layout>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
