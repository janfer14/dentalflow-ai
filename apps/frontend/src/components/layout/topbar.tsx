'use client';

import { useTheme } from 'next-themes';
import { Bell, LogOut, Moon, Search, Sun, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/auth-context';
import { ClinicSelector } from '@/components/layout/clinic-selector';

export function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : '?';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl lg:px-6">
      <button
        onClick={onOpenSearch}
        className="flex flex-1 max-w-md items-center gap-2 rounded-xl border border-border/70 bg-secondary/60 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary"
      >
        <Search className="h-4 w-4" />
        <span>Buscar pacientes, citas...</span>
        <kbd className="ml-auto rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>

      <div className="flex-1" />

      <ClinicSelector />

      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        <Sun className="h-4.5 w-4.5 scale-100 dark:scale-0 transition-transform" />
        <Moon className="absolute h-4.5 w-4.5 scale-0 dark:scale-100 transition-transform" />
      </Button>

      <Button variant="ghost" size="icon" className="rounded-full">
        <Bell className="h-4.5 w-4.5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="ml-1 flex items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-colors hover:bg-secondary">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="text-sm font-medium">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserIcon className="mr-2 h-4 w-4" />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
