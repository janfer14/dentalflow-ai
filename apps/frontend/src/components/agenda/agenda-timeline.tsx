'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Appointment, AppointmentStatus, DoctorSummary, Patient } from '@/types/api';

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

// Status reads through the left border only — a thin, low-weight channel —
// so it never competes with the gender fill, which is the dominant color.
const STATUS_BORDER: Record<AppointmentStatus, string> = {
  SCHEDULED: 'border-l-muted-foreground/40',
  CONFIRMED: 'border-l-primary',
  CHECKED_IN: 'border-l-warning',
  IN_PROGRESS: 'border-l-primary',
  COMPLETED: 'border-l-success',
  CANCELLED: 'border-l-destructive/50',
  NO_SHOW: 'border-l-destructive/50',
  RESCHEDULED: 'border-l-muted-foreground/40',
};

const FADED_STATUS: AppointmentStatus[] = ['CANCELLED', 'NO_SHOW'];

// Fill color encodes patient gender — a fast visual-scan cue clinic staff
// asked for, distinct from the status border so the two channels don't clash.
const GENDER_FILL: Record<Patient['gender'], string> = {
  FEMALE: 'bg-rose-50 dark:bg-rose-500/15',
  MALE: 'bg-sky-50 dark:bg-sky-500/15',
  OTHER: 'bg-violet-50 dark:bg-violet-500/15',
  UNSPECIFIED: 'bg-secondary/70',
};

const GENDER_TEXT: Record<Patient['gender'], string> = {
  FEMALE: 'text-rose-900 dark:text-rose-200',
  MALE: 'text-sky-900 dark:text-sky-200',
  OTHER: 'text-violet-900 dark:text-violet-200',
  UNSPECIFIED: 'text-foreground',
};

// Business hours span 7:00–21:00. Rather than squeeze the whole day into
// whatever vertical space happens to be available (illegible at short
// viewport heights), rows keep a fixed, comfortable size — same approach as
// Google Calendar / Cal.com / Fantastical — and the grid scrolls internally
// within its own panel, auto-landing near "now" (or the day's first
// appointment) so the relevant hours are visible without the user having to
// hunt for them.
const DAY_START_MIN = 7 * 60;
const DAY_END_MIN = 21 * 60;
const PX_PER_MIN = 1; // 60px per hour
const TOTAL_HEIGHT = (DAY_END_MIN - DAY_START_MIN) * PX_PER_MIN;
const MIN_BLOCK_HEIGHT = 28;
const HEADER_HEIGHT = 36;

function minutesSinceMidnight(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function toPx(minute: number) {
  return (minute - DAY_START_MIN) * PX_PER_MIN;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}

function useNowMinutes(enabled: boolean) {
  const [minutes, setMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const now = new Date();
      setMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, [enabled]);

  return minutes;
}

function AppointmentBlock({ appointment, index }: { appointment: Appointment; index: number }) {
  const start = minutesSinceMidnight(appointment.startsAt);
  const end = minutesSinceMidnight(appointment.endsAt);
  const top = Math.max(0, toPx(start));
  const height = Math.max(toPx(end) - toPx(start), MIN_BLOCK_HEIGHT);
  const gender = appointment.patient.gender;
  const faded = FADED_STATUS.includes(appointment.status);
  const compact = height < 44;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 + index * 0.03, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            'absolute inset-x-1 overflow-hidden rounded-lg border-l-[3px] px-2 py-1.5 text-left shadow-sm ring-1 ring-black/[0.03] transition-colors hover:brightness-[0.97] dark:ring-white/[0.04]',
            STATUS_BORDER[appointment.status],
            GENDER_FILL[gender],
            faded && 'opacity-55',
          )}
          style={{ top, height }}
        >
          <p className={cn('truncate text-xs font-semibold leading-tight', GENDER_TEXT[gender])}>
            {appointment.patient.firstName} {appointment.patient.lastName}
          </p>
          {!compact && (
            <p className="truncate text-[11px] text-muted-foreground/80">
              {timeLabel(appointment.startsAt)} · {appointment.treatment?.name ?? 'Consulta general'}
            </p>
          )}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="right" className="w-max max-w-64 flex-col items-start gap-0 space-y-0.5 py-2">
        <p className="font-semibold whitespace-nowrap">
          {appointment.patient.firstName} {appointment.patient.lastName}
        </p>
        <p className="text-muted-foreground whitespace-nowrap">
          {timeLabel(appointment.startsAt)} – {timeLabel(appointment.endsAt)}
        </p>
        <p className="text-muted-foreground whitespace-nowrap">
          {appointment.treatment?.name ?? 'Consulta general'}
        </p>
        <p className="pt-1 font-medium whitespace-nowrap">{STATUS_LABEL[appointment.status]}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function useHourMarks() {
  return useMemo(() => {
    const list: number[] = [];
    for (let m = DAY_START_MIN; m <= DAY_END_MIN; m += 60) list.push(m);
    return list;
  }, []);
}

function HourGrid() {
  const hours = useHourMarks();
  return (
    <>
      {hours.map((minute) => (
        <div
          key={minute}
          className="absolute inset-x-0 border-t border-border/50"
          style={{ top: toPx(minute) }}
        />
      ))}
    </>
  );
}

function NowLine({ isToday }: { isToday: boolean }) {
  const nowMinutes = useNowMinutes(isToday);
  if (!isToday || nowMinutes < DAY_START_MIN || nowMinutes > DAY_END_MIN) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
      style={{ top: toPx(nowMinutes) }}
    >
      <div className="-ml-1 h-2 w-2 shrink-0 rounded-full bg-destructive" />
      <div className="h-px w-full bg-destructive/70" />
    </div>
  );
}

export function AgendaTimeline({
  doctors,
  appointments,
  isLoading,
  isToday,
}: {
  doctors: DoctorSummary[];
  appointments: Appointment[];
  isLoading: boolean;
  isToday: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const appointmentsByDoctor = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appt of appointments) {
      const list = map.get(appt.doctorId) ?? [];
      list.push(appt);
      map.set(appt.doctorId, list);
    }
    return map;
  }, [appointments]);

  const hourMarks = useHourMarks();

  // Land on the relevant part of the day instead of always starting at 7am:
  // near "now" when viewing today, near the first appointment otherwise.
  useEffect(() => {
    if (isLoading || !scrollRef.current) return;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let targetMinute = DAY_START_MIN + 120;

    if (isToday && nowMinutes >= DAY_START_MIN && nowMinutes <= DAY_END_MIN) {
      targetMinute = nowMinutes - 60;
    } else if (appointments.length > 0) {
      const earliest = Math.min(...appointments.map((a) => minutesSinceMidnight(a.startsAt)));
      targetMinute = earliest - 30;
    }

    const target = Math.max(0, toPx(targetMinute));
    scrollRef.current.scrollTo({ top: target, behavior: 'smooth' });
  }, [isLoading, isToday, appointments]);

  if (isLoading) {
    return (
      <div className="glass-panel elevated flex min-h-0 flex-1 gap-4 overflow-hidden rounded-2xl p-4">
        <Skeleton className="h-full w-14 shrink-0" />
        <Skeleton className="h-full flex-1" />
        <Skeleton className="h-full flex-1" />
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="glass-panel elevated flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl text-center">
        <CalendarDays className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aún no hay doctores registrados en el directorio.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel elevated flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div
          className="flex min-w-fit"
          style={{ minWidth: doctors.length > 2 ? doctors.length * 220 : undefined }}
        >
          {/* Time axis */}
          <div className="sticky left-0 z-20 w-14 shrink-0 bg-card/95 backdrop-blur-sm">
            <div className="sticky top-0 z-30 bg-card/95" style={{ height: HEADER_HEIGHT }} />
            <div className="relative" style={{ height: TOTAL_HEIGHT }}>
              {hourMarks.map((minute) => (
                <p
                  key={minute}
                  className="absolute -translate-y-1/2 pl-4 text-[11px] text-muted-foreground tabular-nums"
                  style={{ top: toPx(minute) }}
                >
                  {String(Math.floor(minute / 60)).padStart(2, '0')}:00
                </p>
              ))}
            </div>
          </div>

          {doctors.map((doctor) => (
            <div key={doctor.id} className="min-w-[220px] flex-1 border-l border-border/60 pl-3">
              <div
                className="sticky top-0 z-10 flex items-center gap-2 bg-card/95 pb-2 backdrop-blur-sm"
                style={{ height: HEADER_HEIGHT }}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                    {doctor.firstName[0]}
                    {doctor.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <p className="truncate text-xs font-semibold">
                  Dr(a). {doctor.firstName} {doctor.lastName}
                </p>
              </div>
              <div className="relative" style={{ height: TOTAL_HEIGHT }}>
                <HourGrid />
                <NowLine isToday={isToday} />
                {(appointmentsByDoctor.get(doctor.id) ?? []).map((appointment, index) => (
                  <AppointmentBlock key={appointment.id} appointment={appointment} index={index} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 px-4 py-2.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Paciente mujer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Paciente hombre
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> Otro / sin especificar
        </span>
      </div>
    </div>
  );
}
