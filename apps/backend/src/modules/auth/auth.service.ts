import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import * as qrcode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from './types/authenticated-user.type';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateCredentials(
    email: string,
    password: string,
    twoFactorCode?: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        'Cuenta bloqueada temporalmente por intentos fallidos',
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);

    if (!passwordValid) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockedUntil =
        failedLoginCount >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount, lockedUntil },
      });

      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new UnauthorizedException('Se requiere código de doble factor');
      }
      const valid = await verify({
        token: twoFactorCode,
        secret: user.twoFactorSecret!,
      });
      if (!valid) {
        throw new UnauthorizedException('Código de doble factor inválido');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    return user;
  }

  toAuthenticatedUser(
    user: Awaited<ReturnType<AuthService['validateCredentials']>>,
  ): AuthenticatedUser {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isDoctor: user.isDoctor,
      roles: user.roles.map((r) => r.role.name),
    };
  }

  async loginWithOAuthEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null, status: 'ACTIVE' },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException(
        'No existe una cuenta activa en DentalFlow AI con este correo. Contacta a tu administrador.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id);
    return { user: this.toAuthenticatedUser(user), ...tokens };
  }

  async issueTokens(userId: string, ipAddress?: string) {
    const accessToken = await this.jwt.signAsync({ sub: userId }, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    } as JwtSignOptions);

    const rawRefreshToken = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresInMs = this.parseDurationToMs(
      this.config.get<string>('jwt.refreshExpiresIn') ?? '7d',
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + expiresInMs),
        createdByIp: ipAddress,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async refresh(rawRefreshToken: string, ipAddress?: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(existing.userId, ipAddress);
  }

  async revokeRefreshToken(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async generateTwoFactorSecret(userId: string, email: string) {
    const secret = generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });
    const otpauth = generateURI({
      issuer: 'DentalFlow AI',
      label: email,
      secret,
    });
    const qrDataUrl = await qrcode.toDataURL(otpauth);
    return { secret, qrDataUrl };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.twoFactorSecret) {
      throw new ForbiddenException('Primero genera un secreto de doble factor');
    }
    const valid = await verify({ token: code, secret: user.twoFactorSecret });
    if (!valid) {
      throw new UnauthorizedException('Código inválido');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationToMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
      match[2]
    ]!;
    return value * unitMs;
  }
}
