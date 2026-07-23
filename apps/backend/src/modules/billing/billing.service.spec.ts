import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BillingService } from './billing.service';

function buildService() {
  const prisma = {
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn().mockResolvedValue({}),
      aggregate: jest.fn(),
    },
    cashRegisterSession: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    cashRegister: {
      findMany: jest.fn(),
    },
  };

  const service = new BillingService(prisma as never);
  return { service, prisma };
}

describe('BillingService.createInvoice', () => {
  it('computes subtotal, tax, and total rounded to 2 decimals', async () => {
    const { service, prisma } = buildService();
    prisma.invoice.create.mockResolvedValue({});

    await service.createInvoice({
      patientId: 'patient-1',
      taxRate: 0.16,
      items: [
        { description: 'Limpieza', quantity: 1, unitPrice: 333.333 },
        { description: 'Consulta', quantity: 2, unitPrice: 100 },
      ],
    } as never);

    const call = prisma.invoice.create.mock.calls[0][0] as {
      data: { subtotal: number; tax: number; total: number; balanceDue: number };
    };
    expect(call.data.subtotal).toBe(533.33);
    expect(call.data.tax).toBe(85.33);
    expect(call.data.total).toBe(618.66);
    expect(call.data.balanceDue).toBe(618.66);
  });
});

describe('BillingService.registerPayment', () => {
  function invoice(overrides: Record<string, unknown> = {}) {
    return {
      id: 'invoice-1',
      status: 'ISSUED',
      balanceDue: 100,
      ...overrides,
    };
  }

  it('rejects payment on an already paid invoice', async () => {
    const { service, prisma } = buildService();
    prisma.invoice.findUnique.mockResolvedValue(invoice({ status: 'PAID' }));

    await expect(
      service.registerPayment('invoice-1', { amount: 10 } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects payment on a void invoice', async () => {
    const { service, prisma } = buildService();
    prisma.invoice.findUnique.mockResolvedValue(invoice({ status: 'VOID' }));

    await expect(
      service.registerPayment('invoice-1', { amount: 10 } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects when a cash register is specified but has no open session', async () => {
    const { service, prisma } = buildService();
    prisma.invoice.findUnique.mockResolvedValue(invoice());
    prisma.cashRegisterSession.findFirst.mockResolvedValue(null);

    await expect(
      service.registerPayment('invoice-1', {
        amount: 10,
        cashRegisterId: 'register-1',
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('rejects a payment amount that exceeds the outstanding balance', async () => {
    const { service, prisma } = buildService();
    prisma.invoice.findUnique.mockResolvedValue(invoice({ balanceDue: 50 }));

    await expect(
      service.registerPayment('invoice-1', { amount: 50.02 } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('marks the invoice PARTIALLY_PAID when the balance is not fully covered', async () => {
    const { service, prisma } = buildService();
    prisma.invoice.findUnique.mockResolvedValue(invoice({ balanceDue: 100 }));
    prisma.invoice.update.mockResolvedValue({});

    await service.registerPayment('invoice-1', { amount: 40 } as never);

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: { balanceDue: 60, status: 'PARTIALLY_PAID' },
      include: { items: true, payments: true, patient: true },
    });
  });

  it('marks the invoice PAID and clamps balance at 0 when fully covered', async () => {
    const { service, prisma } = buildService();
    prisma.invoice.findUnique.mockResolvedValue(invoice({ balanceDue: 100 }));
    prisma.invoice.update.mockResolvedValue({});

    await service.registerPayment('invoice-1', { amount: 100 } as never);

    expect(prisma.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: { balanceDue: 0, status: 'PAID' },
      include: { items: true, payments: true, patient: true },
    });
  });
});

describe('BillingService cash sessions', () => {
  it('openSession rejects when the register already has an open session', async () => {
    const { service, prisma } = buildService();
    prisma.cashRegisterSession.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.openSession('user-1', {
        cashRegisterId: 'register-1',
        openingAmount: 500,
      } as never),
    ).rejects.toThrow(ConflictException);
    expect(prisma.cashRegisterSession.create).not.toHaveBeenCalled();
  });

  it('openSession creates a session when none is open', async () => {
    const { service, prisma } = buildService();
    prisma.cashRegisterSession.findFirst.mockResolvedValue(null);
    prisma.cashRegisterSession.create.mockResolvedValue({ id: 'new-session' });

    await service.openSession('user-1', {
      cashRegisterId: 'register-1',
      openingAmount: 500,
    } as never);

    expect(prisma.cashRegisterSession.create).toHaveBeenCalledWith({
      data: { cashRegisterId: 'register-1', userId: 'user-1', openingAmount: 500 },
    });
  });

  it('closeSession throws NotFoundException when the session does not exist', async () => {
    const { service, prisma } = buildService();
    prisma.cashRegisterSession.findUnique.mockResolvedValue(null);

    await expect(
      service.closeSession('session-1', { closingAmount: 500 } as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('closeSession throws BadRequestException when already closed', async () => {
    const { service, prisma } = buildService();
    prisma.cashRegisterSession.findUnique.mockResolvedValue({
      id: 'session-1',
      closedAt: new Date(),
    });

    await expect(
      service.closeSession('session-1', { closingAmount: 500 } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('closeSession computes expectedAmount and difference from cash payments', async () => {
    const { service, prisma } = buildService();
    const openedAt = new Date('2026-01-01T08:00:00Z');
    prisma.cashRegisterSession.findUnique.mockResolvedValue({
      id: 'session-1',
      cashRegisterId: 'register-1',
      closedAt: null,
      openingAmount: 500,
      openedAt,
    });
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: 320.5 } });
    prisma.cashRegisterSession.update.mockResolvedValue({});

    await service.closeSession('session-1', { closingAmount: 800 } as never);

    expect(prisma.payment.aggregate).toHaveBeenCalledWith({
      where: {
        cashRegisterId: 'register-1',
        method: 'CASH',
        receivedAt: { gte: openedAt },
      },
      _sum: { amount: true },
    });
    expect(prisma.cashRegisterSession.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: {
        closedAt: expect.any(Date),
        closingAmount: 800,
        expectedAmount: 820.5,
        difference: -20.5,
      },
    });
  });
});
