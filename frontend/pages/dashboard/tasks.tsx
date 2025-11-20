import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Tasks } from '@/components/dashboard/Tasks';

export default function TasksPage() {
  return (
    <Layout>
      <Tasks />
    </Layout>
  );
}

export const getServerSideProps = async () => {
  return { props: {} };
};
