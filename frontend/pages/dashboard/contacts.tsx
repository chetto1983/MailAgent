import React from 'react';
import { PmSyncLayout } from '@/components/layout/PmSyncLayout';
import { PmSyncContacts } from '@/components/dashboard/PmSyncContacts';

export default function ContactsPage() {
  return (
    <PmSyncLayout>
      <PmSyncContacts />
    </PmSyncLayout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
