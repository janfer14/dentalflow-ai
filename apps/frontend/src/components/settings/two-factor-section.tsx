'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import {
  useDisableTwoFactor,
  useEnableTwoFactor,
  useGenerateTwoFactor,
} from '@/hooks/use-account';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}

export function TwoFactorSection() {
  const { user, refreshUser } = useAuth();
  const generateTwoFactor = useGenerateTwoFactor();
  const enableTwoFactor = useEnableTwoFactor();
  const disableTwoFactor = useDisableTwoFactor();

  const [step, setStep] = useState<'idle' | 'setup' | 'disable'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const startSetup = async () => {
    try {
      const result = await generateTwoFactor.mutateAsync();
      setQrDataUrl(result.qrDataUrl);
      setStep('setup');
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo generar el código QR'));
    }
  };

  const confirmSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await enableTwoFactor.mutateAsync(code);
      toast.success('Doble factor activado');
      setStep('idle');
      setCode('');
      setQrDataUrl(null);
      await refreshUser();
    } catch (error) {
      toast.error(errorMessage(error, 'Código inválido'));
    }
  };

  const confirmDisable = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await disableTwoFactor.mutateAsync({ currentPassword: password });
      toast.success('Doble factor desactivado');
      setStep('idle');
      setPassword('');
      await refreshUser();
    } catch (error) {
      toast.error(errorMessage(error, 'Contraseña incorrecta'));
    }
  };

  if (step === 'setup') {
    return (
      <form onSubmit={confirmSetup} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Escanea el código con tu app de autenticación y escribe el código de 6 dígitos.
        </p>
        {qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- dynamically generated data: URL, not an optimizable static asset
          <img src={qrDataUrl} alt="Código QR de doble factor" width={180} height={180} className="rounded-lg" />
        )}
        <div className="space-y-1.5">
          <Label htmlFor="totp-code">Código</Label>
          <Input
            id="totp-code"
            required
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setStep('idle')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enableTwoFactor.isPending}>
            {enableTwoFactor.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </form>
    );
  }

  if (step === 'disable') {
    return (
      <form onSubmit={confirmDisable} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="disable-2fa-password">Contraseña actual</Label>
          <Input
            id="disable-2fa-password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setStep('idle')}>
            Cancelar
          </Button>
          <Button type="submit" variant="destructive" disabled={disableTwoFactor.isPending}>
            {disableTwoFactor.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Desactivar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {user?.twoFactorEnabled ? (
          <ShieldCheck className="h-4 w-4 text-success" />
        ) : (
          <ShieldOff className="h-4 w-4 text-muted-foreground" />
        )}
        <Badge variant={user?.twoFactorEnabled ? 'default' : 'secondary'}>
          {user?.twoFactorEnabled ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>
      {user?.twoFactorEnabled ? (
        <Button type="button" variant="ghost" onClick={() => setStep('disable')}>
          Desactivar
        </Button>
      ) : (
        <Button type="button" onClick={startSetup} disabled={generateTwoFactor.isPending}>
          {generateTwoFactor.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Activar
        </Button>
      )}
    </div>
  );
}
