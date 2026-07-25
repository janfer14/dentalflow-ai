'use client';

import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { useClinic } from '@/contexts/clinic-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ClinicSelector() {
  const { clinics, selectedClinic, setSelectedClinicId, isLoading } = useClinic();

  // Nothing to switch between — don't clutter the topbar with a selector
  // that has only one possible value.
  if (isLoading || clinics.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/60 px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[10rem] truncate">{selectedClinic?.name ?? 'Sucursal'}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Sucursal activa</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {clinics.map((clinic) => (
          <DropdownMenuItem key={clinic.id} onClick={() => setSelectedClinicId(clinic.id)}>
            <Check
              className={`mr-2 h-4 w-4 ${clinic.id === selectedClinic?.id ? 'opacity-100' : 'opacity-0'}`}
            />
            {clinic.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
