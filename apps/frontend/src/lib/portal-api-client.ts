import axios, { AxiosError } from 'axios';
import { clearPortalToken, getStoredPortalToken } from './portal-token-storage';

export const portalApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1',
});

portalApiClient.interceptors.request.use((config) => {
  const token = getStoredPortalToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const isAuthEndpoint = error.config?.url?.includes('/portal/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      clearPortalToken();
      if (typeof window !== 'undefined' && window.location.pathname !== '/portal/login') {
        window.location.href = '/portal/login';
      }
    }
    return Promise.reject(error);
  },
);
