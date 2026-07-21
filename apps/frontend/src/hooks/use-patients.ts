import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, Patient } from '@/types/api';

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  gender?: Patient['gender'];
  phone?: string;
  email?: string;
  birthDate?: string;
  address?: string;
  insuranceProvider?: string;
  allergies?: string;
  medications?: string;
  notes?: string;
}

export function usePatients(params: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Patient>>('/patients', { params });
      return data;
    },
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      const { data } = await apiClient.get<Patient>(`/patients/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      const { data } = await apiClient.post<Patient>('/patients', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreatePatientInput>) => {
      const { data } = await apiClient.patch<Patient>(`/patients/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
