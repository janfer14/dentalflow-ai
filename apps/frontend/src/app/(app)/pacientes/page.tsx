'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Search, Users } from 'lucide-react';
import { usePatients } from '@/hooks/use-patients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PatientFormDialog } from '@/components/patients/patient-form-dialog';

export default function PacientesPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data, isLoading } = usePatients({ search, page: 1, pageSize: 25 });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      // One-time read of the entry query param, only reachable client-side —
      // not a derived-state sync the lint rule is meant to catch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDialogOpen(true);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data?.total ?? 0} pacientes registrados en tu clínica
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo paciente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, teléfono o correo..."
          className="pl-9"
        />
      </div>

      <div className="glass-panel elevated overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-border/60">
            {data.data.map((patient, index) => (
              <motion.li
                key={patient.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
              >
                <Link
                  href={`/pacientes/${patient.id}`}
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
                      {patient.phone ?? 'Sin teléfono'} {patient.email ? `· ${patient.email}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(patient.createdAt).toLocaleDateString('es-MX')}
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {search ? 'No se encontraron pacientes.' : 'Aún no hay pacientes registrados.'}
            </p>
          </div>
        )}
      </div>

      <PatientFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
