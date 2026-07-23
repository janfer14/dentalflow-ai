import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { verify as otplibVerify } from 'otplib';
import { AuthService } from './auth.service';

jest.mock('argon2', () => ({
  verify: jest.fn(),
}));
jest.mock('otplib', () => ({
  verify: jest.fn(),
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
}));

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

    const call = prisma.user.update.mock.calls[0][0] as {
      data: { failedLoginCount: number; lockedUntil: Date | null };
    };
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
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        failedLoginCount: 0,
        lockedUntil: null,
      }),
    });
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

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          createdByIp: '127.0.0.1',
        }),
      }),
    );
    expect(result).toEqual({
      accessToken: 'signed-access-token',
      refreshToken: expect.any(String),
    });
  });
});

describe('AuthService.revokeRefreshToken', () => {
  it('revokes only the matching, not-yet-revoked token', async () => {
    const { service, prisma } = buildService(null);

    await service.revokeRefreshToken('raw-token');

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: expect.any(String), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
