'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import { useCreateTreatment, useUpdateTreatment } from '@/hooks/use-treatments';
import type { Treatment } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

export function TreatmentFormDialog({
  open,
  onOpenChange,
  treatment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treatment?: Treatment;
}) {
  const createTreatment = useCreateTreatment();
  const updateTreatment = useUpdateTreatment();
  const isEditing = Boolean(treatment);
  const [form, setForm] = useState({
    name: treatment?.name ?? '',
    defaultPrice: treatment?.defaultPrice ?? '',
    durationMinutes: String(treatment?.durationMinutes ?? 30),
  });

  const isPending = createTreatment.isPending || updateTreatment.isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (treatment) {
        await updateTreatment.mutateAsync({
          id: treatment.id,
          name: form.name,
          defaultPrice: Number(form.defaultPrice),
          durationMinutes: Number(form.durationMinutes),
        });
        toast.success('Tratamiento actualizado');
      } else {
        await createTreatment.mutateAsync({
          name: form.name,
          defaultPrice: Number(form.defaultPrice),
          durationMinutes: Number(form.durationMinutes),
        });
        toast.success('Tratamiento agregado');
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo guardar el tratamiento'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar tratamiento' : 'Nuevo tratamiento'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Ajusta el precio o los datos de este tratamiento.'
              : 'El precio es el que se usará por defecto al agendar o facturar.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="treatment-name">Nombre</Label>
            <Input
              id="treatment-name"
              required
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="treatment-price">Precio (MXN)</Label>
              <Input
                id="treatment-price"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.defaultPrice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, defaultPrice: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="treatment-duration">Duración (min)</Label>
              <Input
                id="treatment-duration"
                type="number"
                min="1"
                required
                value={form.durationMinutes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
