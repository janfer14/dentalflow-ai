import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await apiClient.patch('/auth/me', input);
      return data;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      await apiClient.post('/auth/change-password', input);
    },
  });
}

export function useDisableTwoFactor() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string }) => {
      await apiClient.post('/auth/2fa/disable', input);
    },
  });
}

export function useGenerateTwoFactor() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ secret: string; qrDataUrl: string }>(
        '/auth/2fa/generate',
      );
      return data;
    },
  });
}

export function useEnableTwoFactor() {
  return useMutation({
    mutationFn: async (code: string) => {
      await apiClient.post('/auth/2fa/enable', { code });
    },
  });
}
