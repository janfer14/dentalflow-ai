import { NotFoundException } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';

function firstCallArg<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  return mockFn.mock.calls[0]?.[0] as T;
}

function buildService() {
  const prisma = {
    treatment: {
      create: jest.fn().mockResolvedValue({ id: 'treatment-1' }),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const service = new TreatmentsService(prisma as never);
  return { service, prisma };
}

describe('TreatmentsService.createTreatment', () => {
  it('scopes the new treatment to the caller organization and applies defaults', async () => {
    const { service, prisma } = buildService();

    await service.createTreatment('org-1', {
      name: 'Resina',
      defaultPrice: 500,
    });

    const call = firstCallArg<{
      data: {
        organizationId: string;
        defaultCost: number;
        durationMinutes: number;
      };
    }>(prisma.treatment.create);
    expect(call.data.organizationId).toBe('org-1');
    expect(call.data.defaultCost).toBe(0);
    expect(call.data.durationMinutes).toBe(30);
  });
});

describe('TreatmentsService.updateTreatment', () => {
  it('rejects a treatment that belongs to another organization', async () => {
    const { service, prisma } = buildService();
    prisma.treatment.findFirst.mockResolvedValue(null);

    await expect(
      service.updateTreatment('org-1', 'treatment-2', { defaultPrice: 600 }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.treatment.update).not.toHaveBeenCalled();
  });

  it('updates an existing treatment scoped by organization', async () => {
    const { service, prisma } = buildService();
    prisma.treatment.findFirst.mockResolvedValue({ id: 'treatment-1' });

    await service.updateTreatment('org-1', 'treatment-1', {
      defaultPrice: 600,
    });

    expect(prisma.treatment.update).toHaveBeenCalledWith({
      where: { id: 'treatment-1' },
      data: { defaultPrice: 600 },
    });
  });
});
