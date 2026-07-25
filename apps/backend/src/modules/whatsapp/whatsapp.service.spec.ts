import { WhatsAppService } from './whatsapp.service';
import { BroadcastAudience } from './whatsapp.types';

function firstCallArg<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  return mockFn.mock.calls[0]?.[0] as T;
}

function buildService(
  patients: Array<{
    id: string;
    phone: string | null;
    birthDate?: Date | null;
  }>,
) {
  const prisma = {
    patient: {
      findMany: jest.fn().mockResolvedValue(patients),
      findUniqueOrThrow: jest.fn(),
    },
    message: { create: jest.fn().mockResolvedValue({}) },
  };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const broadcastQueue = { addBulk: jest.fn().mockResolvedValue([]) };

  const service = new WhatsAppService(
    prisma as never,
    config as never,
    broadcastQueue as never,
  );
  return { service, prisma, config, broadcastQueue };
}

function inboundEventPayload(from: string) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: 'wamid.1',
                  from,
                  timestamp: '1700000000',
                  type: 'text',
                  text: { body: 'Hola' },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe('WhatsAppService.handleWebhookEvent (inbound message matching)', () => {
  // Regression test: same bug class as the patient portal OTP lookup — stored
  // phones include formatting, so matching must normalize digits on both
  // sides instead of a raw SQL substring match.
  it('matches an inbound message to a patient whose stored phone has formatting', async () => {
    const { service, prisma } = buildService([
      { id: 'patient-1', phone: '+52 55 1234 5678' },
    ]);

    await service.handleWebhookEvent(inboundEventPayload('525512345678'));

    expect(prisma.message.create).toHaveBeenCalledTimes(1);
    const callArgs = firstCallArg<{ data: Record<string, unknown> }>(
      prisma.message.create,
    );
    expect(callArgs.data).toMatchObject({
      patientId: 'patient-1',
      direction: 'INBOUND',
    });
  });

  it('does not create a message when no patient matches the phone', async () => {
    const { service, prisma } = buildService([
      { id: 'patient-1', phone: '+52 55 9999 0000' },
    ]);

    await service.handleWebhookEvent(inboundEventPayload('525512345678'));

    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});

describe('WhatsAppService.resolveBroadcastAudience', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('ALL scopes by organization, active, opted-in, and phone present — no birthDate filter', async () => {
    const { service, prisma } = buildService([{ id: 'p1', phone: '+52 1' }]);

    await service.resolveBroadcastAudience('org-1', BroadcastAudience.ALL);

    const call = firstCallArg<{
      where: {
        organizationId: string;
        deletedAt: null;
        isActive: boolean;
        whatsappOptIn: boolean;
        phone: { not: null };
        birthDate?: unknown;
      };
    }>(prisma.patient.findMany);
    expect(call.where).toMatchObject({
      organizationId: 'org-1',
      deletedAt: null,
      isActive: true,
      whatsappOptIn: true,
      phone: { not: null },
    });
    expect(call.where.birthDate).toBeUndefined();
  });

  it('BIRTHDAY_TODAY matches only patients whose month/day equals today (UTC)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-15T12:00:00Z'));
    const { service } = buildService([
      {
        id: 'today',
        phone: '+52 1',
        birthDate: new Date('1990-03-15T00:00:00Z'),
      },
      {
        id: 'other-day',
        phone: '+52 2',
        birthDate: new Date('1990-03-16T00:00:00Z'),
      },
      { id: 'no-birthdate', phone: '+52 3', birthDate: null },
    ]);

    const result = await service.resolveBroadcastAudience(
      'org-1',
      BroadcastAudience.BIRTHDAY_TODAY,
    );

    expect(result.map((p) => p.id)).toEqual(['today']);
  });

  it('BIRTHDAY_WEEK matches birthdays in the next 7 days, wrapping across a year boundary', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-12-29T00:00:00Z'));
    const { service } = buildService([
      {
        id: 'in-range',
        phone: '+52 1',
        birthDate: new Date('1988-01-03T00:00:00Z'),
      },
      {
        id: 'out-of-range',
        phone: '+52 2',
        birthDate: new Date('1988-01-06T00:00:00Z'),
      },
    ]);

    const result = await service.resolveBroadcastAudience(
      'org-1',
      BroadcastAudience.BIRTHDAY_WEEK,
    );

    expect(result.map((p) => p.id)).toEqual(['in-range']);
  });
});

describe('WhatsAppService.createBroadcast', () => {
  it('enqueues one staggered job per audience member and reports the count', async () => {
    const { service, broadcastQueue } = buildService([
      { id: 'p1', phone: '+52 1' },
      { id: 'p2', phone: '+52 2' },
    ]);

    const result = await service.createBroadcast('org-1', {
      message: 'Promo de limpieza dental',
      audience: BroadcastAudience.ALL,
    });

    expect(result).toEqual({ audienceCount: 2 });
    const jobs = firstCallArg<
      Array<{
        data: { patientId: string; body: string };
        opts: { delay: number };
      }>
    >(broadcastQueue.addBulk);
    expect(jobs).toHaveLength(2);
    expect(jobs[0].data).toEqual({
      patientId: 'p1',
      body: 'Promo de limpieza dental',
    });
    expect(jobs[1].data).toEqual({
      patientId: 'p2',
      body: 'Promo de limpieza dental',
    });
    expect(jobs[1].opts.delay).toBeGreaterThan(jobs[0].opts.delay);
  });

  it('does not enqueue anything when the audience is empty', async () => {
    const { service, broadcastQueue } = buildService([]);

    const result = await service.createBroadcast('org-1', {
      message: 'Hola',
      audience: BroadcastAudience.ALL,
    });

    expect(result).toEqual({ audienceCount: 0 });
    expect(broadcastQueue.addBulk).toHaveBeenCalledWith([]);
  });
});
