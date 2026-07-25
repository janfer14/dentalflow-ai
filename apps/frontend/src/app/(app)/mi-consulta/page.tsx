'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  PlayCircle,
} from 'lucide-react';
import { useAppointments, useUpdateAppointment } from '@/hooks/use-appointments';
import { useAuth } from '@/contexts/auth-context';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Appointment, AppointmentStatus } from '@/types/api';

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Programada',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'En sala de espera',
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

const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  CONFIRMED: 'CHECKED_IN',
  CHECKED_IN: 'IN_PROGRESS',
  IN_PROGRESS: 'COMPLETED',
};

const NEXT_STATUS_LABEL: Partial<Record<AppointmentStatus, string>> = {
  CONFIRMED: 'Registrar llegada',
  CHECKED_IN: 'Iniciar consulta',
  IN_PROGRESS: 'Completar',
};

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

function AdvanceStatusButton({ appointment }: { appointment: Appointment }) {
  const updateAppointment = useUpdateAppointment(appointment.id);
  const next = NEXT_STATUS[appointment.status];
  if (!next) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={updateAppointment.isPending}
      onClick={(event) => {
        event.preventDefault();
        updateAppointment.mutate({ status: next });
      }}
    >
      <PlayCircle className="mr-1.5 h-3.5 w-3.5" />
      {NEXT_STATUS_LABEL[appointment.status]}
    </Button>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  return (
    <Link
      href={`/pacientes/${appointment.patientId}`}
      className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3 transition-colors hover:bg-secondary/50"
    >
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {appointment.patient.firstName[0]}
          {appointment.patient.lastName[0]}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {appointment.patient.firstName} {appointment.patient.lastName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {appointment.treatment?.name ?? 'Consulta general'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-xs font-medium">
            {new Date(appointment.startsAt).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <Badge className={cn('mt-1 border-none text-[10px]', STATUS_VARIANT[appointment.status])}>
            {STATUS_LABEL[appointment.status]}
          </Badge>
        </div>
        <AdvanceStatusButton appointment={appointment} />
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </Link>
  );
}

export default function MiConsultaPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const weekEnd = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 7);
    return d;
  }, [today]);

  useEffect(() => {
    if (!isLoadingAuth && user && !user.isDoctor) {
      router.replace('/dashboard');
    }
  }, [isLoadingAuth, user, router]);

  const { data: todaysAppointments, isLoading: isLoadingToday } = useAppointments({
    doctorId: user?.id,
    from: startOfDayISO(today),
    to: endOfDayISO(today),
  });

  const { data: weekAppointments, isLoading: isLoadingWeek } = useAppointments({
    doctorId: user?.id,
    from: endOfDayISO(today),
    to: endOfDayISO(weekEnd),
  });

  const stats = useMemo(() => {
    const list = todaysAppointments ?? [];
    const waiting = list.filter((a) => a.status === 'CHECKED_IN').length;
    const inProgress = list.filter((a) => a.status === 'IN_PROGRESS').length;
    const completed = list.filter((a) => a.status === 'COMPLETED').length;
    return { total: list.length, waiting, inProgress, completed };
  }, [todaysAppointments]);

  const upcomingByDay = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    for (const appointment of weekAppointments ?? []) {
      const dayKey = new Date(appointment.startsAt).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      groups.set(dayKey, [...(groups.get(dayKey) ?? []), appointment]);
    }
    return Array.from(groups.entries());
  }, [weekAppointments]);

  if (isLoadingAuth || !user?.isDoctor) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          Mi consulta
        </motion.h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tu agenda y tus pacientes, Dr(a). {user.firstName} {user.lastName}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Citas de hoy" value={String(stats.total)} icon={CalendarClock} accent="primary" delay={0} />
        <KpiCard label="En sala de espera" value={String(stats.waiting)} icon={Clock} accent="warning" delay={0.05} />
        <KpiCard label="En consulta" value={String(stats.inProgress)} icon={PlayCircle} accent="primary" delay={0.1} />
        <KpiCard label="Completadas" value={String(stats.completed)} icon={CheckCircle2} accent="success" delay={0.15} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel elevated rounded-2xl p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Agenda de hoy</h2>
          <Badge variant="secondary">{stats.total} citas</Badge>
        </div>

        {isLoadingToday ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : todaysAppointments && todaysAppointments.length > 0 ? (
          <div className="space-y-2">
            {todaysAppointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
            <CalendarClock className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No tienes citas programadas para hoy.</p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass-panel elevated rounded-2xl p-5"
      >
        <h2 className="mb-4 text-sm font-semibold">Próximos días</h2>

        {isLoadingWeek ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : upcomingByDay.length > 0 ? (
          <div className="space-y-5">
            {upcomingByDay.map(([day, appointments]) => (
              <div key={day}>
                <p className="mb-2 text-xs font-medium capitalize text-muted-foreground">{day}</p>
                <div className="space-y-2">
                  {appointments.map((appointment) => (
                    <AppointmentRow key={appointment.id} appointment={appointment} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tienes citas programadas en los próximos 7 días.
          </p>
        )}
      </motion.div>
    </div>
  );
}
