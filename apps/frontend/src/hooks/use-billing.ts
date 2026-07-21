import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CashRegister, CashRegisterSession, Invoice, InvoiceStatus, PaymentMethod } from '@/types/api';

export function useInvoices(params: { patientId?: string; status?: InvoiceStatus } = {}) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: async () => {
      const { data } = await apiClient.get<Invoice[]>('/invoices', { params });
      return data;
    },
  });
}

export function useAccountsReceivable(patientId?: string) {
  return useQuery({
    queryKey: ['accounts-receivable', patientId],
    queryFn: async () => {
      const { data } = await apiClient.get<Invoice[]>('/accounts-receivable', {
        params: { patientId },
      });
      return data;
    },
  });
}

export interface CreateInvoiceInput {
  patientId: string;
  appointmentId?: string;
  taxRate?: number;
  items: { description: string; quantity: number; unitPrice: number; treatmentPlanItemId?: string }[];
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) => {
      const { data } = await apiClient.post<Invoice>('/invoices', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
    },
  });
}

export function useRegisterPayment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { method: PaymentMethod; amount: number; reference?: string; cashRegisterId?: string }) => {
      const { data } = await apiClient.post<Invoice>(`/invoices/${invoiceId}/payments`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounts-receivable'] });
    },
  });
}

export function useCashRegisters(clinicId?: string) {
  return useQuery({
    queryKey: ['cash-registers', clinicId],
    queryFn: async () => {
      const { data } = await apiClient.get<CashRegister[]>('/cash-registers', {
        params: { clinicId },
      });
      return data;
    },
  });
}

export function useCashRegisterSessions(cashRegisterId: string | undefined) {
  return useQuery({
    queryKey: ['cash-register-sessions', cashRegisterId],
    queryFn: async () => {
      const { data } = await apiClient.get<CashRegisterSession[]>(
        `/cash-registers/${cashRegisterId}/sessions`,
      );
      return data;
    },
    enabled: Boolean(cashRegisterId),
  });
}

export function useOpenCashSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { cashRegisterId: string; openingAmount: number }) => {
      const { data } = await apiClient.post('/cash-registers/sessions', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-sessions'] });
    },
  });
}

export function useCloseCashSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, closingAmount }: { sessionId: string; closingAmount: number }) => {
      const { data } = await apiClient.post(`/cash-registers/sessions/${sessionId}/close`, {
        closingAmount,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-register-sessions'] });
    },
  });
}
