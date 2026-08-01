import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ClinicProfile {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
}

export interface UpdateClinicInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
}

export function useClinicProfile(clinicId: string | null) {
  return useQuery({
    queryKey: ['clinic-profile', clinicId],
    queryFn: async () => {
      const { data } = await apiClient.get<ClinicProfile[]>('/clinics');
      return data.find((clinic) => clinic.id === clinicId) ?? null;
    },
    enabled: Boolean(clinicId),
  });
}

export function useUpdateClinicProfile(clinicId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateClinicInput) => {
      const { data } = await apiClient.patch<ClinicProfile>(
        `/clinics/${clinicId}`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-profile', clinicId] });
      queryClient.invalidateQueries({ queryKey: ['clinics'] });
    },
  });
}
