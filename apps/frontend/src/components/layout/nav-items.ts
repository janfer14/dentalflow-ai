import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CalendarDays,
  LayoutDashboard,
  Users,
  Stethoscope,
  Wallet,
  Package,
  MessageCircle,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  exact?: boolean;
  doctorOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Mi consulta', href: '/mi-consulta', icon: Activity, doctorOnly: true },
  { label: 'Agenda', href: '/agenda', icon: CalendarDays },
  { label: 'Pacientes', href: '/pacientes', icon: Users, exact: true },
  { label: 'Expediente clínico', href: '/expedientes', icon: Stethoscope },
  { label: 'Caja y cobranza', href: '/caja', icon: Wallet },
  { label: 'Inventario', href: '/inventario', icon: Package },
  { label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { label: 'Asistente IA', href: '/asistente', icon: Sparkles },
  { label: 'Reportes', href: '/reportes', icon: BarChart3 },
  { label: 'Configuración', href: '/configuracion', icon: Settings, badge: 'Pronto' },
];
