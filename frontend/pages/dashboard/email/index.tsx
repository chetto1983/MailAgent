import React from 'react';
import { PmSyncLayout } from '@/components/layout/PmSyncLayout';
import { PmSyncMailbox } from '@/components/dashboard/PmSyncMailbox';

/**
 * Email Page - New PmSync Design
 */
export default function EmailPage() {
  return (
    <PmSyncLayout>
      <PmSyncMailbox />
    </PmSyncLayout>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
