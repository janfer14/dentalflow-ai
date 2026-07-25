'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, FileWarning, Receipt, TrendingUp } from 'lucide-react';
import { useAccountsReceivable, useInvoices } from '@/hooks/use-billing';
import { useClinic } from '@/contexts/clinic-context';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { CashRegisterPanel } from '@/components/billing/cash-register-panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { InvoiceStatus } from '@/types/api';

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: 'Borrador',
  ISSUED: 'Emitida',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada',
  OVERDUE: 'Vencida',
  VOID: 'Anulada',
};

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-secondary text-secondary-foreground',
  ISSUED: 'bg-primary/10 text-primary',
  PARTIALLY_PAID: 'bg-warning/15 text-warning',
  PAID: 'bg-success/15 text-success',
  OVERDUE: 'bg-destructive/10 text-destructive',
  VOID: 'bg-muted text-muted-foreground',
};

function currency(value: string | number) {
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export default function CajaPage() {
  const { data: invoices, isLoading } = useInvoices();
  const { data: receivable } = useAccountsReceivable();
  const { selectedClinicId } = useClinic();

  const stats = useMemo(() => {
    const list = invoices ?? [];
    const totalBilled = list.reduce((sum, inv) => sum + Number(inv.total), 0);
    const totalPending = list.reduce((sum, inv) => sum + Number(inv.balanceDue), 0);
    const totalCollected = totalBilled - totalPending;
    const overdueCount = receivable?.length ?? 0;
    return { totalBilled, totalPending, totalCollected, overdueCount };
  }, [invoices, receivable]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Caja y cobranza</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Facturación, pagos y control de caja de tu clínica
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Facturado" value={currency(stats.totalBilled)} icon={Receipt} accent="primary" />
        <KpiCard label="Cobrado" value={currency(stats.totalCollected)} icon={TrendingUp} accent="success" delay={0.05} />
        <KpiCard label="Por cobrar" value={currency(stats.totalPending)} icon={DollarSign} accent="warning" delay={0.1} />
        <KpiCard label="Cuentas vencidas" value={String(stats.overdueCount)} icon={FileWarning} accent="destructive" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel elevated rounded-2xl p-5 lg:col-span-2"
        >
          <h2 className="mb-4 text-sm font-semibold">Facturas recientes</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {invoice.patient.firstName} {invoice.patient.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {invoice.items.map((i) => i.description).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{currency(invoice.total)}</p>
                    <Badge className={cn('mt-1 border-none text-[10px]', STATUS_STYLE[invoice.status])}>
                      {STATUS_LABEL[invoice.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay facturas registradas.
            </p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {selectedClinicId && <CashRegisterPanel clinicId={selectedClinicId} />}
        </motion.div>
      </div>
    </div>
  );
}
