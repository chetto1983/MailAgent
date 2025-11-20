import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { Calendar } from '@/components/dashboard/Calendar';

/**
 * Calendar Page
 *
 * Modern calendar interface with monthly grid view
 */
export default function CalendarPage() {
  return (
    <Layout>
      <Calendar />
    </Layout>
  );
}

// Force SSR to avoid NextRouter SSR errors
export const getServerSideProps = async () => {
  return { props: {} };
};
