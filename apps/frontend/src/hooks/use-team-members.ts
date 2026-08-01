import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'LOCKED';

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isDoctor: boolean;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  roles: { role: { id: string; name: string } }[];
}

export interface OrgRole {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateTeamMemberInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  isDoctor?: boolean;
  roleId: string;
  clinicId: string;
}

export interface CreateTeamMemberResponse {
  user: { id: string; firstName: string; lastName: string; email: string };
  temporaryPassword: string;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data } = await apiClient.get<TeamMember[]>('/users');
      return data;
    },
  });
}

export function useOrgRoles() {
  return useQuery({
    queryKey: ['org-roles'],
    queryFn: async () => {
      const { data } = await apiClient.get<OrgRole[]>('/roles');
      return data;
    },
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateTeamMemberInput) => {
      const { data } = await apiClient.post<CreateTeamMemberResponse>('/users', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string; roleId?: string; isDoctor?: boolean; status?: UserStatus }) => {
      const { data } = await apiClient.patch<TeamMember>(`/users/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}
