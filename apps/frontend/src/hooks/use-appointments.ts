import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Appointment, AppointmentStatus } from '@/types/api';

export interface ListAppointmentsParams {
  clinicId?: string;
  doctorId?: string;
  patientId?: string;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
}

export interface CreateAppointmentInput {
  clinicId: string;
  consultingRoomId?: string;
  patientId: string;
  doctorId: string;
  treatmentId?: string;
  startsAt: string;
  endsAt: string;
  notes?: string;
}

export function useAppointments(params: ListAppointmentsParams) {
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: async () => {
      const { data } = await apiClient.get<Appointment[]>('/appointments', { params });
      return data;
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAppointmentInput) => {
      const { data } = await apiClient.post<Appointment>('/appointments', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}

export function useUpdateAppointment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CreateAppointmentInput> & { status?: AppointmentStatus; cancelReason?: string }) => {
      const { data } = await apiClient.patch<Appointment>(`/appointments/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
