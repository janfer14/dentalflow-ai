import { PatientPortalService } from './patient-portal.service';

function buildService(patients: Array<{ id: string; phone: string | null }>) {
  const prisma = {
    patient: {
      findMany: jest.fn().mockResolvedValue(patients),
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
    },
  };
  const whatsapp = { sendTextMessage: jest.fn().mockResolvedValue(undefined) };
  const whatsAppScheduler = { notifyCancelled: jest.fn() };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
  const config = { get: jest.fn().mockReturnValue('secret') };

  const service = new PatientPortalService(
    prisma as never,
    whatsapp as never,
    whatsAppScheduler as never,
    jwt as never,
    config as never,
  );

  return { service, prisma, whatsapp };
}

describe('PatientPortalService.requestOtp', () => {
  // Regression test: stored phones include human formatting
  // ("+52 55 1234 5678"), so matching must normalize digits on both sides
  // instead of relying on a raw substring match — see the bug fixed in
  // findPatientByPhoneSuffix.
  it('finds a patient whose stored phone has spaces/formatting and sends the OTP', async () => {
    const { service, prisma, whatsapp } = buildService([
      { id: 'patient-1', phone: '+52 55 1234 5678' },
    ]);

    const result = await service.requestOtp('+52 55 1234 5678');

    expect(result).toEqual({ sent: true });
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'patient-1' } }),
    );
    expect(whatsapp.sendTextMessage).toHaveBeenCalledTimes(1);
  });

  it('matches even when the caller supplies a differently formatted phone', async () => {
    const { service, whatsapp } = buildService([
      { id: 'patient-1', phone: '5512345678' },
    ]);

    await service.requestOtp('+52 (55) 1234-5678');

    expect(whatsapp.sendTextMessage).toHaveBeenCalledTimes(1);
  });

  it('returns the generic response and sends nothing when no patient matches', async () => {
    const { service, whatsapp } = buildService([
      { id: 'patient-1', phone: '+52 55 9999 0000' },
    ]);

    const result = await service.requestOtp('+52 55 1234 5678');

    expect(result).toEqual({ sent: true });
    expect(whatsapp.sendTextMessage).not.toHaveBeenCalled();
  });
});
