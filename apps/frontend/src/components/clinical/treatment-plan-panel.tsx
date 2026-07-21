'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDoctors, useTreatments } from '@/hooks/use-directory';
import {
  useCreateTreatmentPlan,
  useUpdateTreatmentPlanItem,
} from '@/hooks/use-clinical-records';
import { cn } from '@/lib/utils';
import type { TreatmentPlan, TreatmentPlanItemStatus } from '@/types/api';

const STATUS_LABEL: Record<TreatmentPlanItemStatus, string> = {
  PROPOSED: 'Propuesto',
  ACCEPTED: 'Aceptado',
  IN_PROGRESS: 'En proceso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const STATUS_STYLE: Record<TreatmentPlanItemStatus, string> = {
  PROPOSED: 'bg-secondary text-secondary-foreground',
  ACCEPTED: 'bg-primary/10 text-primary',
  IN_PROGRESS: 'bg-warning/15 text-warning',
  COMPLETED: 'bg-success/15 text-success',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

const NEXT_STATUS: Partial<Record<TreatmentPlanItemStatus, TreatmentPlanItemStatus>> = {
  PROPOSED: 'ACCEPTED',
  ACCEPTED: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

export function TreatmentPlanPanel({
  patientId,
  plans,
}: {
  patientId: string;
  plans: TreatmentPlan[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: treatments } = useTreatments();
  const { data: doctors } = useDoctors();
  const createPlan = useCreateTreatmentPlan(patientId);
  const updateItem = useUpdateTreatmentPlanItem(patientId);

  const [title, setTitle] = useState('Plan de tratamiento');
  const [treatmentId, setTreatmentId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [toothNumber, setToothNumber] = useState('');

  const selectedTreatment = useMemo(
    () => treatments?.find((t) => t.id === treatmentId),
    [treatments, treatmentId],
  );

  const handleCreate = async () => {
    if (!treatmentId || !doctorId || !selectedTreatment) {
      toast.error('Selecciona tratamiento y doctor');
      return;
    }
    try {
      await createPlan.mutateAsync({
        title,
        items: [
          {
            treatmentId,
            doctorId,
            toothNumber: toothNumber ? Number(toothNumber) : undefined,
            cost: Number(selectedTreatment.defaultPrice) * 0.4,
            price: Number(selectedTreatment.defaultPrice),
          },
        ],
      });
      toast.success('Plan de tratamiento creado');
      setDialogOpen(false);
      setTreatmentId('');
      setDoctorId('');
      setToothNumber('');
    } catch {
      toast.error('No se pudo crear el plan');
    }
  };

  const advanceStatus = async (itemId: string, status: TreatmentPlanItemStatus) => {
    try {
      await updateItem.mutateAsync({ id: itemId, status });
    } catch {
      toast.error('No se pudo actualizar el estado');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Nuevo plan
        </Button>
      </div>

      {plans.length > 0 ? (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="glass-panel rounded-2xl p-4">
              <p className="text-sm font-semibold">{plan.title}</p>
              <div className="mt-3 space-y-2">
                {plan.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {item.treatment.name}
                        {item.toothNumber ? ` · Diente ${item.toothNumber}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dr(a). {item.doctor.firstName} {item.doctor.lastName} ·{' '}
                        {Number(item.price).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('border-none text-[10px]', STATUS_STYLE[item.status])}>
                        {STATUS_LABEL[item.status]}
                      </Badge>
                      {NEXT_STATUS[item.status] && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => advanceStatus(item.id, NEXT_STATUS[item.status]!)}
                          disabled={updateItem.isPending}
                        >
                          Marcar {STATUS_LABEL[NEXT_STATUS[item.status]!]}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
          <ClipboardList className="mb-2 h-6 w-6" />
          Este paciente no tiene planes de tratamiento.
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo plan de tratamiento</DialogTitle>
            <DialogDescription>Agrega un tratamiento propuesto para este paciente.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título del plan</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Tratamiento</Label>
              <Select value={treatmentId} onValueChange={setTreatmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tratamiento" />
                </SelectTrigger>
                <SelectContent>
                  {treatments?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} —{' '}
                      {Number(t.defaultPrice).toLocaleString('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      Dr(a). {d.firstName} {d.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Diente (opcional, notación FDI)</Label>
              <Input
                value={toothNumber}
                onChange={(event) => setToothNumber(event.target.value)}
                placeholder="16"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createPlan.isPending}>
              {createPlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
