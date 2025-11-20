
import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Paper, Typography, CircularProgress, Box } from '@mui/material';
import { analyticsApi } from '@/lib/api/analytics';

// TODO: npm install recharts

export function AnalyticsChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await analyticsApi.getEmailAnalytics();
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Paper sx={{ p: 4, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 4, height: 400 }}>
      <Typography variant="h6" gutterBottom>
        Email Analytics
      </Typography>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="sent" stroke="#8884d8" />
          <Line type="monotone" dataKey="received" stroke="#82ca9d" />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}
