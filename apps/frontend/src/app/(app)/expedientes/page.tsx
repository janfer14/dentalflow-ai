'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Stethoscope } from 'lucide-react';
import { usePatients } from '@/hooks/use-patients';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExpedientesPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = usePatients({ search, page: 1, pageSize: 25 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Expediente clínico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecciona un paciente para ver su odontograma, notas, plan de tratamiento y recetas
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar paciente..."
          className="pl-9"
        />
      </div>

      <div className="glass-panel elevated overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-border/60">
            {data.data.map((patient) => (
              <li key={patient.id}>
                <Link
                  href={`/pacientes/${patient.id}?tab=expediente`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/40"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                      {patient.firstName[0]}
                      {patient.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {patient.firstName} {patient.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {patient.phone ?? 'Sin teléfono'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Stethoscope className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No se encontraron pacientes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
