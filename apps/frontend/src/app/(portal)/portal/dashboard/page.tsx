'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { CalendarClock, LogOut, MapPin, Receipt, User2, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePortalAuth } from '@/contexts/portal-auth-context';
import { portalApiClient } from '@/lib/portal-api-client';
import type { AppointmentStatus, PortalAppointment, PortalInvoice } from '@/types/portal';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Programada',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'En espera',
  IN_PROGRESS: 'En consulta',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  RESCHEDULED: 'Reagendada',
};

const STATUS_VARIANT: Record<AppointmentStatus, string> = {
  SCHEDULED: 'bg-secondary text-secondary-foreground',
  CONFIRMED: 'bg-primary/10 text-primary',
  CHECKED_IN: 'bg-warning/15 text-warning',
  IN_PROGRESS: 'bg-primary/15 text-primary',
  COMPLETED: 'bg-success/15 text-success',
  CANCELLED: 'bg-destructive/10 text-destructive',
  NO_SHOW: 'bg-destructive/10 text-destructive',
  RESCHEDULED: 'bg-secondary text-secondary-foreground',
};

const CANCELLABLE: AppointmentStatus[] = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'];

function formatMoney(value: string) {
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PortalDashboardPage() {
  const { patient, isLoading, logout } = usePortalAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [appointmentToCancel, setAppointmentToCancel] = useState<PortalAppointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!isLoading && !patient) {
      router.replace('/portal/login');
    }
  }, [isLoading, patient, router]);

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery({
    queryKey: ['portal', 'appointments'],
    queryFn: async () => {
      const { data } = await portalApiClient.get<PortalAppointment[]>('/portal/appointments');
      return data;
    },
    enabled: !!patient,
  });

  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: async () => {
      const { data } = await portalApiClient.get<PortalInvoice[]>('/portal/invoices');
      return data;
    },
    enabled: !!patient,
  });

  const handleCancel = async () => {
    if (!appointmentToCancel) return;
    setIsCancelling(true);
    try {
      await portalApiClient.post(`/portal/appointments/${appointmentToCancel.id}/cancel`);
      toast.success('Tu cita fue cancelada');
      await queryClient.invalidateQueries({ queryKey: ['portal', 'appointments'] });
      setAppointmentToCancel(null);
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? (error.response?.data?.message ?? 'No se pudo cancelar la cita')
          : 'No se pudo cancelar la cita';
      toast.error(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || !patient) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-10 border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-400 text-primary-foreground">
              <User2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">
                {patient.firstName} {patient.lastName}
              </p>
              <p className="text-xs text-muted-foreground">Portal del Paciente</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Tabs defaultValue="appointments">
          <TabsList>
            <TabsTrigger value="appointments">
              <CalendarClock className="mr-2 h-4 w-4" />
              Mis citas
            </TabsTrigger>
            <TabsTrigger value="invoices">
              <Receipt className="mr-2 h-4 w-4" />
              Mis facturas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appointments" className="mt-4 space-y-3">
            {isLoadingAppointments ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))
            ) : appointments && appointments.length > 0 ? (
              appointments.map((appt, index) => (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="glass-panel rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium capitalize">
                        {formatDateTime(appt.startsAt)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {appt.treatment?.name ?? 'Consulta general'} · Dr(a).{' '}
                        {appt.doctor.firstName} {appt.doctor.lastName}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {appt.clinic.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={STATUS_VARIANT[appt.status]}>
                        {STATUS_LABEL[appt.status]}
                      </Badge>
                      {CANCELLABLE.includes(appt.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setAppointmentToCancel(appt)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="glass-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
                No tienes citas registradas.
              </div>
            )}
          </TabsContent>

          <TabsContent value="invoices" className="mt-4 space-y-3">
            {isLoadingInvoices ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))
            ) : invoices && invoices.length > 0 ? (
              invoices.map((invoice, index) => (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  className="glass-panel rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(invoice.createdAt).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.items.length} concepto{invoice.items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatMoney(invoice.total)}</p>
                      <p
                        className={
                          Number(invoice.balanceDue) > 0
                            ? 'text-xs text-destructive'
                            : 'text-xs text-success'
                        }
                      >
                        {Number(invoice.balanceDue) > 0
                          ? `Saldo: ${formatMoney(invoice.balanceDue)}`
                          : 'Pagada'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="glass-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
                No tienes facturas registradas.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog
        open={!!appointmentToCancel}
        onOpenChange={(open) => !open && setAppointmentToCancel(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar esta cita?</DialogTitle>
            <DialogDescription>
              {appointmentToCancel &&
                `${formatDateTime(appointmentToCancel.startsAt)} con Dr(a). ${appointmentToCancel.doctor.firstName} ${appointmentToCancel.doctor.lastName}. Esta acción no se puede deshacer.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAppointmentToCancel(null)}>
              Conservar cita
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              Sí, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
