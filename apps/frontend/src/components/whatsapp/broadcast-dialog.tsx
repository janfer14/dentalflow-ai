'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Megaphone, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBroadcastPreview,
  useCreateBroadcast,
  type BroadcastAudience,
} from '@/hooks/use-whatsapp';

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  ALL: 'Todos los pacientes que aceptan WhatsApp',
  BIRTHDAY_TODAY: 'Cumpleaños de hoy',
  BIRTHDAY_WEEK: 'Cumpleaños de esta semana',
};

export function BroadcastDialog() {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<BroadcastAudience>('ALL');
  const [message, setMessage] = useState('');
  const { data: preview, isLoading: isLoadingPreview } = useBroadcastPreview(audience);
  const createBroadcast = useCreateBroadcast();

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Escribe un mensaje');
      return;
    }
    try {
      const result = await createBroadcast.mutateAsync({ message, audience });
      toast.success(
        result.audienceCount > 0
          ? `Campaña en cola para ${result.audienceCount} paciente(s)`
          : 'No hay pacientes que coincidan con esta audiencia',
      );
      setOpen(false);
      setMessage('');
    } catch {
      toast.error('No se pudo enviar la campaña');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Megaphone className="mr-2 h-4 w-4" />
          Nueva campaña
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva campaña de WhatsApp</DialogTitle>
          <DialogDescription>
            Envía un mensaje a un grupo de pacientes. Se respeta la preferencia de cada
            paciente de recibir mensajes de WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Audiencia</Label>
            <Select
              value={audience}
              onValueChange={(value) => setAudience(value as BroadcastAudience)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {isLoadingPreview
                ? 'Calculando destinatarios…'
                : `${preview?.audienceCount ?? 0} paciente(s) recibirán este mensaje`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Mensaje</Label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ej. ¡Feliz cumpleaños! De parte de todo el equipo de la clínica te deseamos un excelente día 🎉"
              className="min-h-28"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={createBroadcast.isPending || (preview?.audienceCount ?? 0) === 0}
          >
            {createBroadcast.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar campaña
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
