'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Pill, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreatePrescription } from '@/hooks/use-clinical-records';
import type { Prescription } from '@/types/api';
import type { CreatePrescriptionInput } from '@/hooks/use-clinical-records';

type DraftItem = CreatePrescriptionInput['items'][number];

export function PrescriptionsPanel({
  patientId,
  prescriptions,
}: {
  patientId: string;
  prescriptions: Prescription[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [draft, setDraft] = useState<DraftItem>({ medication: '', dosage: '', frequency: '' });
  const createPrescription = useCreatePrescription(patientId);

  const addItem = () => {
    if (!draft.medication || !draft.dosage || !draft.frequency) {
      toast.error('Completa medicamento, dosis y frecuencia');
      return;
    }
    setItems((prev) => [...prev, draft]);
    setDraft({ medication: '', dosage: '', frequency: '' });
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Agrega al menos un medicamento');
      return;
    }
    try {
      await createPrescription.mutateAsync({ items });
      toast.success('Receta generada');
      setItems([]);
      setDialogOpen(false);
    } catch {
      toast.error('No se pudo generar la receta');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Nueva receta
        </Button>
      </div>

      {prescriptions.length > 0 ? (
        <div className="space-y-3">
          {prescriptions.map((prescription) => (
            <div key={prescription.id} className="glass-panel rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Dr(a). {prescription.doctor.firstName} {prescription.doctor.lastName}
                </span>
                <span>
                  {new Date(prescription.createdAt).toLocaleDateString('es-MX', {
                    dateStyle: 'medium',
                  })}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {prescription.items.map((item) => (
                  <li key={item.id} className="text-sm">
                    <span className="font-medium">{item.medication}</span> — {item.dosage},{' '}
                    {item.frequency}
                    {item.durationDays ? ` por ${item.durationDays} días` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
          <Pill className="mb-2 h-6 w-6" />
          Sin recetas registradas.
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva receta</DialogTitle>
            <DialogDescription>Agrega uno o más medicamentos.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Medicamento"
                value={draft.medication}
                onChange={(e) => setDraft((p) => ({ ...p, medication: e.target.value }))}
              />
              <Input
                placeholder="Dosis"
                value={draft.dosage}
                onChange={(e) => setDraft((p) => ({ ...p, dosage: e.target.value }))}
              />
              <Input
                placeholder="Frecuencia"
                value={draft.frequency}
                onChange={(e) => setDraft((p) => ({ ...p, frequency: e.target.value }))}
              />
              <Input
                placeholder="Duración (días)"
                type="number"
                value={draft.durationDays ?? ''}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, durationDays: Number(e.target.value) || undefined }))
                }
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-2 h-3.5 w-3.5" />
              Agregar a la receta
            </Button>

            {items.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-border/50 p-2">
                {items.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between text-xs"
                  >
                    <span>
                      {item.medication} — {item.dosage}, {item.frequency}
                    </span>
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createPrescription.isPending}>
              {createPrescription.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar receta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
