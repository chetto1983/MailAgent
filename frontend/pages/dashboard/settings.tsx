import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Settings } from '@/components/dashboard/Settings';

export default function SettingsPage() {
  return (
    <Layout>
      <Settings />
    </Layout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
