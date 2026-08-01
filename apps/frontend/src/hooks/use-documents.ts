import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type DocumentType = 'xray' | 'photo' | 'id' | 'other';

export interface PatientDocument {
  id: string;
  patientId: string;
  type: DocumentType;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface Consent {
  id: string;
  patientId: string;
  title: string;
  documentUrl: string;
  signedAt: string | null;
  createdAt: string;
}

export function usePatientDocuments(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: async () => {
      const { data } = await apiClient.get<PatientDocument[]>(
        `/patients/${patientId}/documents`,
      );
      return data;
    },
    enabled: Boolean(patientId),
  });
}

export function useUploadPatientDocument(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, type }: { file: File; type: DocumentType }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      const { data } = await apiClient.post<PatientDocument>(
        `/patients/${patientId}/documents`,
        formData,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] });
    },
  });
}

export function useDeletePatientDocument(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      await apiClient.delete(`/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-documents', patientId] });
    },
  });
}

export function usePatientConsents(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient-consents', patientId],
    queryFn: async () => {
      const { data } = await apiClient.get<Consent[]>(`/patients/${patientId}/consents`);
      return data;
    },
    enabled: Boolean(patientId),
  });
}

export function useUploadPatientConsent(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      const { data } = await apiClient.post<Consent>(
        `/patients/${patientId}/consents`,
        formData,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-consents', patientId] });
    },
  });
}

export function useDeletePatientConsent(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (consentId: string) => {
      await apiClient.delete(`/consents/${consentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-consents', patientId] });
    },
  });
}
