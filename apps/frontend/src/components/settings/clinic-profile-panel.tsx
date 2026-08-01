'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Loader2, Save } from 'lucide-react';
import { useClinic } from '@/contexts/clinic-context';
import { useClinicProfile, useUpdateClinicProfile, type ClinicProfile } from '@/hooks/use-clinic-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

function ClinicProfileForm({ profile }: { profile: ClinicProfile }) {
  const updateClinic = useUpdateClinicProfile(profile.id);
  const [form, setForm] = useState({
    name: profile.name,
    address: profile.address ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
  });

  const handleChange =
    (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await updateClinic.mutateAsync({
        name: form.name,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      toast.success('Perfil de la clínica actualizado');
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo actualizar la clínica'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="clinic-name">Nombre</Label>
        <Input id="clinic-name" required value={form.name} onChange={handleChange('name')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="clinic-address">Dirección</Label>
        <Input id="clinic-address" value={form.address} onChange={handleChange('address')} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="clinic-city">Ciudad</Label>
          <Input id="clinic-city" value={form.city} onChange={handleChange('city')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clinic-state">Estado</Label>
          <Input id="clinic-state" value={form.state} onChange={handleChange('state')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="clinic-phone">Teléfono</Label>
          <Input id="clinic-phone" value={form.phone} onChange={handleChange('phone')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clinic-email">Correo electrónico</Label>
          <Input id="clinic-email" type="email" value={form.email} onChange={handleChange('email')} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateClinic.isPending}>
          {updateClinic.isPending ? (
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

export function ClinicProfilePanel() {
  const { selectedClinicId } = useClinic();
  const { data: profile, isLoading } = useClinicProfile(selectedClinicId);

  if (isLoading) {
    return (
      <div className="glass-panel elevated max-w-xl space-y-4 rounded-2xl p-6">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Selecciona una sucursal para editar su perfil.
      </p>
    );
  }

  return (
    <div className="glass-panel elevated max-w-xl rounded-2xl p-6">
      <ClinicProfileForm key={profile.id} profile={profile} />
    </div>
  );
}
