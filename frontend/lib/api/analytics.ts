
import { apiClient } from '../api-client';

export const analyticsApi = {
  getEmailAnalytics: () => {
    return apiClient.get('/analytics/emails');
  },
};
