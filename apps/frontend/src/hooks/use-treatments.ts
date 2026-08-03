import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Treatment } from '@/types/api';

export interface CreateTreatmentInput {
  name: string;
  defaultPrice: number;
  defaultCost?: number;
  durationMinutes?: number;
}

export interface UpdateTreatmentInput {
  id: string;
  name?: string;
  defaultPrice?: number;
  defaultCost?: number;
  durationMinutes?: number;
  isActive?: boolean;
}

export function useCreateTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTreatmentInput) => {
      const { data } = await apiClient.post<Treatment>('/treatments', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
    },
  });
}

export function useUpdateTreatment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTreatmentInput) => {
      const { data } = await apiClient.patch<Treatment>(`/treatments/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
    },
  });
}
