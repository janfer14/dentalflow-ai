'use client';

import { MotionConfig } from 'framer-motion';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/* Makes every motion.* component and AnimatePresence exit across the
          app honor prefers-reduced-motion automatically, in one place —
          standalone useSpring/useMotionValue hooks (e.g. the KPI ticker)
          still opt in individually since MotionConfig doesn't reach those. */}
      <MotionConfig reducedMotion="user">
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={200}>
              {/* Toaster must mount before children so its store subscription is
                  ready before any child's mount-time effect calls toast() —
                  otherwise the first toast on initial page load is silently
                  dropped (JSX/effect order is document order). */}
              <Toaster richColors position="top-right" />
              {children}
            </TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
