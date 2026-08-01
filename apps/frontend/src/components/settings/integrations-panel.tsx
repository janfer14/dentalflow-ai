'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, MessageCircle, Sparkles } from 'lucide-react';
import { useIntegrationsStatus } from '@/hooks/use-integrations-status';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function StatusCard({
  icon,
  title,
  configured,
  detail,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  configured: boolean;
  detail: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass-panel elevated rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <Badge variant={configured ? 'default' : 'secondary'} className="gap-1 text-[10px]">
          {configured ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
          {configured ? 'Configurado' : 'No configurado'}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{detail}</p>
      {children}
    </div>
  );
}

export function IntegrationsPanel() {
  const { data: status, isLoading } = useIntegrationsStatus();

  if (isLoading || !status) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusCard
          icon={<MessageCircle className="h-4 w-4" />}
          title="WhatsApp Cloud API"
          configured={status.whatsapp.configured}
          detail={
            status.whatsapp.configured
              ? 'Enviando mensajes reales.'
              : 'En modo sandbox — los mensajes se registran pero no se envían.'
          }
        >
          <Link href="/whatsapp" className="mt-3 inline-block text-sm text-primary hover:underline">
            Editar plantillas →
          </Link>
        </StatusCard>

        <StatusCard
          icon={<Sparkles className="h-4 w-4" />}
          title="Asistente DentalFlow AI"
          configured={status.ai.configured}
          detail={
            status.ai.configured
              ? `Modelo activo: ${status.ai.model}`
              : 'En modo sandbox — respuestas simuladas.'
          }
        />

        <StatusCard
          icon={<Circle className="h-4 w-4" />}
          title="Google OAuth"
          configured={status.google.configured}
          detail={
            status.google.configured
              ? 'Los usuarios pueden iniciar sesión con Google.'
              : 'No configurado — el botón de Google no aparece en el login.'
          }
        />

        <StatusCard
          icon={<Circle className="h-4 w-4" />}
          title="Microsoft OAuth"
          configured={status.microsoft.configured}
          detail={
            status.microsoft.configured
              ? 'Los usuarios pueden iniciar sesión con Microsoft.'
              : 'No configurado — el botón de Microsoft no aparece en el login.'
          }
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Estas integraciones se configuran con variables de entorno en el servidor (Render), no
        desde aquí. Consulta el README del proyecto para las instrucciones de cada una.
      </p>
    </div>
  );
}
