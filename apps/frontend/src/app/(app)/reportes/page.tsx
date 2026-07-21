'use client';

import { motion } from 'framer-motion';
import {
  CalendarX,
  DollarSign,
  Download,
  TrendingDown,
  UserPlus,
  Users,
} from 'lucide-react';
import { useReportsOverview } from '@/hooks/use-reports';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RevenueChart } from '@/components/reports/revenue-chart';
import { RankedBarList } from '@/components/reports/ranked-bar-list';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { exportToCsv } from '@/lib/csv-export';

function currency(value: number) {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function ReportesPage() {
  const { data, isLoading } = useReportsOverview();

  const handleExport = () => {
    if (!data) return;
    exportToCsv('produccion-por-doctor.csv', data.revenueByDoctor.map((d) => ({
      Doctor: d.doctorName,
      Tratamientos: d.count,
      Produccion: d.total,
    })));
    exportToCsv('tratamientos-mas-vendidos.csv', data.topTreatments.map((t) => ({
      Tratamiento: t.name,
      Cantidad: t.count,
      Total: t.total,
    })));
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes ejecutivos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Últimos 30 días · {new Date(data.range.from).toLocaleDateString('es-MX')} —{' '}
            {new Date(data.range.to).toLocaleDateString('es-MX')}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Ingresos" value={currency(data.kpis.totalRevenue)} icon={DollarSign} accent="success" />
        <KpiCard label="Pacientes nuevos" value={String(data.kpis.newPatients)} icon={UserPlus} accent="primary" delay={0.05} />
        <KpiCard label="Total de citas" value={String(data.kpis.totalAppointments)} icon={Users} accent="primary" delay={0.1} />
        <KpiCard
          label="Tasa de cancelación"
          value={`${data.kpis.cancellationRate}%`}
          icon={TrendingDown}
          accent={data.kpis.cancellationRate > 15 ? 'destructive' : 'warning'}
          delay={0.15}
        />
        <KpiCard
          label="Tasa de inasistencia"
          value={`${data.kpis.noShowRate}%`}
          icon={CalendarX}
          accent={data.kpis.noShowRate > 10 ? 'destructive' : 'warning'}
          delay={0.2}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel elevated rounded-2xl p-5"
      >
        <h2 className="mb-4 text-sm font-semibold">Ingresos por día</h2>
        <RevenueChart data={data.revenueByDay} />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-panel elevated rounded-2xl p-5"
        >
          <h2 className="mb-4 text-sm font-semibold">Producción por doctor</h2>
          <RankedBarList
            emptyLabel="Sin tratamientos completados en este período."
            items={data.revenueByDoctor.map((doctor) => ({
              id: doctor.doctorId,
              label: `Dr(a). ${doctor.doctorName}`,
              sublabel: `${doctor.count} tratamientos completados`,
              value: doctor.total,
              valueLabel: currency(doctor.total),
            }))}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-panel elevated rounded-2xl p-5"
        >
          <h2 className="mb-4 text-sm font-semibold">Tratamientos más vendidos</h2>
          <RankedBarList
            emptyLabel="Sin tratamientos completados en este período."
            items={data.topTreatments.map((treatment) => ({
              id: treatment.treatmentId,
              label: treatment.name,
              sublabel: `${treatment.count} realizados`,
              value: treatment.total,
              valueLabel: currency(treatment.total),
            }))}
          />
        </motion.div>
      </div>
    </div>
  );
}
