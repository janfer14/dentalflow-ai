'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Lock, Unlock, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCashRegisters,
  useCashRegisterSessions,
  useCloseCashSession,
  useOpenCashSession,
} from '@/hooks/use-billing';

function currency(value: string | number) {
  return Number(value).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

export function CashRegisterPanel({ clinicId }: { clinicId: string }) {
  const { data: cashRegisters, isLoading } = useCashRegisters(clinicId);
  const register = cashRegisters?.[0];
  const openSessionData = register?.sessions[0];

  const { data: sessions } = useCashRegisterSessions(register?.id);
  const openSession = useOpenCashSession();
  const closeSession = useCloseCashSession();

  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('1000');
  const [closingAmount, setClosingAmount] = useState('');

  const handleOpen = async () => {
    if (!register) return;
    try {
      await openSession.mutateAsync({
        cashRegisterId: register.id,
        openingAmount: Number(openingAmount),
      });
      toast.success('Caja abierta');
      setOpenDialog(false);
    } catch {
      toast.error('No se pudo abrir la caja');
    }
  };

  const handleClose = async () => {
    if (!openSessionData) return;
    try {
      await closeSession.mutateAsync({
        sessionId: openSessionData.id,
        closingAmount: Number(closingAmount),
      });
      toast.success('Caja cerrada');
      setCloseDialog(false);
    } catch {
      toast.error('No se pudo cerrar la caja');
    }
  };

  if (isLoading || !register) {
    return null;
  }

  return (
    <div className="glass-panel elevated rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">{register.name}</p>
        </div>
        {openSessionData ? (
          <Button size="sm" variant="outline" onClick={() => setCloseDialog(true)}>
            <Lock className="mr-2 h-3.5 w-3.5" />
            Cerrar caja
          </Button>
        ) : (
          <Button size="sm" onClick={() => setOpenDialog(true)}>
            <Unlock className="mr-2 h-3.5 w-3.5" />
            Abrir caja
          </Button>
        )}
      </div>

      {openSessionData ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Abierta desde {new Date(openSessionData.openedAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}{' '}
          · Fondo inicial {currency(openSessionData.openingAmount)}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">La caja está cerrada.</p>
      )}

      {sessions && sessions.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3">
          <p className="text-xs font-medium text-muted-foreground">Últimos cortes</p>
          {sessions
            .filter((s) => s.closedAt)
            .slice(0, 3)
            .map((session) => (
              <div key={session.id} className="flex items-center justify-between text-xs">
                <span>{new Date(session.closedAt!).toLocaleDateString('es-MX')}</span>
                <span className={Number(session.difference) === 0 ? 'text-success' : 'text-warning'}>
                  Diferencia: {currency(session.difference ?? 0)}
                </span>
              </div>
            ))}
        </div>
      )}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Abrir caja</DialogTitle>
            <DialogDescription>Registra el fondo inicial en efectivo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Fondo inicial</Label>
            <Input
              type="number"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpen} disabled={openSession.isPending}>
              {openSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
            <DialogDescription>Cuenta el efectivo físico en caja.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Monto contado</Label>
            <Input
              type="number"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCloseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleClose} disabled={closeSession.isPending}>
              {closeSession.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cerrar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
