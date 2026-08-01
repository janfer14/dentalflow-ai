import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface IntegrationsStatus {
  whatsapp: { configured: boolean; phoneNumberId: string | null; mode: 'live' | 'sandbox' };
  ai: { configured: boolean; model: string };
  google: { configured: boolean };
  microsoft: { configured: boolean };
}

export function useIntegrationsStatus() {
  return useQuery({
    queryKey: ['integrations-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<IntegrationsStatus>('/auth/integrations-status');
      return data;
    },
  });
}
