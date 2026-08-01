'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateAppointment } from '@/hooks/use-appointments';
import { useClinics, useDoctors, useTreatments } from '@/hooks/use-directory';
import { usePatients } from '@/hooks/use-patients';
import { useClinic } from '@/contexts/clinic-context';

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: Date;
}

function toLocalInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  defaultDate,
}: AppointmentFormDialogProps) {
  const { data: clinics } = useClinics();
  const { data: doctors } = useDoctors();
  const { data: treatments } = useTreatments();
  const createAppointment = useCreateAppointment();
  const { selectedClinicId } = useClinic();

  const [patientSearch, setPatientSearch] = useState('');
  const { data: patientResults } = usePatients({ search: patientSearch, pageSize: 8 });

  const [form, setForm] = useState({
    clinicId: '',
    doctorId: '',
    patientId: '',
    treatmentId: '',
    startsAt: toLocalInputValue(defaultDate),
    durationMinutes: 30,
    notes: '',
  });

  useEffect(() => {
    if (selectedClinicId && !form.clinicId) {
      // One-time auto-fill from the globally selected clinic once it's
      // known — only while the field is still untouched, so this never
      // overrides a clinic the user already picked in the form.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((prev) => ({ ...prev, clinicId: selectedClinicId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClinicId]);

  const selectedTreatment = useMemo(
    () => treatments?.find((t) => t.id === form.treatmentId),
    [treatments, form.treatmentId],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.clinicId || !form.doctorId || !form.patientId) {
      toast.error('Selecciona clínica, doctor y paciente');
      return;
    }

    const startsAt = new Date(form.startsAt);
    const duration = selectedTreatment?.durationMinutes ?? form.durationMinutes;
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);

    try {
      await createAppointment.mutateAsync({
        clinicId: form.clinicId,
        doctorId: form.doctorId,
        patientId: form.patientId,
        treatmentId: form.treatmentId || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        notes: form.notes || undefined,
      });
      toast.success('Cita agendada correctamente');
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof AxiosError ? error.response?.data?.message : undefined;
      toast.error(
        Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo agendar la cita',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          <DialogDescription>Agenda una cita evitando dobles reservaciones.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Paciente</Label>
            <Input
              placeholder="Buscar paciente por nombre o teléfono..."
              value={patientSearch}
              onChange={(event) => setPatientSearch(event.target.value)}
            />
            {patientResults && patientResults.data.length > 0 && patientSearch && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border bg-popover shadow-sm">
                {patientResults.data.map((patient) => (
                  <button
                    type="button"
                    key={patient.id}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, patientId: patient.id }));
                      setPatientSearch(`${patient.firstName} ${patient.lastName}`);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                  >
                    <span>
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">{patient.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Clínica</Label>
              <Select
                value={form.clinicId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, clinicId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {clinics?.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select
                value={form.doctorId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, doctorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr(a). {doctor.firstName} {doctor.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tratamiento</Label>
            <Select
              value={form.treatmentId}
              onValueChange={(value) => setForm((prev) => ({ ...prev, treatmentId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Consulta general" />
              </SelectTrigger>
              <SelectContent>
                {treatments?.map((treatment) => (
                  <SelectItem key={treatment.id} value={treatment.id}>
                    {treatment.name} ({treatment.durationMinutes} min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startsAt">Fecha y hora</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas</Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Opcional"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createAppointment.isPending}>
              {createAppointment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Agendar cita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
