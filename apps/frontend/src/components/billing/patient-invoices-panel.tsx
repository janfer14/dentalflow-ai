'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateInvoice, useInvoices, useRegisterPayment } from '@/hooks/use-billing';
import { cn } from '@/lib/utils';
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/types/api';

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

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'INSURANCE', label: 'Seguro' },
  { value: 'OTHER', label: 'Otro' },
];

function currency(value: string | number) {
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function PaymentDialog({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [amount, setAmount] = useState(invoice.balanceDue);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const registerPayment = useRegisterPayment(invoice.id);

  const handleSubmit = async () => {
    try {
      await registerPayment.mutateAsync({ method, amount: Number(amount) });
      toast.success('Pago registrado');
      onClose();
    } catch {
      toast.error('No se pudo registrar el pago');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            Saldo pendiente: {currency(invoice.balanceDue)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={registerPayment.isPending}>
            {registerPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PatientInvoicesPanel({ patientId }: { patientId: string }) {
  const { data: invoices, isLoading } = useInvoices({ patientId });
  const createInvoice = useCreateInvoice();
  const [createOpen, setCreateOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const handleCreate = async () => {
    if (!description || !unitPrice) {
      toast.error('Completa la descripción y el precio');
      return;
    }
    try {
      await createInvoice.mutateAsync({
        patientId,
        taxRate: 0.16,
        items: [{ description, quantity: 1, unitPrice: Number(unitPrice) }],
      });
      toast.success('Factura creada');
      setCreateOpen(false);
      setDescription('');
      setUnitPrice('');
    } catch {
      toast.error('No se pudo crear la factura');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Nueva factura
        </Button>
      </div>

      {isLoading ? null : invoices && invoices.length > 0 ? (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {invoice.items.map((i) => i.description).join(', ')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total {currency(invoice.total)} · Saldo {currency(invoice.balanceDue)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={cn('border-none text-[10px]', STATUS_STYLE[invoice.status])}>
                  {STATUS_LABEL[invoice.status]}
                </Badge>
                {Number(invoice.balanceDue) > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setPayingInvoice(invoice)}>
                    Cobrar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
          <Receipt className="mb-2 h-6 w-6" />
          Sin facturas registradas.
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva factura</DialogTitle>
            <DialogDescription>Se aplica IVA del 16% automáticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Concepto</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Precio unitario</Label>
              <Input
                type="number"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createInvoice.isPending}>
              {createInvoice.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {payingInvoice && (
        <PaymentDialog invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />
      )}
    </div>
  );
}
