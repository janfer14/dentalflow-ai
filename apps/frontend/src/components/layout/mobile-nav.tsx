'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Sparkles } from 'lucide-react';
import { NAV_ITEMS } from './nav-items';
import { ClinicSelector } from './clinic-selector';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.doctorOnly || user?.isDoctor);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-4.5 w-4.5" />
        <span className="sr-only">Abrir menú</span>
      </Button>
      <SheetContent side="left" className="flex w-3/4 max-w-xs flex-col p-0">
        <SheetHeader className="border-b border-border/60 px-6 py-6">
          <SheetTitle asChild>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-400 text-primary-foreground shadow-lg shadow-primary/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight tracking-tight">
                  DentalFlow AI
                </p>
                <p className="text-xs font-normal leading-tight text-muted-foreground">
                  Enterprise
                </p>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="px-3 pt-3">
          <ClinicSelector />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.badge ? '#' : item.href}
                aria-disabled={Boolean(item.badge)}
                onClick={() => !item.badge && setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                  item.badge && 'pointer-events-none opacity-50',
                )}
              >
                <item.icon className="h-4.5 w-4.5" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
