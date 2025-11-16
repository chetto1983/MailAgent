import React, { createContext, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, User } from '@/stores/auth-store';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  token: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setStoreUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;

    if (!token) {
      const existingUser = useAuthStore.getState().user;
      if (existingUser) {
        setStoreUser(null);
      }
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);

    apiClient
      .get('/auth/me')
      .then((response) => {
        if (!isActive) {
          return;
        }

        const apiUser: User = {
          id: response.data.id ?? response.data.userId,
          email: response.data.email,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          role: response.data.role,
          tenantId: response.data.tenantId,
        };

        setStoreUser(apiUser);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }
        logout();
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [token, setStoreUser, logout]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      token,
    }),
    [user, isLoading, token],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
