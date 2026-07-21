'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortalAuth } from '@/contexts/portal-auth-context';

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : (message ?? fallback);
  }
  return fallback;
}

export default function PortalLoginPage() {
  const { requestOtp, verifyOtp } = usePortalAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await requestOtp(phone);
      setStep('code');
      toast.success('Te enviamos un código de acceso por WhatsApp');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'No se pudo enviar el código'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await verifyOtp(phone, code);
      toast.success('¡Bienvenido de nuevo!');
    } catch (error) {
      toast.error(extractErrorMessage(error, 'Código inválido o expirado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[10%] h-[28rem] w-[28rem] rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel w-full max-w-sm rounded-3xl p-8"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-400 text-primary-foreground shadow-lg shadow-primary/25">
            {step === 'phone' ? (
              <MessageCircle className="h-6 w-6" />
            ) : (
              <ShieldCheck className="h-6 w-6" />
            )}
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Portal del Paciente</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 'phone'
              ? 'Ingresa tu número de WhatsApp para acceder'
              : `Ingresa el código que enviamos a ${phone}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Número de WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+52 55 1234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar código
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código de 6 dígitos</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className="text-center text-lg tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || code.length !== 6}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Verificar e ingresar
            </Button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Usar otro número
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
