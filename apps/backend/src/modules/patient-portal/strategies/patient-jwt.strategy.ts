import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthenticatedPatient } from '../types/authenticated-patient.type';

interface PatientAccessTokenPayload {
  sub: string;
  type: 'patient';
}

@Injectable()
export class PatientJwtStrategy extends PassportStrategy(
  Strategy,
  'patient-jwt',
) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.patientAccessSecret')!,
    });
  }

  async validate(
    payload: PatientAccessTokenPayload,
  ): Promise<AuthenticatedPatient> {
    if (payload.type !== 'patient') {
      throw new UnauthorizedException('Token inválido');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: payload.sub },
    });

    if (!patient || patient.deletedAt || !patient.isActive) {
      throw new UnauthorizedException('Paciente inactivo o inexistente');
    }

    return {
      id: patient.id,
      organizationId: patient.organizationId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
    };
  }
}
