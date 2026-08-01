'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useClinic } from '@/contexts/clinic-context';
import {
  useCreateTeamMember,
  useOrgRoles,
  type CreateTeamMemberResponse,
} from '@/hooks/use-team-members';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  isDoctor: false,
  roleId: '',
};

export function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { selectedClinicId } = useClinic();
  const { data: roles } = useOrgRoles();
  const createUser = useCreateTeamMember();
  const [form, setForm] = useState(EMPTY_FORM);
  const [result, setResult] = useState<CreateTeamMemberResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleChange =
    (field: 'firstName' | 'lastName' | 'email' | 'phone') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setResult(null);
    setCopied(false);
    onOpenChange(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClinicId || !form.roleId) {
      toast.error('Selecciona una sucursal y un rol');
      return;
    }
    try {
      const response = await createUser.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        isDoctor: form.isDoctor,
        roleId: form.roleId,
        clinicId: selectedClinicId,
      });
      setResult(response);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo invitar al usuario'));
    }
  };

  const copyPassword = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.temporaryPassword);
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-md">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Usuario creado</DialogTitle>
              <DialogDescription>
                Comparte esta contraseña temporal con {result.user.firstName} — no se
                volverá a mostrar.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/60 px-3 py-2">
              <code className="flex-1 text-sm">{result.temporaryPassword}</code>
              <Button type="button" variant="ghost" size="icon" onClick={copyPassword}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleClose}>
                Listo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invitar usuario</DialogTitle>
              <DialogDescription>
                Se genera una contraseña temporal — compártela manualmente, no se
                envía por correo.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-firstName">Nombre</Label>
                  <Input
                    id="invite-firstName"
                    required
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-lastName">Apellido</Label>
                  <Input
                    id="invite-lastName"
                    required
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Correo electrónico</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange('email')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-phone">Teléfono</Label>
                <Input id="invite-phone" value={form.phone} onChange={handleChange('phone')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Rol</Label>
                <Select value={form.roleId} onValueChange={(value) => setForm((prev) => ({ ...prev, roleId: value }))}>
                  <SelectTrigger id="invite-role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
                <Label htmlFor="invite-isDoctor" className="cursor-pointer">
                  Es doctor(a)
                </Label>
                <Switch
                  id="invite-isDoctor"
                  checked={form.isDoctor}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isDoctor: checked }))}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Invitar
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
