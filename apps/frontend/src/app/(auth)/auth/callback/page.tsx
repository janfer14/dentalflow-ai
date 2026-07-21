'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function OAuthCallbackPage() {
  const { completeOAuthLogin } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      // One-time parse of the OAuth redirect's query params, only reachable
      // client-side — not a derived-state sync the lint rule is meant to catch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('No se recibieron credenciales de Google.');
      setTimeout(() => router.replace('/login'), 2000);
      return;
    }

    completeOAuthLogin(accessToken, refreshToken).catch(() => {
      setError('No se pudo completar el inicio de sesión.');
      setTimeout(() => router.replace('/login'), 2000);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">
        {error ?? 'Completando inicio de sesión con Google...'}
      </p>
    </div>
  );
}
