import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { WhatsAppMessage, WhatsAppStatus, WhatsAppTemplate } from '@/types/api';

export function useWhatsAppStatus() {
  return useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<WhatsAppStatus>('/whatsapp/status');
      return data;
    },
  });
}

export function useWhatsAppTemplates() {
  return useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data } = await apiClient.get<WhatsAppTemplate[]>('/whatsapp/templates');
      return data;
    },
  });
}

export function useUpdateWhatsAppTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, body }: { key: string; body: string }) => {
      const { data } = await apiClient.patch<WhatsAppTemplate>(`/whatsapp/templates/${key}`, {
        body,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
    },
  });
}

export function usePatientMessages(patientId: string | undefined) {
  return useQuery({
    queryKey: ['whatsapp-messages', patientId],
    queryFn: async () => {
      const { data } = await apiClient.get<WhatsAppMessage[]>(`/whatsapp/messages/${patientId}`);
      return data;
    },
    enabled: Boolean(patientId),
    refetchInterval: 15_000,
  });
}

export function useSendWhatsAppMessage(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await apiClient.post<WhatsAppMessage>(`/whatsapp/messages/${patientId}`, {
        body,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', patientId] });
    },
  });
}
