'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  useAiConversation,
  useAiConversations,
  useAiStatus,
  useCreateAiConversation,
  useSendAiMessage,
} from '@/hooks/use-ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Busca al paciente Mariana López',
  '¿Qué citas hay en los próximos 7 días?',
  '¿Qué pacientes no han venido en los últimos 6 meses?',
  'Muéstrame los tratamientos disponibles',
];

export default function AsistentePage() {
  const { data: status } = useAiStatus();
  const { data: conversations, isLoading: loadingConversations } = useAiConversations();
  const createConversation = useCreateAiConversation();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const { data: conversation, isLoading: loadingConversation } = useAiConversation(activeId);
  const sendMessage = useSendAiMessage(activeId ?? '');
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadingConversations && conversations) {
      if (conversations.length > 0 && !activeId) {
        // Selecting the most recent conversation once the list loads isn't a
        // derived-render value — activeId also changes from user clicks and
        // must stay independently settable, so it has to live in state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveId(conversations[0].id);
      } else if (conversations.length === 0 && !createConversation.isPending) {
        createConversation.mutateAsync({}).then((conv) => setActiveId(conv.id));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingConversations, conversations]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation?.messages.length]);

  const handleNewConversation = async () => {
    const conv = await createConversation.mutateAsync({});
    setActiveId(conv.id);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || !activeId) return;
    setDraft('');
    try {
      await sendMessage.mutateAsync(text.trim());
    } catch {
      toast.error('No se pudo enviar el mensaje');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="hidden w-64 shrink-0 flex-col gap-2 lg:flex">
        <Button variant="outline" size="sm" onClick={handleNewConversation}>
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          Nueva conversación
        </Button>
        <div className="glass-panel flex-1 overflow-y-auto rounded-2xl p-2">
          {loadingConversations ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            conversations?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={cn(
                  'block w-full rounded-xl px-3 py-2.5 text-left text-xs transition-colors',
                  conv.id === activeId
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary/60',
                )}
              >
                <p className="truncate font-medium">
                  {conv.messages[0]?.content ?? 'Nueva conversación'}
                </p>
                <p className="mt-0.5 text-[10px] opacity-70">
                  {new Date(conv.createdAt).toLocaleDateString('es-MX')}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="glass-panel elevated flex flex-1 flex-col rounded-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-400 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">DentalFlow AI</p>
              <p className="text-[11px] text-muted-foreground">{status?.model}</p>
            </div>
          </div>
          {status && (
            <Badge
              variant="secondary"
              className={cn(
                'gap-1',
                status.configured ? 'text-success' : 'text-warning',
              )}
            >
              {status.configured ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {status.configured ? 'Conectado' : 'Sandbox'}
            </Badge>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
          {loadingConversation ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-2/3 rounded-2xl" />
              <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
            </div>
          ) : conversation && conversation.messages.length > 0 ? (
            conversation.messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/60 text-foreground',
                  )}
                >
                  {message.content}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">¿En qué te ayudo hoy?</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Pregúntame sobre pacientes, citas o tratamientos. Uso datos reales de tu clínica
                para responder.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sendMessage.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-secondary/60 px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Pensando...
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSend(draft);
          }}
          className="flex gap-2 border-t border-border/60 p-4"
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={!activeId || sendMessage.isPending}
          />
          <Button type="submit" size="icon" disabled={!draft.trim() || sendMessage.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
