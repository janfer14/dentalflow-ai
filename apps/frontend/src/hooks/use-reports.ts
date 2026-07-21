import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ReportsOverview {
  range: { from: string; to: string };
  kpis: {
    totalRevenue: number;
    newPatients: number;
    totalAppointments: number;
    cancellationRate: number;
    noShowRate: number;
    totalBilled: number;
    totalPending: number;
  };
  revenueByDay: { date: string; total: number }[];
  revenueByDoctor: { doctorId: string; doctorName: string; total: number; count: number }[];
  topTreatments: { treatmentId: string; name: string; count: number; total: number }[];
  appointmentsByStatus: { status: string; count: number }[];
}

export function useReportsOverview(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: ['reports-overview', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ReportsOverview>('/reports/overview', { params });
      return data;
    },
  });
}
