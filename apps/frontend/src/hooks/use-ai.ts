import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AiConversation, AiParticipant, AiStatus } from '@/types/api';

export function useAiStatus() {
  return useQuery({
    queryKey: ['ai-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<AiStatus>('/ai/status');
      return data;
    },
  });
}

export function useAiConversations() {
  return useQuery({
    queryKey: ['ai-conversations'],
    queryFn: async () => {
      const { data } = await apiClient.get<AiConversation[]>('/ai/conversations');
      return data;
    },
  });
}

export function useAiConversation(id: string | undefined) {
  return useQuery({
    queryKey: ['ai-conversation', id],
    queryFn: async () => {
      const { data } = await apiClient.get<AiConversation>(`/ai/conversations/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { participant?: AiParticipant; patientId?: string }) => {
      const { data } = await apiClient.post<AiConversation>('/ai/conversations', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
}

export function useSendAiMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data } = await apiClient.post(`/ai/conversations/${conversationId}/messages`, {
        content,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });
}
