'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useCreatePatient } from '@/hooks/use-patients';

export function PatientFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createPatient = useCreatePatient();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    birthDate: '',
  });

  const handleChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createPatient.mutateAsync({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        email: form.email || undefined,
        birthDate: form.birthDate || undefined,
      });
      toast.success('Paciente registrado correctamente');
      setForm({ firstName: '', lastName: '', phone: '', email: '', birthDate: '' });
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (Array.isArray(error.response?.data?.message)
              ? error.response?.data?.message.join(', ')
              : error.response?.data?.message)
          : undefined;
      toast.error(message ?? 'No se pudo registrar el paciente');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo paciente</DialogTitle>
          <DialogDescription>Registra la información básica del paciente.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">Nombre</Label>
              <Input id="firstName" required value={form.firstName} onChange={handleChange('firstName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" required value={form.lastName} onChange={handleChange('lastName')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Teléfono / WhatsApp</Label>
            <Input id="phone" value={form.phone} onChange={handleChange('phone')} placeholder="+52 55 0000 0000" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" type="email" value={form.email} onChange={handleChange('email')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birthDate">Fecha de nacimiento</Label>
            <Input id="birthDate" type="date" value={form.birthDate} onChange={handleChange('birthDate')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createPatient.isPending}>
              {createPatient.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar paciente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
