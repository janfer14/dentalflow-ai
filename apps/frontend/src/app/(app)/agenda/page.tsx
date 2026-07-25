'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppointments } from '@/hooks/use-appointments';
import { useDoctors } from '@/hooks/use-directory';
import { useClinic } from '@/contexts/clinic-context';
import { Button } from '@/components/ui/button';
import { AppointmentFormDialog } from '@/components/agenda/appointment-form-dialog';
import { AgendaTimeline } from '@/components/agenda/agenda-timeline';

function startOfDayISO(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayISO(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);

  const { selectedClinicId } = useClinic();
  const { data: appointments, isLoading } = useAppointments({
    clinicId: selectedClinicId ?? undefined,
    from: startOfDayISO(selectedDate),
    to: endOfDayISO(selectedDate),
  });
  const { data: doctors, isLoading: isLoadingDoctors } = useDoctors();

  const shiftDate = (days: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 lg:h-[calc(100vh-8.5rem)]">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona las citas de tu clínica sin dobles reservaciones
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva cita
        </Button>
      </div>

      <div className="glass-panel flex shrink-0 items-center justify-between rounded-2xl p-3">
        <Button variant="ghost" size="icon" onClick={() => shiftDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold capitalize">
            {selectedDate.toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-xs text-primary hover:underline"
            >
              Ir a hoy
            </button>
          )}
        </div>

        <Button variant="ghost" size="icon" onClick={() => shiftDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <AgendaTimeline
        doctors={doctors ?? []}
        appointments={appointments ?? []}
        isLoading={isLoading || isLoadingDoctors}
        isToday={isToday}
      />

      <AppointmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedDate}
      />
    </div>
  );
}
