'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  DollarSign,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAppointments } from '@/hooks/use-appointments';
import { usePatients } from '@/hooks/use-patients';
import { useReportsOverview } from '@/hooks/use-reports';
import { useAuth } from '@/contexts/auth-context';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RankedBarList } from '@/components/reports/ranked-bar-list';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/types/api';

function currency(value: number) {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

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

function startOfWeekISO(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = domingo, 1 = lunes, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const today = useMemo(() => new Date(), []);

  const { data: todaysAppointments, isLoading: isLoadingAppointments } = useAppointments({
    from: startOfDayISO(today),
    to: endOfDayISO(today),
  });

  const { data: patientsPage } = usePatients({ page: 1, pageSize: 1 });

  const { data: weekOverview, isLoading: isLoadingWeek } = useReportsOverview({
    from: startOfWeekISO(today),
    to: today.toISOString(),
  });

  const stats = useMemo(() => {
    const list = todaysAppointments ?? [];
    const waiting = list.filter((a) => a.status === 'CHECKED_IN').length;
    const confirmed = list.filter((a) => a.status === 'CONFIRMED').length;
    const completed = list.filter((a) => a.status === 'COMPLETED').length;
    const revenue = list
      .filter((a) => a.status === 'COMPLETED' && a.treatment)
      .reduce((sum, a) => sum + Number(a.treatment?.defaultPrice ?? 0), 0);

    return { total: list.length, waiting, confirmed, completed, revenue };
  }, [todaysAppointments]);

  const greeting = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold tracking-tight"
        >
          {greeting}, {user?.firstName} 👋
        </motion.h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Este es el resumen de tu clínica para hoy,{' '}
          {today.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Citas de hoy"
          value={String(stats.total)}
          icon={CalendarClock}
          accent="primary"
          trend={`${stats.confirmed} confirmadas`}
          delay={0}
        />
        <KpiCard
          label="En sala de espera"
          value={String(stats.waiting)}
          icon={Clock}
          accent="warning"
          trend="Actualizado en tiempo real"
          delay={0.05}
        />
        <KpiCard
          label="Consultas completadas"
          value={String(stats.completed)}
          icon={CheckCircle2}
          accent="success"
          trend={`${stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% del día`}
          delay={0.1}
        />
        <KpiCard
          label="Ingresos del día"
          value={stats.revenue.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
          icon={DollarSign}
          accent="success"
          trend="Tratamientos completados"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel elevated rounded-2xl p-5 lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Agenda de hoy</h2>
            <Badge variant="secondary">{stats.total} citas</Badge>
          </div>

          {isLoadingAppointments ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : todaysAppointments && todaysAppointments.length > 0 ? (
            <div className="space-y-2">
              {todaysAppointments.map((appointment) => (
                <div
                  key={appointment.id}
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
                      {appointment.treatment?.name ?? 'Consulta general'} · Dr(a).{' '}
                      {appointment.doctor.firstName} {appointment.doctor.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {new Date(appointment.startsAt).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <Badge
                      className={cn('mt-1 border-none text-[10px]', STATUS_VARIANT[appointment.status])}
                    >
                      {STATUS_LABEL[appointment.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No hay citas programadas para hoy.
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-panel elevated rounded-2xl p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Resumen de pacientes</h2>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-3xl font-semibold tracking-tight">{patientsPage?.total ?? '—'}</p>
          <p className="mt-1 text-xs text-muted-foreground">Pacientes registrados en tu clínica</p>

          <div className="mt-6 space-y-3 border-t border-border/60 pt-4">
            <p className="text-xs font-medium text-muted-foreground">Accesos rápidos</p>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/reportes" className="text-primary hover:underline">
                  Reportes ejecutivos
                </Link>
              </li>
              <li>
                <Link
                  href="/asistente"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Sparkles className="h-3 w-3" />
                  Asistente DentalFlow AI
                </Link>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel elevated rounded-2xl p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4" />
            Producción por doctor esta semana
          </h2>
          <Badge variant="secondary">
            Total: {currency(weekOverview?.kpis.totalRevenue ?? 0)}
          </Badge>
        </div>

        {isLoadingWeek ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <RankedBarList
            emptyLabel="Todavía no hay tratamientos completados esta semana."
            items={(weekOverview?.revenueByDoctor ?? []).map((doctor) => ({
              id: doctor.doctorId,
              label: doctor.doctorName,
              sublabel: `${doctor.count} tratamiento${doctor.count === 1 ? '' : 's'}`,
              value: doctor.total,
              valueLabel: currency(doctor.total),
            }))}
          />
        )}
      </motion.div>
    </div>
  );
}
