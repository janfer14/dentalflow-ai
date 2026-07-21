'use client';

import { motion } from 'framer-motion';

export interface RankedBarItem {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  valueLabel: string;
}

const RANK_ACCENT = ['bg-primary', 'bg-primary/85', 'bg-primary/70', 'bg-primary/55', 'bg-primary/40'];

export function RankedBarList({
  items,
  emptyLabel,
}: {
  items: RankedBarItem[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-4">
      {items.map((item, index) => {
        const share = item.value / max;
        return (
          <li key={item.id}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.sublabel}</p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">{item.valueLabel}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className={`h-full origin-left rounded-full ${RANK_ACCENT[Math.min(index, RANK_ACCENT.length - 1)]}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: share }}
                transition={{ duration: 0.6, delay: 0.15 + index * 0.05, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
