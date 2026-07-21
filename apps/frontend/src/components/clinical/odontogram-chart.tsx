'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateTooth } from '@/hooks/use-clinical-records';
import { cn } from '@/lib/utils';
import type { OdontogramTooth } from '@/types/api';

const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const CONDITIONS = [
  { value: 'sano', label: 'Sano' },
  { value: 'caries', label: 'Caries' },
  { value: 'restauracion', label: 'Restauración' },
  { value: 'corona', label: 'Corona' },
  { value: 'endodoncia', label: 'Endodoncia' },
  { value: 'extraccion', label: 'Extracción / ausente' },
  { value: 'implante', label: 'Implante' },
];

const SURFACES = [
  { value: 'oclusal', label: 'Oclusal' },
  { value: 'mesial', label: 'Mesial' },
  { value: 'distal', label: 'Distal' },
  { value: 'vestibular', label: 'Vestibular' },
  { value: 'lingual', label: 'Lingual / palatino' },
];

const CONDITION_STYLES: Record<string, string> = {
  caries: 'bg-destructive/15 border-destructive text-destructive',
  restauracion: 'bg-primary/15 border-primary text-primary',
  corona: 'bg-warning/15 border-warning text-warning',
  endodoncia: 'bg-accent border-accent-foreground/40 text-accent-foreground',
  extraccion: 'bg-muted border-muted-foreground/30 text-muted-foreground line-through',
  implante: 'bg-success/15 border-success text-success',
};

function latestCondition(tooth: OdontogramTooth | undefined) {
  if (!tooth || tooth.conditions.length === 0) return null;
  return tooth.conditions[tooth.conditions.length - 1];
}

export function OdontogramChart({
  patientId,
  teeth,
}: {
  patientId: string;
  teeth: OdontogramTooth[];
}) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [surface, setSurface] = useState('oclusal');
  const [condition, setCondition] = useState('sano');
  const updateTooth = useUpdateTooth(patientId);

  const teethByNumber = new Map(teeth.map((t) => [t.toothNumber, t]));

  const openTooth = (toothNumber: number) => {
    setSelectedTooth(toothNumber);
    const existing = latestCondition(teethByNumber.get(toothNumber));
    setSurface(existing?.surface ?? 'oclusal');
    setCondition(existing?.condition ?? 'sano');
  };

  const handleSave = async () => {
    if (selectedTooth === null) return;
    try {
      await updateTooth.mutateAsync({
        toothNumber: selectedTooth,
        conditions: [{ surface, condition }],
      });
      toast.success(`Diente ${selectedTooth} actualizado`);
      setSelectedTooth(null);
    } catch {
      toast.error('No se pudo actualizar el diente');
    }
  };

  const renderRow = (row: number[]) => (
    <div className="flex flex-wrap justify-center gap-1.5">
      {row.map((toothNumber) => {
        const tooth = teethByNumber.get(toothNumber);
        const cond = latestCondition(tooth);
        const style = cond ? CONDITION_STYLES[cond.condition] : undefined;
        return (
          <button
            key={toothNumber}
            onClick={() => openTooth(toothNumber)}
            className={cn(
              'flex h-10 w-10 flex-col items-center justify-center rounded-lg border text-[10px] font-medium transition-colors hover:border-primary',
              style ?? 'border-border bg-background text-muted-foreground',
            )}
          >
            <span className="text-xs font-semibold">{toothNumber}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-5">
        <div className="space-y-3">
          {renderRow(UPPER_ROW)}
          <div className="mx-auto h-px w-2/3 bg-border" />
          {renderRow(LOWER_ROW)}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3 text-[11px] text-muted-foreground">
          {CONDITIONS.filter((c) => c.value !== 'sano').map((c) => (
            <div key={c.value} className="flex items-center gap-1.5">
              <span className={cn('h-3 w-3 rounded border', CONDITION_STYLES[c.value])} />
              {c.label}
            </div>
          ))}
        </div>
      </div>

      <Dialog open={selectedTooth !== null} onOpenChange={(open) => !open && setSelectedTooth(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Diente {selectedTooth}</DialogTitle>
            <DialogDescription>Registra la condición y superficie afectada.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Condición</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Superficie</Label>
              <Select value={surface} onValueChange={setSurface}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SURFACES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedTooth(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateTooth.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
