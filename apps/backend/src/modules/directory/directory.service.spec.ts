import { NotFoundException } from '@nestjs/common';
import { DirectoryService } from './directory.service';

function firstCallArg<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  return mockFn.mock.calls[0]?.[0] as T;
}

function buildService() {
  const prisma = {
    clinic: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    treatment: { findMany: jest.fn().mockResolvedValue([]) },
  };

  const service = new DirectoryService(prisma as never);
  return { service, prisma };
}

// Regression guard: these queries are the multi-tenant boundary — losing the
// organizationId filter would leak another clinic's data.
describe('DirectoryService tenant scoping', () => {
  it('listClinics scopes by organizationId and excludes soft-deleted clinics', async () => {
    const { service, prisma } = buildService();

    await service.listClinics('org-1');

    const call = firstCallArg<{
      where: { organizationId: string; deletedAt: null };
    }>(prisma.clinic.findMany);
    expect(call.where.organizationId).toBe('org-1');
    expect(call.where.deletedAt).toBeNull();
  });

  it('listDoctors scopes by organizationId and only returns active doctors', async () => {
    const { service, prisma } = buildService();

    await service.listDoctors('org-1');

    const call = firstCallArg<{
      where: {
        organizationId: string;
        isDoctor: boolean;
        deletedAt: null;
        status: string;
      };
    }>(prisma.user.findMany);
    expect(call.where.organizationId).toBe('org-1');
    expect(call.where.isDoctor).toBe(true);
    expect(call.where.deletedAt).toBeNull();
    expect(call.where.status).toBe('ACTIVE');
  });

  it('listTreatments scopes by organizationId and only returns active treatments', async () => {
    const { service, prisma } = buildService();

    await service.listTreatments('org-1');

    const call = firstCallArg<{
      where: { organizationId: string; isActive: boolean };
    }>(prisma.treatment.findMany);
    expect(call.where.organizationId).toBe('org-1');
    expect(call.where.isActive).toBe(true);
  });

  it('updateClinic scopes the existence check by organizationId before writing', async () => {
    const { service, prisma } = buildService();
    prisma.clinic.findFirst.mockResolvedValue({
      id: 'clinic-1',
    });

    await service.updateClinic('org-1', 'clinic-1', { name: 'Nueva' });

    const findCall = firstCallArg<{
      where: { id: string; organizationId: string; deletedAt: null };
    }>(prisma.clinic.findFirst);
    expect(findCall.where).toEqual({
      id: 'clinic-1',
      organizationId: 'org-1',
      deletedAt: null,
    });
    expect(prisma.clinic.update).toHaveBeenCalledWith({
      where: { id: 'clinic-1' },
      data: { name: 'Nueva' },
    });
  });

  it('updateClinic rejects a clinic that belongs to another organization', async () => {
    const { service, prisma } = buildService();
    prisma.clinic.findFirst.mockResolvedValue(null);

    await expect(
      service.updateClinic('org-1', 'clinic-2', { name: 'X' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.clinic.update).not.toHaveBeenCalled();
  });
});
