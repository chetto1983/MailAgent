import React from 'react';
import { PmSyncLayout } from '@/components/layout/PmSyncLayout';
import { PmSyncMailboxRefactored } from '@/components/dashboard/PmSyncMailboxRefactored';

/**
 * Email Page - Refactored PmSync Design
 *
 * Now uses modular architecture:
 * - EmailLayout, EmailSidebar, EmailList, EmailDetail components
 * - Centralized email-store (Zustand)
 * - Custom hooks (use-email-actions, use-keyboard-navigation)
 * - Performance optimized with memoization
 */
export default function EmailPage() {
  return (
    <PmSyncLayout>
      <PmSyncMailboxRefactored />
    </PmSyncLayout>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
