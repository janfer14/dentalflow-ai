'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateWhatsAppTemplate } from '@/hooks/use-whatsapp';
import type { WhatsAppTemplate } from '@/types/api';

const TEMPLATE_LABELS: Record<string, string> = {
  appointment_confirmation: 'Confirmación de cita',
  appointment_reminder_72h: 'Recordatorio · 72 horas antes',
  appointment_reminder_48h: 'Recordatorio · 48 horas antes',
  appointment_reminder_24h: 'Recordatorio · 24 horas antes',
  appointment_reminder_2h: 'Recordatorio · 2 horas antes',
  appointment_cancelled: 'Cancelación de cita',
  appointment_rescheduled: 'Reagendamiento de cita',
};

const PLACEHOLDER_LEGEND =
  '{{1}} paciente · {{2}} fecha · {{3}} hora · {{4}} doctor · {{5}} clínica';

export function TemplateCard({ template }: { template: WhatsAppTemplate }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(template.body);
  const updateTemplate = useUpdateWhatsAppTemplate();

  const handleSave = async () => {
    try {
      await updateTemplate.mutateAsync({ key: template.key, body });
      toast.success('Plantilla actualizada');
      setEditing(false);
    } catch {
      toast.error('No se pudo actualizar la plantilla');
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {TEMPLATE_LABELS[template.key] ?? template.key}
          </p>
          <p className="text-[11px] text-muted-foreground">{template.key}</p>
        </div>
        {!editing ? (
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={updateTemplate.isPending}
          >
            {updateTemplate.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {editing ? (
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-3 min-h-24 text-sm"
        />
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{template.body}</p>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">{PLACEHOLDER_LEGEND}</p>
    </div>
  );
}
