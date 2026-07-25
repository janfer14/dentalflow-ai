'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useClinics, type Clinic } from '@/hooks/use-directory';
import { useAuth } from '@/contexts/auth-context';

const SELECTED_CLINIC_STORAGE_KEY = 'dentalflow.selectedClinicId';

interface ClinicContextValue {
  clinics: Clinic[];
  selectedClinicId: string | null;
  selectedClinic: Clinic | null;
  setSelectedClinicId: (clinicId: string) => void;
  isLoading: boolean;
}

const ClinicContext = createContext<ClinicContextValue | undefined>(undefined);

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: clinics, isLoading } = useClinics(!!user);
  const [selectedClinicId, setSelectedClinicIdState] = useState<string | null>(null);

  useEffect(() => {
    if (!clinics || clinics.length === 0) return;

    const stored = window.localStorage.getItem(SELECTED_CLINIC_STORAGE_KEY);
    const validStored = stored && clinics.some((c) => c.id === stored) ? stored : null;
    // Falls back to the first clinic when nothing is stored yet, or when the
    // stored id no longer matches one of the user's clinics (e.g. it was
    // selected in a different organization/session).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedClinicIdState(validStored ?? clinics[0].id);
  }, [clinics]);

  const setSelectedClinicId = useCallback((clinicId: string) => {
    window.localStorage.setItem(SELECTED_CLINIC_STORAGE_KEY, clinicId);
    setSelectedClinicIdState(clinicId);
  }, []);

  const selectedClinic = useMemo(
    () => clinics?.find((c) => c.id === selectedClinicId) ?? null,
    [clinics, selectedClinicId],
  );

  const value = useMemo(
    () => ({
      clinics: clinics ?? [],
      selectedClinicId,
      selectedClinic,
      setSelectedClinicId,
      isLoading,
    }),
    [clinics, selectedClinicId, selectedClinic, setSelectedClinicId, isLoading],
  );

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
}

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic debe usarse dentro de un ClinicProvider');
  }
  return context;
}
