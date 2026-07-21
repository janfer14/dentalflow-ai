'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portalApiClient } from '@/lib/portal-api-client';
import { clearPortalToken, getStoredPortalToken, storePortalToken } from '@/lib/portal-token-storage';
import type { AuthenticatedPatient } from '@/types/portal';

const PATIENT_STORAGE_KEY = 'dentalflow.portal.patient';

interface PortalAuthContextValue {
  patient: AuthenticatedPatient | null;
  isLoading: boolean;
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => void;
}

const PortalAuthContext = createContext<PortalAuthContextValue | undefined>(undefined);

export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<AuthenticatedPatient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getStoredPortalToken();
    const storedPatient = window.localStorage.getItem(PATIENT_STORAGE_KEY);
    if (token && storedPatient) {
      // One-time hydration of persisted portal session from localStorage,
      // which is only reachable client-side — can't be a lazy useState
      // initializer without causing an SSR/hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPatient(JSON.parse(storedPatient));
    }
    setIsLoading(false);
  }, []);

  const requestOtp = useCallback(async (phone: string) => {
    await portalApiClient.post('/portal/auth/request-otp', { phone });
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, code: string) => {
      const { data } = await portalApiClient.post<{
        accessToken: string;
        patient: AuthenticatedPatient;
      }>('/portal/auth/verify-otp', { phone, code });

      storePortalToken(data.accessToken);
      window.localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(data.patient));
      setPatient(data.patient);
      router.push('/portal/dashboard');
    },
    [router],
  );

  const logout = useCallback(() => {
    clearPortalToken();
    window.localStorage.removeItem(PATIENT_STORAGE_KEY);
    setPatient(null);
    router.push('/portal/login');
  }, [router]);

  const value = useMemo(
    () => ({ patient, isLoading, requestOtp, verifyOtp, logout }),
    [patient, isLoading, requestOtp, verifyOtp, logout],
  );

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth() {
  const ctx = useContext(PortalAuthContext);
  if (!ctx) throw new Error('usePortalAuth must be used within a PortalAuthProvider');
  return ctx;
}
