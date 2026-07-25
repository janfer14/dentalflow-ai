'use client';

import { useState } from 'react';
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
import { useAdjustStock } from '@/hooks/use-inventory';
import { useClinic } from '@/contexts/clinic-context';
import type { Product, StockMovementType } from '@/types/api';

const MOVEMENT_LABELS: { value: StockMovementType; label: string }[] = [
  { value: 'PURCHASE_IN', label: 'Entrada por compra' },
  { value: 'ADJUSTMENT_IN', label: 'Ajuste positivo' },
  { value: 'CONSUMPTION_OUT', label: 'Consumo' },
  { value: 'ADJUSTMENT_OUT', label: 'Ajuste negativo' },
  { value: 'EXPIRED_OUT', label: 'Caducado' },
];

export function AdjustStockDialog({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const { selectedClinicId } = useClinic();
  const adjustStock = useAdjustStock(product.id);
  const [type, setType] = useState<StockMovementType>('PURCHASE_IN');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!selectedClinicId) return;
    try {
      await adjustStock.mutateAsync({
        clinicId: selectedClinicId,
        type,
        quantity: Number(quantity),
        reason: reason || undefined,
      });
      toast.success('Movimiento de inventario registrado');
      onClose();
    } catch (error) {
      const message = error instanceof AxiosError ? error.response?.data?.message : undefined;
      toast.error(typeof message === 'string' ? message : 'No se pudo registrar el movimiento');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>Stock actual: {product.quantity} {product.unit}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo de movimiento</Label>
            <Select value={type} onValueChange={(v) => setType(v as StockMovementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_LABELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cantidad</Label>
            <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Motivo (opcional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={adjustStock.isPending}>
            {adjustStock.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
