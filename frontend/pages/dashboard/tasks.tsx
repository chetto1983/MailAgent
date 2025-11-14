import React from 'react';
import { PmSyncLayout } from '@/components/layout/PmSyncLayout';
import { PmSyncTasks } from '@/components/dashboard/PmSyncTasks';

export default function TasksPage() {
  return (
    <PmSyncLayout>
      <PmSyncTasks />
    </PmSyncLayout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
