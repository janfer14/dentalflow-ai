'use client';

import { useState } from 'react';
import { Pencil, Plus, Stethoscope } from 'lucide-react';
import { useTreatments } from '@/hooks/use-directory';
import type { Treatment } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TreatmentFormDialog } from './treatment-form-dialog';

function currency(value: string) {
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function TreatmentsPanel() {
  const { data: treatments, isLoading } = useTreatments();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Treatment | null>(null);

  return (
    <div className="glass-panel elevated rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Stethoscope className="h-4 w-4" />
          Tratamientos
        </h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Agregar tratamiento
        </Button>
      </div>

      {isLoading ? null : treatments && treatments.length > 0 ? (
        <ul className="space-y-2">
          {treatments.map((treatment) => (
            <li
              key={treatment.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{treatment.name}</p>
                <p className="text-xs text-muted-foreground">{treatment.durationMinutes} min</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                {currency(treatment.defaultPrice)}
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => setEditing(treatment)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sin tratamientos registrados.
        </p>
      )}

      {adding && <TreatmentFormDialog open={adding} onOpenChange={setAdding} />}
      {editing && (
        <TreatmentFormDialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
          treatment={editing}
        />
      )}
    </div>
  );
}
