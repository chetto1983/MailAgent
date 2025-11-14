import React from 'react';
import { PmSyncLayout } from '@/components/layout/PmSyncLayout';
import { PmSyncCalendar } from '@/components/dashboard/PmSyncCalendar';

/**
 * Calendar Page - New PmSync Design
 *
 * Modern calendar interface with monthly grid view
 */
export default function CalendarPage() {
  return (
    <PmSyncLayout>
      <PmSyncCalendar />
    </PmSyncLayout>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
