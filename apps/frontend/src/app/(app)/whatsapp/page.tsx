'use client';

import { motion } from 'framer-motion';
import { MessageCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useWhatsAppStatus, useWhatsAppTemplates } from '@/hooks/use-whatsapp';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TemplateCard } from '@/components/whatsapp/template-card';
import { BroadcastDialog } from '@/components/whatsapp/broadcast-dialog';

export default function WhatsAppPage() {
  const { data: status, isLoading: isLoadingStatus } = useWhatsAppStatus();
  const { data: templates, isLoading: isLoadingTemplates } = useWhatsAppTemplates();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirmaciones, recordatorios y mensajería automática vía WhatsApp Cloud API
          </p>
        </div>
        <BroadcastDialog />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel elevated flex items-center gap-4 rounded-2xl p-5"
      >
        <div
          className={
            status?.configured
              ? 'flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success'
              : 'flex h-11 w-11 items-center justify-center rounded-xl bg-warning/15 text-warning'
          }
        >
          {status?.configured ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1">
          {isLoadingStatus ? (
            <Skeleton className="h-5 w-64" />
          ) : status?.configured ? (
            <>
              <p className="text-sm font-semibold">Conectado a WhatsApp Cloud API</p>
              <p className="text-xs text-muted-foreground">
                Número: {status.phoneNumberId}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Modo sandbox (sin credenciales)</p>
              <p className="text-xs text-muted-foreground">
                Los mensajes se simulan y quedan registrados, pero no se envían de verdad. Agrega
                WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_ACCESS_TOKEN en el backend para conectar tu
                cuenta de Meta Business.
              </p>
            </>
          )}
        </div>
        <Badge variant={status?.configured ? 'default' : 'secondary'}>
          {status?.mode === 'live' ? 'En vivo' : 'Sandbox'}
        </Badge>
      </motion.div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Plantillas de mensajes</h2>
        </div>

        {isLoadingTemplates ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {templates?.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <TemplateCard template={template} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
