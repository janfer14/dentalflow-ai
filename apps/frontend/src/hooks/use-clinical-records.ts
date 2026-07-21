import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  ClinicalRecordSummary,
  TreatmentPlanItemStatus,
} from '@/types/api';

export function useClinicalRecord(patientId: string | undefined) {
  return useQuery({
    queryKey: ['clinical-record', patientId],
    queryFn: async () => {
      const { data } = await apiClient.get<ClinicalRecordSummary>(
        `/patients/${patientId}/clinical-record`,
      );
      return data;
    },
    enabled: Boolean(patientId),
  });
}

export function useAddClinicalNote(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { content: string; diagnosis?: string }) => {
      const { data } = await apiClient.post(
        `/patients/${patientId}/clinical-record/notes`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-record', patientId] });
    },
  });
}

export function useUpdateTooth(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      toothNumber,
      conditions,
      notes,
    }: {
      toothNumber: number;
      conditions: { surface: string; condition: string }[];
      notes?: string;
    }) => {
      const { data } = await apiClient.put(
        `/patients/${patientId}/clinical-record/odontogram/${toothNumber}`,
        { conditions, notes },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-record', patientId] });
    },
  });
}

export interface CreateTreatmentPlanInput {
  title: string;
  items: {
    treatmentId: string;
    doctorId: string;
    toothNumber?: number;
    cost: number;
    price: number;
  }[];
}

export function useCreateTreatmentPlan(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTreatmentPlanInput) => {
      const { data } = await apiClient.post(
        `/patients/${patientId}/clinical-record/treatment-plans`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-record', patientId] });
    },
  });
}

export function useUpdateTreatmentPlanItem(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TreatmentPlanItemStatus }) => {
      const { data } = await apiClient.patch(`/clinical-record/treatment-plan-items/${id}`, {
        status,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-record', patientId] });
    },
  });
}

export interface CreatePrescriptionInput {
  notes?: string;
  items: {
    medication: string;
    dosage: string;
    frequency: string;
    durationDays?: number;
    instructions?: string;
  }[];
}

export function useCreatePrescription(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePrescriptionInput) => {
      const { data } = await apiClient.post(
        `/patients/${patientId}/clinical-record/prescriptions`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-record', patientId] });
    },
  });
}
