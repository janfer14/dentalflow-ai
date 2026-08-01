'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, UserRound } from 'lucide-react';
import {
  useOrgRoles,
  useTeamMembers,
  useUpdateTeamMember,
  type TeamMember,
} from '@/hooks/use-team-members';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InviteUserDialog } from './invite-user-dialog';

const STATUS_LABEL: Record<TeamMember['status'], string> = {
  ACTIVE: 'Activo',
  INVITED: 'Invitado',
  SUSPENDED: 'Suspendido',
  LOCKED: 'Bloqueado',
};

function TeamMemberRow({ member }: { member: TeamMember }) {
  const { data: roles } = useOrgRoles();
  const updateMember = useUpdateTeamMember();
  const currentRoleId = member.roles[0]?.role.id ?? '';

  const toggleActive = async (checked: boolean) => {
    try {
      await updateMember.mutateAsync({
        id: member.id,
        status: checked ? 'ACTIVE' : 'SUSPENDED',
      });
      toast.success(checked ? 'Usuario activado' : 'Usuario desactivado');
    } catch {
      toast.error('No se pudo actualizar el estado');
    }
  };

  const changeRole = async (roleId: string) => {
    try {
      await updateMember.mutateAsync({ id: member.id, roleId });
      toast.success('Rol actualizado');
    } catch {
      toast.error('No se pudo actualizar el rol');
    }
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {member.firstName} {member.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={currentRoleId} onValueChange={changeRole}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            {roles?.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="text-[10px]">
          {STATUS_LABEL[member.status]}
        </Badge>

        <Switch
          checked={member.status === 'ACTIVE'}
          onCheckedChange={toggleActive}
          disabled={updateMember.isPending}
        />
      </div>
    </li>
  );
}

export function TeamMembersPanel() {
  const { data: members, isLoading } = useTeamMembers();
  const [inviting, setInviting] = useState(false);

  return (
    <div className="glass-panel elevated rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <UserRound className="h-4 w-4" />
          Usuarios
        </h2>
        <Button size="sm" onClick={() => setInviting(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Invitar
        </Button>
      </div>

      {isLoading ? null : members && members.length > 0 ? (
        <ul className="space-y-2">
          {members.map((member) => (
            <TeamMemberRow key={member.id} member={member} />
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin usuarios registrados.
        </p>
      )}

      {inviting && <InviteUserDialog open={inviting} onOpenChange={setInviting} />}
    </div>
  );
}
