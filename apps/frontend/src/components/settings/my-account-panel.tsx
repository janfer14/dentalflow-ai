'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { KeyRound, Loader2, Save, ShieldCheck, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useUpdateProfile } from '@/hooks/use-account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChangePasswordDialog } from './change-password-dialog';
import { TwoFactorSection } from './two-factor-section';

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

function ProfileForm() {
  const { user, refreshUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await updateProfile.mutateAsync(form);
      await refreshUser();
      toast.success('Perfil actualizado');
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo actualizar el perfil'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="account-firstName">Nombre</Label>
          <Input
            id="account-firstName"
            required
            value={form.firstName}
            onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="account-lastName">Apellido</Label>
          <Input
            id="account-lastName"
            required
            value={form.lastName}
            onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="account-email">Correo electrónico</Label>
        <Input id="account-email" value={user?.email ?? ''} disabled />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

export function MyAccountPanel() {
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="glass-panel elevated rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <UserCircle className="h-4 w-4" />
          Mi perfil
        </h2>
        <ProfileForm />
      </div>

      <div className="space-y-6">
        <div className="glass-panel elevated rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="h-4 w-4" />
              Contraseña
            </h2>
            <Button size="sm" variant="secondary" onClick={() => setChangingPassword(true)}>
              Cambiar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Cambia tu contraseña periódicamente para mantener tu cuenta segura.
          </p>
        </div>

        <div className="glass-panel elevated rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" />
            Doble factor de autenticación
          </h2>
          <TwoFactorSection />
        </div>
      </div>

      {changingPassword && (
        <ChangePasswordDialog open={changingPassword} onOpenChange={setChangingPassword} />
      )}
    </div>
  );
}
