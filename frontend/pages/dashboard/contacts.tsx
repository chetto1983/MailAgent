import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Contacts } from '@/components/dashboard/Contacts';

export default function ContactsPage() {
  return (
    <Layout>
      <Contacts />
    </Layout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
