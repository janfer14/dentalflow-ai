'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function StockLevelBar({
  quantity,
  minStock,
  delay = 0,
}: {
  quantity: number;
  minStock: number;
  delay?: number;
}) {
  const ceiling = Math.max(quantity, minStock * 2, 1);
  const share = Math.min(quantity / ceiling, 1);
  const thresholdShare = Math.min(minStock / ceiling, 1);

  const health =
    quantity <= minStock ? 'bg-destructive' : quantity <= minStock * 1.5 ? 'bg-warning' : 'bg-success';

  return (
    <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-muted">
      <motion.div
        className={cn('h-full origin-left rounded-full', health)}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: share }}
        transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      />
      {minStock > 0 && (
        <div
          className="absolute top-0 h-full w-px bg-foreground/25"
          style={{ left: `${thresholdShare * 100}%` }}
          title={`Mínimo: ${minStock}`}
        />
      )}
    </div>
  );
}
