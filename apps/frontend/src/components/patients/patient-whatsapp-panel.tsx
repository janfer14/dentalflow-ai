'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MessageCircle, Send, Loader2, Check, CheckCheck, Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePatientMessages, useSendWhatsAppMessage } from '@/hooks/use-whatsapp';
import { cn } from '@/lib/utils';
import type { MessageStatus } from '@/types/api';

function StatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'READ':
      return <CheckCheck className="h-3 w-3 text-primary" />;
    case 'DELIVERED':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case 'SENT':
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case 'FAILED':
      return <X className="h-3 w-3 text-destructive" />;
    default:
      return <Clock className="h-3 w-3 text-muted-foreground" />;
  }
}

export function PatientWhatsAppPanel({ patientId }: { patientId: string }) {
  const { data: messages, isLoading } = usePatientMessages(patientId);
  const sendMessage = useSendWhatsAppMessage(patientId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    try {
      await sendMessage.mutateAsync(draft.trim());
      setDraft('');
    } catch {
      toast.error('No se pudo enviar el mensaje');
    }
  };

  return (
    <div className="glass-panel elevated rounded-2xl p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </h2>

      <div
        ref={scrollRef}
        className="flex max-h-80 min-h-40 flex-col gap-2 overflow-y-auto rounded-xl bg-secondary/30 p-3"
      >
        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Cargando mensajes...</p>
        ) : messages && messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex',
                message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3 py-2 text-xs',
                  message.direction === 'OUTBOUND'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border border-border/60',
                )}
              >
                <p>{message.body}</p>
                <div
                  className={cn(
                    'mt-1 flex items-center gap-1 text-[10px] opacity-70',
                    message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start',
                  )}
                >
                  <span>
                    {new Date(message.createdAt).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {message.direction === 'OUTBOUND' && <StatusIcon status={message.status} />}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Sin mensajes de WhatsApp aún.
          </p>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <Button type="submit" size="icon" disabled={sendMessage.isPending || !draft.trim()}>
          {sendMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
