'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion, useSpring } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  accent?: 'primary' | 'success' | 'warning' | 'destructive';
  delay?: number;
}

const ACCENT_STYLES: Record<NonNullable<KpiCardProps['accent']>, string> = {
  primary: 'from-primary/15 to-primary/0 text-primary',
  success: 'from-success/15 to-success/0 text-success',
  warning: 'from-warning/15 to-warning/0 text-warning',
  destructive: 'from-destructive/15 to-destructive/0 text-destructive',
};

interface ParsedValue {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
}

// Callers already format `value` however they need ("$1,234.56", "15%", "2")
// — parse the numeric run out of that string so the ticker can count up to it
// without every KpiCard call site having to pass a raw number separately.
function parseNumericDisplay(display: string): ParsedValue | null {
  const match = display.match(/-?[\d,]+(\.\d+)?/);
  if (!match || match.index === undefined) return null;
  const numStr = match[0];
  const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0;
  const target = Number(numStr.replace(/,/g, ''));
  if (Number.isNaN(target)) return null;
  return {
    prefix: display.slice(0, match.index),
    suffix: display.slice(match.index + numStr.length),
    target,
    decimals,
  };
}

function formatParsed(parsed: ParsedValue, current: number) {
  const formatted = current.toLocaleString('es-MX', {
    minimumFractionDigits: parsed.decimals,
    maximumFractionDigits: parsed.decimals,
  });
  return `${parsed.prefix}${formatted}${parsed.suffix}`;
}

function AnimatedValue({ value }: { value: string }) {
  const shouldReduceMotion = useReducedMotion();
  const parsed = useMemo(() => parseNumericDisplay(value), [value]);
  const spring = useSpring(0, { stiffness: 90, damping: 22, restDelta: 0.5 });
  const [text, setText] = useState(value);

  useEffect(() => {
    if (!parsed) return;
    spring.set(parsed.target);
  }, [parsed, spring]);

  useEffect(() => {
    if (!parsed) return;
    return spring.on('change', (current) => setText(formatParsed(parsed, current)));
  }, [spring, parsed]);

  if (!parsed || shouldReduceMotion) return <>{value}</>;
  return <>{text}</>;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = 'neutral',
  accent = 'primary',
  delay = 0,
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel elevated relative overflow-hidden rounded-2xl p-5"
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl',
          ACCENT_STYLES[accent],
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            <AnimatedValue value={value} />
          </p>
        </div>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br',
            ACCENT_STYLES[accent],
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      {trend && (
        <p
          className={cn(
            'relative mt-3 text-xs font-medium',
            trendDirection === 'up' && 'text-success',
            trendDirection === 'down' && 'text-destructive',
            trendDirection === 'neutral' && 'text-muted-foreground',
          )}
        >
          {trend}
        </p>
      )}
    </motion.div>
  );
}
