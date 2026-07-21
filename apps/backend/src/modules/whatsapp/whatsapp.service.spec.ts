import { WhatsAppService } from './whatsapp.service';

function buildService(patients: Array<{ id: string; phone: string | null }>) {
  const prisma = {
    patient: { findMany: jest.fn().mockResolvedValue(patients) },
    message: { create: jest.fn().mockResolvedValue({}) },
  };
  const config = { get: jest.fn().mockReturnValue(undefined) };

  const service = new WhatsAppService(prisma as never, config as never);
  return { service, prisma };
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
    const [callArgs] = prisma.message.create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
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
