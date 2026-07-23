import { ReportsService } from './reports.service';

function buildService(
  overrides: {
    appointments?: Array<{ status: string; _count: { _all: number } }>;
    payments?: Array<{ amount: number; receivedAt: Date; method: string }>;
    completedItems?: Array<{
      doctorId: string;
      doctor: { firstName: string; lastName: string };
      treatmentId: string;
      treatment: { name: string };
      price: number;
    }>;
    newPatients?: number;
    invoices?: Array<{ total: number; balanceDue: number }>;
  } = {},
) {
  const prisma = {
    appointment: {
      groupBy: jest.fn().mockResolvedValue(overrides.appointments ?? []),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue(overrides.payments ?? []),
    },
    treatmentPlanItem: {
      findMany: jest.fn().mockResolvedValue(overrides.completedItems ?? []),
    },
    patient: {
      count: jest.fn().mockResolvedValue(overrides.newPatients ?? 0),
    },
    invoice: {
      findMany: jest.fn().mockResolvedValue(overrides.invoices ?? []),
    },
  };

  const service = new ReportsService(prisma as never);
  return { service, prisma };
}

describe('ReportsService.getOverview date range', () => {
  it('defaults to the last 30 days ending now when no range is given', async () => {
    const { service } = buildService();
    const before = Date.now();

    const result = await service.getOverview('org-1');

    const to = new Date(result.range.to).getTime();
    const from = new Date(result.range.from).getTime();
    expect(to).toBeGreaterThanOrEqual(before);
    expect(to - from).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('uses the explicit from/to range when provided', async () => {
    const { service } = buildService();

    const result = await service.getOverview(
      'org-1',
      '2026-01-01T00:00:00Z',
      '2026-01-08T00:00:00Z',
    );

    expect(result.range.from).toBe('2026-01-01T00:00:00.000Z');
    expect(result.range.to).toBe('2026-01-08T00:00:00.000Z');
  });
});

describe('ReportsService.getOverview aggregations', () => {
  it('sums payments per calendar day and sorts revenueByDay ascending', async () => {
    const { service } = buildService({
      payments: [
        {
          amount: 100,
          receivedAt: new Date('2026-01-02T10:00:00Z'),
          method: 'CASH',
        },
        {
          amount: 50,
          receivedAt: new Date('2026-01-01T10:00:00Z'),
          method: 'CASH',
        },
        {
          amount: 25,
          receivedAt: new Date('2026-01-01T18:00:00Z'),
          method: 'CARD',
        },
      ],
    });

    const result = await service.getOverview('org-1');

    expect(result.revenueByDay).toEqual([
      { date: '2026-01-01', total: 75 },
      { date: '2026-01-02', total: 100 },
    ]);
    expect(result.kpis.totalRevenue).toBe(175);
  });

  it('aggregates revenueByDoctor and topTreatments from completed treatment items', async () => {
    const { service } = buildService({
      completedItems: [
        {
          doctorId: 'doc-1',
          doctor: { firstName: 'Ana', lastName: 'Diaz' },
          treatmentId: 'treat-1',
          treatment: { name: 'Limpieza' },
          price: 300,
        },
        {
          doctorId: 'doc-1',
          doctor: { firstName: 'Ana', lastName: 'Diaz' },
          treatmentId: 'treat-1',
          treatment: { name: 'Limpieza' },
          price: 300,
        },
        {
          doctorId: 'doc-2',
          doctor: { firstName: 'Luis', lastName: 'Perez' },
          treatmentId: 'treat-2',
          treatment: { name: 'Extraccion' },
          price: 500,
        },
      ],
    });

    const result = await service.getOverview('org-1');

    expect(result.revenueByDoctor).toEqual([
      { doctorId: 'doc-1', doctorName: 'Ana Diaz', total: 600, count: 2 },
      { doctorId: 'doc-2', doctorName: 'Luis Perez', total: 500, count: 1 },
    ]);
    expect(result.topTreatments).toEqual([
      { treatmentId: 'treat-1', name: 'Limpieza', count: 2, total: 600 },
      { treatmentId: 'treat-2', name: 'Extraccion', count: 1, total: 500 },
    ]);
  });

  it('computes cancellation and no-show rates as percentages', async () => {
    const { service } = buildService({
      appointments: [
        { status: 'COMPLETED', _count: { _all: 6 } },
        { status: 'CANCELLED', _count: { _all: 3 } },
        { status: 'NO_SHOW', _count: { _all: 1 } },
      ],
    });

    const result = await service.getOverview('org-1');

    expect(result.kpis.totalAppointments).toBe(10);
    expect(result.kpis.cancellationRate).toBe(30);
    expect(result.kpis.noShowRate).toBe(10);
  });

  it('reports 0% rates instead of dividing by zero when there are no appointments', async () => {
    const { service } = buildService({ appointments: [] });

    const result = await service.getOverview('org-1');

    expect(result.kpis.totalAppointments).toBe(0);
    expect(result.kpis.cancellationRate).toBe(0);
    expect(result.kpis.noShowRate).toBe(0);
  });

  it('sums invoice totals and outstanding balances for billed/pending KPIs', async () => {
    const { service } = buildService({
      invoices: [
        { total: 100, balanceDue: 40 },
        { total: 200, balanceDue: 0 },
      ],
    });

    const result = await service.getOverview('org-1');

    expect(result.kpis.totalBilled).toBe(300);
    expect(result.kpis.totalPending).toBe(40);
  });
});
