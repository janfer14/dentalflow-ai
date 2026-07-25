import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DoctorSummary, Treatment } from '@/types/api';

export interface Clinic {
  id: string;
  name: string;
  consultingRooms: { id: string; name: string }[];
}

export function useClinics(enabled = true) {
  return useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const { data } = await apiClient.get<Clinic[]>('/clinics');
      return data;
    },
    enabled,
  });
}

export function useDoctors() {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data } = await apiClient.get<DoctorSummary[]>('/doctors');
      return data;
    },
  });
}

export function useTreatments() {
  return useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const { data } = await apiClient.get<Treatment[]>('/treatments');
      return data;
    },
  });
}
