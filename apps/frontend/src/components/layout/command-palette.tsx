'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  LayoutDashboard,
  Moon,
  Sun,
  Users,
  UserPlus,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { apiClient } from '@/lib/api-client';

interface PatientSearchResult {
  data: { id: string; firstName: string; lastName: string; phone: string | null }[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const handleOpenRequest = () => setOpen(true);

    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('dentalflow:open-command-palette', handleOpenRequest);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('dentalflow:open-command-palette', handleOpenRequest);
    };
  }, []);

  const { data } = useQuery({
    queryKey: ['command-palette-patients', search],
    queryFn: async () => {
      const { data } = await apiClient.get<PatientSearchResult>('/patients', {
        params: { search, pageSize: 5 },
      });
      return data.data;
    },
    enabled: open && search.length > 1,
  });

  const runCommand = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Búsqueda global" description="Busca pacientes, citas o navega por el sistema">
      <CommandInput
        placeholder="Buscar pacientes, citas, acciones..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        {data && data.length > 0 && (
          <CommandGroup heading="Pacientes">
            {data.map((patient) => (
              <CommandItem
                key={patient.id}
                onSelect={() => runCommand(() => router.push(`/pacientes/${patient.id}`))}
              >
                <Users className="mr-2 h-4 w-4" />
                {patient.firstName} {patient.lastName}
                {patient.phone && (
                  <span className="ml-auto text-xs text-muted-foreground">{patient.phone}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navegación">
          <CommandItem onSelect={() => runCommand(() => router.push('/dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Ir al Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/agenda'))}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Ir a la Agenda
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/pacientes'))}>
            <Users className="mr-2 h-4 w-4" />
            Ir a Pacientes
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/pacientes?new=1'))}>
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo paciente
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Apariencia">
          <CommandItem onSelect={() => runCommand(() => setTheme('light'))}>
            <Sun className="mr-2 h-4 w-4" />
            Tema claro
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('dark'))}>
            <Moon className="mr-2 h-4 w-4" />
            Tema oscuro
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
