
import { apiClient } from '../api-client';

export const usersApi = {
  updateProfile: (data: { firstName?: string; lastName?: string }) => {
    return apiClient.put('/users/me', data);
  },
};
