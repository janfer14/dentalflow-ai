'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, ShieldCheck } from 'lucide-react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_no_account:
    'No existe una cuenta activa en DentalFlow AI con ese correo de Google. Contacta a tu administrador.',
  oauth_no_email: 'No se pudo obtener tu correo desde Google.',
};

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@dentalflow.ai');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    if (errorCode) {
      toast.error(OAUTH_ERROR_MESSAGES[errorCode] ?? 'No se pudo iniciar sesión con Google');
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password, twoFactorCode || undefined);
    } catch (error) {
      if (error instanceof AxiosError) {
        const message = error.response?.data?.message;
        if (typeof message === 'string' && message.toLowerCase().includes('doble factor')) {
          setNeedsTwoFactor(true);
          toast.info('Ingresa tu código de verificación en dos pasos');
        } else {
          toast.error(
            Array.isArray(message) ? message.join(', ') : message ?? 'No se pudo iniciar sesión',
          );
        }
      } else {
        toast.error('No se pudo iniciar sesión');
      }
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
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">DentalFlow AI Enterprise</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inicia sesión para gestionar tu clínica
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="doctor@clinica.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>

          {needsTwoFactor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <Label htmlFor="twoFactorCode" className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Código de verificación
              </Label>
              <Input
                id="twoFactorCode"
                inputMode="numeric"
                maxLength={6}
                value={twoFactorCode}
                onChange={(event) => setTwoFactorCode(event.target.value)}
                placeholder="123456"
              />
            </motion.div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar sesión
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground">o continúa con</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/auth/google`}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path
              fill="#4285F4"
              d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.93H1.3v3.1A11.998 11.998 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.31 14.31A7.2 7.2 0 0 1 4.93 12c0-.8.14-1.58.38-2.31v-3.1H1.3A12 12 0 0 0 0 12c0 1.94.46 3.77 1.3 5.41l4.01-3.1Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.3 6.59l4.01 3.1C6.25 6.85 8.89 4.75 12 4.75Z"
            />
          </svg>
          Continuar con Google
        </a>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          admin@dentalflow.ai · doctor@dentalflow.ai · recepcion@dentalflow.ai
          <br />
          contraseña demo: DentalFlow123!
        </p>
      </motion.div>
    </div>
  );
}
