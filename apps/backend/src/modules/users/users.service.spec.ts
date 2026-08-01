import { NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from './users.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-temp-password'),
}));

function firstCallArg<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  return mockFn.mock.calls[0]?.[0] as T;
}

function buildService() {
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'user-2',
        firstName: 'Nuevo',
        lastName: 'Doctor',
        email: 'nuevo@dentalflow.ai',
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    role: { findMany: jest.fn().mockResolvedValue([]) },
    userRole: {
      deleteMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const service = new UsersService(prisma as never);
  return { service, prisma };
}

describe('UsersService tenant scoping', () => {
  it('listUsers scopes by organizationId and excludes soft-deleted users', async () => {
    const { service, prisma } = buildService();

    await service.listUsers('org-1');

    const call = firstCallArg<{
      where: { organizationId: string; deletedAt: null };
    }>(prisma.user.findMany);
    expect(call.where.organizationId).toBe('org-1');
    expect(call.where.deletedAt).toBeNull();
  });

  it('listRoles scopes by organizationId', async () => {
    const { service, prisma } = buildService();

    await service.listRoles('org-1');

    const call = firstCallArg<{ where: { organizationId: string } }>(
      prisma.role.findMany,
    );
    expect(call.where.organizationId).toBe('org-1');
  });
});

describe('UsersService.createUser', () => {
  it('hashes a generated temporary password and returns it once in the response', async () => {
    const { service } = buildService();

    const result = await service.createUser('org-1', {
      firstName: 'Nuevo',
      lastName: 'Doctor',
      email: 'nuevo@dentalflow.ai',
      roleId: 'role-1',
      clinicId: 'clinic-1',
    });

    expect(argon2.hash).toHaveBeenCalled();
    expect(typeof result.temporaryPassword).toBe('string');
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(8);
    expect(result.user.email).toBe('nuevo@dentalflow.ai');
  });

  it('links the new user to the given role and clinic', async () => {
    const { service, prisma } = buildService();

    await service.createUser('org-1', {
      firstName: 'Nuevo',
      lastName: 'Doctor',
      email: 'nuevo@dentalflow.ai',
      roleId: 'role-1',
      clinicId: 'clinic-1',
    });

    const call = firstCallArg<{
      data: {
        organizationId: string;
        roles: { create: { roleId: string } };
        clinics: { create: { clinicId: string } };
      };
    }>(prisma.user.create);
    expect(call.data.organizationId).toBe('org-1');
    expect(call.data.roles.create.roleId).toBe('role-1');
    expect(call.data.clinics.create.clinicId).toBe('clinic-1');
  });
});

describe('UsersService.updateUser', () => {
  it('rejects a user that belongs to another organization', async () => {
    const { service, prisma } = buildService();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.updateUser('org-1', 'user-2', { isDoctor: true }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('replaces the role assignment when roleId is provided', async () => {
    const { service, prisma } = buildService();
    prisma.user.findFirst.mockResolvedValue({ id: 'user-2' });

    await service.updateUser('org-1', 'user-2', { roleId: 'role-2' });

    expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-2' },
    });
    expect(prisma.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'user-2', roleId: 'role-2' },
    });
  });
});
