import { NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';

function firstCallArg<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  return mockFn.mock.calls[0]?.[0] as T;
}

function buildService() {
  const prisma = {
    patient: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new PatientsService(prisma as never);
  return { service, prisma };
}

describe('PatientsService.findAll', () => {
  it('computes pagination offsets from page/pageSize', async () => {
    const { service, prisma } = buildService();

    await service.findAll('org-1', { page: 3, pageSize: 20 });

    const call = firstCallArg<{ skip: number; take: number }>(
      prisma.patient.findMany,
    );
    expect(call.skip).toBe(40);
    expect(call.take).toBe(20);
  });

  it('omits the OR search clause when no search term is given', async () => {
    const { service, prisma } = buildService();

    await service.findAll('org-1', { page: 1, pageSize: 10 });

    const call = firstCallArg<{
      where: { organizationId: string; deletedAt: null; OR?: unknown };
    }>(prisma.patient.findMany);
    expect(call.where.organizationId).toBe('org-1');
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.OR).toBeUndefined();
  });

  it('builds a case-insensitive OR clause across name/phone/email when searching', async () => {
    const { service, prisma } = buildService();

    await service.findAll('org-1', {
      page: 1,
      pageSize: 10,
      search: 'lopez',
    });

    const call = firstCallArg<{
      where: { OR: Array<Record<string, { contains: string }>> };
    }>(prisma.patient.findMany);
    const fields = call.where.OR.map((clause) => Object.keys(clause)[0]);
    expect(fields).toEqual(['firstName', 'lastName', 'phone', 'email']);
    expect(call.where.OR[0].firstName.contains).toBe('lopez');
  });

  it('reports totalPages rounded up from the total count', async () => {
    const { service, prisma } = buildService();
    prisma.patient.count.mockResolvedValue(45);

    const result = await service.findAll('org-1', {
      page: 1,
      pageSize: 20,
    });

    expect(result.totalPages).toBe(3);
  });
});

describe('PatientsService.findOne', () => {
  it('throws NotFoundException when no patient matches within the organization', async () => {
    const { service, prisma } = buildService();
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(service.findOne('org-1', 'patient-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('scopes the lookup by id, organizationId, and non-deleted', async () => {
    const { service, prisma } = buildService();
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });

    await service.findOne('org-1', 'patient-1');

    const call = firstCallArg<{
      where: { id: string; organizationId: string; deletedAt: null };
    }>(prisma.patient.findFirst);
    expect(call.where).toEqual({
      id: 'patient-1',
      organizationId: 'org-1',
      deletedAt: null,
    });
  });
});

describe('PatientsService.update', () => {
  it('rejects updating a patient outside the caller organization', async () => {
    const { service, prisma } = buildService();
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      service.update('org-1', 'patient-1', { firstName: 'Ana' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });
});

describe('PatientsService.remove', () => {
  it('rejects removing a patient outside the caller organization', async () => {
    const { service, prisma } = buildService();
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(service.remove('org-1', 'patient-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('soft-deletes by stamping deletedAt and clearing isActive', async () => {
    const { service, prisma } = buildService();
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    prisma.patient.update.mockResolvedValue({});

    await service.remove('org-1', 'patient-1');

    const call = firstCallArg<{
      where: { id: string };
      data: { deletedAt: Date; isActive: boolean };
    }>(prisma.patient.update);
    expect(call.where).toEqual({ id: 'patient-1' });
    expect(call.data.deletedAt).toBeInstanceOf(Date);
    expect(call.data.isActive).toBe(false);
  });
});
