import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Product, StockMovement, StockMovementType } from '@/types/api';

export function useProducts(clinicId?: string) {
  return useQuery({
    queryKey: ['products', clinicId],
    queryFn: async () => {
      const { data } = await apiClient.get<Product[]>('/products', { params: { clinicId } });
      return data;
    },
  });
}

export interface CreateProductInput {
  sku: string;
  name: string;
  category?: string;
  unit?: string;
  minStock?: number;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const { data } = await apiClient.post<Product>('/products', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useAdjustStock(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { clinicId: string; type: StockMovementType; quantity: number; reason?: string }) => {
      const { data } = await apiClient.post(`/products/${productId}/stock-movements`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements', productId] });
    },
  });
}

export function useStockMovements(productId: string | undefined) {
  return useQuery({
    queryKey: ['stock-movements', productId],
    queryFn: async () => {
      const { data } = await apiClient.get<StockMovement[]>(
        `/products/${productId}/stock-movements`,
      );
      return data;
    },
    enabled: Boolean(productId),
  });
}
