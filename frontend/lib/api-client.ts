import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const apiBaseURL = process.env.NEXT_PUBLIC_API_URL;

if (!apiBaseURL) {
  throw new Error('NEXT_PUBLIC_API_URL is not configured. Please set it in the frontend environment.');
}

export const apiClient = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout();
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  },
);
