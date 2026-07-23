import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

function firstCallArg<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  return mockFn.mock.calls[0]?.[0] as T;
}

function buildService() {
  const prisma = {
    appointment: {
      create: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const whatsAppScheduler = {
    scheduleForNewAppointment: jest.fn().mockResolvedValue(undefined),
    notifyCancelled: jest.fn().mockResolvedValue(undefined),
    rescheduleForAppointment: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AppointmentsService(
    prisma as never,
    whatsAppScheduler as never,
  );
  return { service, prisma, whatsAppScheduler };
}

describe('AppointmentsService.create', () => {
  it('rejects when the end time is not after the start time', async () => {
    const { service, prisma } = buildService();

    await expect(
      service.create({
        doctorId: 'doctor-1',
        startsAt: '2026-01-05T10:00:00Z',
        endsAt: '2026-01-05T09:00:00Z',
      } as never),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  it('rejects when the doctor or room already has an overlapping appointment', async () => {
    const { service, prisma } = buildService();
    prisma.appointment.findFirst.mockResolvedValue({ id: 'existing-appt' });

    await expect(
      service.create({
        doctorId: 'doctor-1',
        startsAt: '2026-01-05T10:00:00Z',
        endsAt: '2026-01-05T11:00:00Z',
      } as never),
    ).rejects.toThrow(ConflictException);
    expect(prisma.appointment.create).not.toHaveBeenCalled();
  });

  it('creates the appointment and schedules WhatsApp reminders when there is no overlap', async () => {
    const { service, prisma, whatsAppScheduler } = buildService();
    prisma.appointment.create.mockResolvedValue({
      id: 'appt-1',
      startsAt: new Date('2026-01-05T10:00:00Z'),
    });

    const result = await service.create({
      doctorId: 'doctor-1',
      startsAt: '2026-01-05T10:00:00Z',
      endsAt: '2026-01-05T11:00:00Z',
    } as never);

    expect(result.id).toBe('appt-1');
    expect(whatsAppScheduler.scheduleForNewAppointment).toHaveBeenCalledWith(
      'appt-1',
      new Date('2026-01-05T10:00:00Z'),
    );
  });

  it('excludes CANCELLED/NO_SHOW appointments from the overlap check', async () => {
    const { service, prisma } = buildService();
    prisma.appointment.create.mockResolvedValue({ id: 'appt-1' });

    await service.create({
      doctorId: 'doctor-1',
      startsAt: '2026-01-05T10:00:00Z',
      endsAt: '2026-01-05T11:00:00Z',
    } as never);

    const call = firstCallArg<{ where: { status: { notIn: string[] } } }>(
      prisma.appointment.findFirst,
    );
    expect(call.where.status.notIn).toEqual(
      expect.arrayContaining(['CANCELLED', 'NO_SHOW']),
    );
  });
});

describe('AppointmentsService.findOne', () => {
  it('throws NotFoundException when the appointment does not exist', async () => {
    const { service, prisma } = buildService();
    prisma.appointment.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});

describe('AppointmentsService.update', () => {
  function existingAppointment(overrides: Record<string, unknown> = {}) {
    return {
      id: 'appt-1',
      doctorId: 'doctor-1',
      consultingRoomId: 'room-1',
      startsAt: new Date('2026-01-05T10:00:00Z'),
      endsAt: new Date('2026-01-05T11:00:00Z'),
      status: 'SCHEDULED',
      ...overrides,
    };
  }

  it('rejects when the resulting end time is not after the start time', async () => {
    const { service, prisma } = buildService();
    prisma.appointment.findUnique.mockResolvedValue(existingAppointment());

    await expect(
      service.update('appt-1', {
        startsAt: '2026-01-05T12:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('re-checks overlap when the time changes, excluding itself', async () => {
    const { service, prisma } = buildService();
    prisma.appointment.findUnique.mockResolvedValue(existingAppointment());
    prisma.appointment.update.mockResolvedValue({ id: 'appt-1' });

    await service.update('appt-1', {
      startsAt: '2026-01-05T14:00:00Z',
      endsAt: '2026-01-05T15:00:00Z',
    });

    const call = firstCallArg<{ where: { id: { not: string } } }>(
      prisma.appointment.findFirst,
    );
    expect(call.where.id).toEqual({ not: 'appt-1' });
  });

  it('does not re-check overlap when neither time, doctor, nor room changed', async () => {
    const { service, prisma } = buildService();
    prisma.appointment.findUnique.mockResolvedValue(existingAppointment());
    prisma.appointment.update.mockResolvedValue({ id: 'appt-1' });

    await service.update('appt-1', { notes: 'updated note' });

    expect(prisma.appointment.findFirst).not.toHaveBeenCalled();
  });

  it('notifies cancellation when status transitions to CANCELLED', async () => {
    const { service, prisma, whatsAppScheduler } = buildService();
    prisma.appointment.findUnique.mockResolvedValue(existingAppointment());
    prisma.appointment.update.mockResolvedValue({ id: 'appt-1' });

    await service.update('appt-1', { status: 'CANCELLED' } as never);

    expect(whatsAppScheduler.notifyCancelled).toHaveBeenCalledWith('appt-1');
  });

  it('does not notify cancellation again if already cancelled', async () => {
    const { service, prisma, whatsAppScheduler } = buildService();
    prisma.appointment.findUnique.mockResolvedValue(
      existingAppointment({ status: 'CANCELLED' }),
    );
    prisma.appointment.update.mockResolvedValue({ id: 'appt-1' });

    await service.update('appt-1', { status: 'CANCELLED' } as never);

    expect(whatsAppScheduler.notifyCancelled).not.toHaveBeenCalled();
  });

  it('notifies reschedule when the start time changes', async () => {
    const { service, prisma, whatsAppScheduler } = buildService();
    prisma.appointment.findUnique.mockResolvedValue(existingAppointment());
    prisma.appointment.update.mockResolvedValue({ id: 'appt-1' });

    await service.update('appt-1', {
      startsAt: '2026-01-06T10:00:00Z',
      endsAt: '2026-01-06T11:00:00Z',
    });

    expect(whatsAppScheduler.rescheduleForAppointment).toHaveBeenCalledWith(
      'appt-1',
      new Date('2026-01-06T10:00:00Z'),
    );
  });
});

describe('AppointmentsService.remove', () => {
  it('cancels the appointment and notifies when it was not already cancelled', async () => {
    const { service, prisma, whatsAppScheduler } = buildService();
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      status: 'SCHEDULED',
    });
    prisma.appointment.update.mockResolvedValue({});

    await service.remove('appt-1');

    expect(prisma.appointment.update).toHaveBeenCalledWith({
      where: { id: 'appt-1' },
      data: {
        status: 'CANCELLED',
        cancelReason: 'Eliminada por el usuario',
      },
    });
    expect(whatsAppScheduler.notifyCancelled).toHaveBeenCalledWith('appt-1');
  });

  it('does not notify again when the appointment was already cancelled', async () => {
    const { service, prisma, whatsAppScheduler } = buildService();
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      status: 'CANCELLED',
    });
    prisma.appointment.update.mockResolvedValue({});

    await service.remove('appt-1');

    expect(whatsAppScheduler.notifyCancelled).not.toHaveBeenCalled();
  });
});
