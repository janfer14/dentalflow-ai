'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import { useCreateProduct } from '@/hooks/use-inventory';

export function ProductFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProduct = useCreateProduct();
  const [form, setForm] = useState({ sku: '', name: '', category: '', unit: 'pieza', minStock: '5' });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createProduct.mutateAsync({
        sku: form.sku,
        name: form.name,
        category: form.category || undefined,
        unit: form.unit || undefined,
        minStock: form.minStock ? Number(form.minStock) : undefined,
      });
      toast.success('Producto registrado');
      setForm({ sku: '', name: '', category: '', unit: 'pieza', minStock: '5' });
      onOpenChange(false);
    } catch {
      toast.error('No se pudo registrar el producto');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo producto</DialogTitle>
          <DialogDescription>Registra un material o insumo en el inventario.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>SKU</Label>
            <Input
              required
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unidad</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Stock mínimo</Label>
            <Input
              type="number"
              value={form.minStock}
              onChange={(e) => setForm((p) => ({ ...p, minStock: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
