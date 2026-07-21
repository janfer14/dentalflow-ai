'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Package, Plus } from 'lucide-react';
import { useProducts } from '@/hooks/use-inventory';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductFormDialog } from '@/components/inventory/product-form-dialog';
import { AdjustStockDialog } from '@/components/inventory/adjust-stock-dialog';
import { StockLevelBar } from '@/components/inventory/stock-level-bar';
import type { Product } from '@/types/api';

export default function InventarioPage() {
  const { data: products, isLoading } = useProducts();
  const [createOpen, setCreateOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  const stats = useMemo(() => {
    const list = products ?? [];
    const lowStockCount = list.filter((p) => p.lowStock).length;
    return { total: list.length, lowStockCount };
  }, [products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Material dental, insumos y control de stock
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Productos activos" value={String(stats.total)} icon={Package} accent="primary" />
        <KpiCard
          label="Stock bajo"
          value={String(stats.lowStockCount)}
          icon={AlertTriangle}
          accent={stats.lowStockCount > 0 ? 'destructive' : 'success'}
          delay={0.05}
        />
      </div>

      <div className="glass-panel elevated overflow-hidden rounded-2xl">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <ul className="divide-y divide-border/60">
            {products.map((product, index) => (
              <motion.li
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.sku} {product.category ? `· ${product.category}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {product.quantity} {product.unit}
                    </p>
                    {product.lowStock && (
                      <Badge className="border-none bg-destructive/10 text-[10px] text-destructive">
                        Stock bajo
                      </Badge>
                    )}
                  </div>
                  <StockLevelBar
                    quantity={product.quantity}
                    minStock={product.minStock}
                    delay={0.1 + index * 0.02}
                  />
                  <Button size="sm" variant="outline" onClick={() => setAdjustingProduct(product)}>
                    Ajustar
                  </Button>
                </div>
              </motion.li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Aún no hay productos registrados.</p>
          </div>
        )}
      </div>

      <ProductFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {adjustingProduct && (
        <AdjustStockDialog product={adjustingProduct} onClose={() => setAdjustingProduct(null)} />
      )}
    </div>
  );
}
