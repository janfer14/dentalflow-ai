import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { verify as otplibVerify } from 'otplib';
import { AuthService } from './auth.service';

jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));
jest.mock('otplib', () => ({
  verify: jest.fn(),
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
}));

function firstCallArg<T>(mockFn: { mock: { calls: unknown[][] } }): T {
  return mockFn.mock.calls[0]?.[0] as T;
}

function buildService(user: Record<string, unknown> | null) {
  const prisma = {
    user: {
      findFirst: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue({}),
      findUniqueOrThrow: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
  };
  const jwt = {
    signAsync: jest.fn().mockResolvedValue('signed-access-token'),
  };
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'jwt.accessSecret': 'access-secret',
        'jwt.accessExpiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return values[key];
    }),
  };

  const service = new AuthService(
    prisma as never,
    jwt as never,
    config as never,
  );
  return { service, prisma, jwt, config };
}

function buildUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    organizationId: 'org-1',
    email: 'doctor@dentalflow.ai',
    firstName: 'Ana',
    lastName: 'Diaz',
    isDoctor: true,
    passwordHash: 'hashed-password',
    failedLoginCount: 0,
    lockedUntil: null,
    twoFactorEnabled: false,
    twoFactorSecret: null,
    roles: [{ role: { name: 'DOCTOR' } }],
    ...overrides,
  };
}

describe('AuthService.validateCredentials', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when no user matches the email', async () => {
    const { service } = buildService(null);

    await expect(
      service.validateCredentials('nope@dentalflow.ai', 'whatever'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws without checking the password when the account is locked', async () => {
    const { service, prisma } = buildService(
      buildUser({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    await expect(
      service.validateCredentials('doctor@dentalflow.ai', 'whatever'),
    ).rejects.toThrow(ForbiddenException);
    expect(argon2.verify).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('increments failedLoginCount but does not lock before the 5th bad attempt', async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(false);
    const { service, prisma } = buildService(
      buildUser({ failedLoginCount: 2 }),
    );

    await expect(
      service.validateCredentials('doctor@dentalflow.ai', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { failedLoginCount: 3, lockedUntil: null },
    });
  });

  it('locks the account once failed attempts reach the threshold', async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(false);
    const { service, prisma } = buildService(
      buildUser({ failedLoginCount: 4 }),
    );

    await expect(
      service.validateCredentials('doctor@dentalflow.ai', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);

    const call = firstCallArg<{
      data: { failedLoginCount: number; lockedUntil: Date | null };
    }>(prisma.user.update);
    expect(call.data.failedLoginCount).toBe(5);
    expect(call.data.lockedUntil).toBeInstanceOf(Date);
    expect(call.data.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('requires a 2FA code when the account has 2FA enabled', async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    const { service } = buildService(
      buildUser({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' }),
    );

    await expect(
      service.validateCredentials('doctor@dentalflow.ai', 'correct-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid 2FA code', async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    (otplibVerify as jest.Mock).mockResolvedValue(false);
    const { service } = buildService(
      buildUser({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' }),
    );

    await expect(
      service.validateCredentials(
        'doctor@dentalflow.ai',
        'correct-password',
        '000000',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('logs in successfully, resetting failedLoginCount and lock state', async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    const { service, prisma } = buildService(
      buildUser({ failedLoginCount: 3, lockedUntil: null }),
    );

    const result = await service.validateCredentials(
      'doctor@dentalflow.ai',
      'correct-password',
    );

    expect(result.id).toBe('user-1');
    const call = firstCallArg<{
      where: { id: string };
      data: { failedLoginCount: number; lockedUntil: Date | null };
    }>(prisma.user.update);
    expect(call.where).toEqual({ id: 'user-1' });
    expect(call.data.failedLoginCount).toBe(0);
    expect(call.data.lockedUntil).toBeNull();
  });
});

describe('AuthService.refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a refresh token that does not exist', async () => {
    const { service, prisma } = buildService(null);
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.refresh('raw-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a revoked refresh token', async () => {
    const { service, prisma } = buildService(null);
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 100_000),
    });

    await expect(service.refresh('raw-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired refresh token', async () => {
    const { service, prisma } = buildService(null);
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(service.refresh('raw-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rotates a valid refresh token: revokes the old one and issues a new pair', async () => {
    const { service, prisma } = buildService(null);
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
    });

    const result = await service.refresh('raw-token', '127.0.0.1');

    const updateCall = firstCallArg<{
      where: { id: string };
      data: { revokedAt: Date };
    }>(prisma.refreshToken.update);
    expect(updateCall.where).toEqual({ id: 'rt-1' });
    expect(updateCall.data.revokedAt).toBeInstanceOf(Date);

    const createCall = firstCallArg<{
      data: { userId: string; createdByIp: string };
    }>(prisma.refreshToken.create);
    expect(createCall.data.userId).toBe('user-1');
    expect(createCall.data.createdByIp).toBe('127.0.0.1');

    expect(result.accessToken).toBe('signed-access-token');
    expect(typeof result.refreshToken).toBe('string');
  });
});

describe('AuthService.revokeRefreshToken', () => {
  it('revokes only the matching, not-yet-revoked token', async () => {
    const { service, prisma } = buildService(null);

    await service.revokeRefreshToken('raw-token');

    const call = firstCallArg<{
      where: { tokenHash: string; revokedAt: null };
      data: { revokedAt: Date };
    }>(prisma.refreshToken.updateMany);
    expect(typeof call.where.tokenHash).toBe('string');
    expect(call.where.revokedAt).toBeNull();
    expect(call.data.revokedAt).toBeInstanceOf(Date);
  });
});

describe('AuthService.updateProfile', () => {
  it('updates only the provided fields for the given user', async () => {
    const { service, prisma } = buildService(null);

    await service.updateProfile('user-1', { firstName: 'Nuevo' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { firstName: 'Nuevo' },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
  });
});

describe('AuthService.changePassword', () => {
  it('rehashes and saves the new password when the current one is valid', async () => {
    const { service, prisma } = buildService(null);
    prisma.user.findUniqueOrThrow.mockResolvedValue(buildUser());
    (argon2.verify as jest.Mock).mockResolvedValue(true);
    (argon2.hash as jest.Mock).mockResolvedValue('new-hash');

    await service.changePassword('user-1', 'old-pass', 'new-pass');

    expect(argon2.hash).toHaveBeenCalledWith('new-pass');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'new-hash' },
    });
  });

  it('rejects when the current password is wrong', async () => {
    const { service, prisma } = buildService(null);
    prisma.user.findUniqueOrThrow.mockResolvedValue(buildUser());
    (argon2.verify as jest.Mock).mockResolvedValue(false);

    await expect(
      service.changePassword('user-1', 'wrong', 'new-pass'),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('AuthService.disableTwoFactor', () => {
  it('clears the 2FA fields when the current password is valid', async () => {
    const { service, prisma } = buildService(null);
    prisma.user.findUniqueOrThrow.mockResolvedValue(
      buildUser({ twoFactorEnabled: true, twoFactorSecret: 'SECRET' }),
    );
    (argon2.verify as jest.Mock).mockResolvedValue(true);

    await service.disableTwoFactor('user-1', 'correct-pass');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  });

  it('rejects when the current password is wrong', async () => {
    const { service, prisma } = buildService(null);
    prisma.user.findUniqueOrThrow.mockResolvedValue(buildUser());
    (argon2.verify as jest.Mock).mockResolvedValue(false);

    await expect(service.disableTwoFactor('user-1', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
