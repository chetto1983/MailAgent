import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null,
  user: null,

  setToken: (token: string) => {
    localStorage.setItem('auth_token', token);
    set({ token });
  },

  setUser: (user: User | null) => {
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({ token: null, user: null });
  },
}));
