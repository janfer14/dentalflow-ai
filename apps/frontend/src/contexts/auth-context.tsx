'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { clearTokens, getStoredTokens, storeTokens } from '@/lib/token-storage';
import type { AuthenticatedUser, LoginResponse } from '@/types/auth';

const USER_STORAGE_KEY = 'dentalflow.user';

interface AuthContextValue {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<void>;
  completeOAuthLogin: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const tokens = getStoredTokens();
    const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
    if (tokens && storedUser) {
      // One-time hydration of persisted auth state from localStorage, which
      // is only reachable client-side — can't be a lazy useState initializer
      // without causing an SSR/hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string, twoFactorCode?: string) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
        twoFactorCode,
      });
      storeTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      setUser(data.user);
      router.push('/dashboard');
    },
    [router],
  );

  const completeOAuthLogin = useCallback(
    async (accessToken: string, refreshToken: string) => {
      storeTokens({ accessToken, refreshToken });
      const { data } = await apiClient.get<AuthenticatedUser>('/auth/me');
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
      setUser(data);
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(async () => {
    const tokens = getStoredTokens();
    try {
      if (tokens?.refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken: tokens.refreshToken });
      }
    } catch {
      // ignore network errors on logout
    } finally {
      clearTokens();
      window.localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const value = useMemo(
    () => ({ user, isLoading, login, completeOAuthLogin, logout }),
    [user, isLoading, login, completeOAuthLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
