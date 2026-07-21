import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { createHash, randomInt } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppSchedulerService } from '../whatsapp/whatsapp-scheduler.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import type { AuthenticatedPatient } from './types/authenticated-patient.type';

const OTP_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class PatientPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly whatsAppScheduler: WhatsAppSchedulerService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private normalizePhone(phone: string) {
    return phone.replace(/[^\d]/g, '').slice(-10);
  }

  private hashCode(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }

  // `phone` is stored with human formatting ("+52 55 1234 5678"), so a
  // digit-only suffix can never match via a SQL `contains` on the raw
  // string. Fetch the (small, phase-1-scale) candidate set and compare
  // normalized digits in application code instead.
  private async findPatientByPhoneSuffix(suffix: string) {
    const candidates = await this.prisma.patient.findMany({
      where: { phone: { not: null }, isActive: true, deletedAt: null },
    });
    return (
      candidates.find(
        (p) => p.phone && this.normalizePhone(p.phone).endsWith(suffix),
      ) ?? null
    );
  }

  async requestOtp(phone: string) {
    const suffix = this.normalizePhone(phone);
    const patient = await this.findPatientByPhoneSuffix(suffix);

    // Always return a generic response to avoid confirming whether a phone
    // number is registered (prevents enumeration).
    if (!patient) {
      return { sent: true };
    }

    const code = randomInt(100000, 999999).toString();

    await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        portalOtpHash: this.hashCode(code),
        portalOtpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await this.whatsapp.sendTextMessage(
      patient.id,
      `Tu código de acceso al Portal del Paciente de DentalFlow AI es: ${code}. Vence en 10 minutos.`,
    );

    return { sent: true };
  }

  async verifyOtp(phone: string, code: string) {
    const suffix = this.normalizePhone(phone);
    const patient = await this.findPatientByPhoneSuffix(suffix);

    if (
      !patient ||
      !patient.portalOtpHash ||
      !patient.portalOtpExpiresAt ||
      patient.portalOtpExpiresAt < new Date()
    ) {
      throw new BadRequestException('Código inválido o expirado');
    }

    if (patient.portalOtpHash !== this.hashCode(code)) {
      throw new BadRequestException('Código inválido o expirado');
    }

    await this.prisma.patient.update({
      where: { id: patient.id },
      data: { portalOtpHash: null, portalOtpExpiresAt: null },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: patient.id, type: 'patient' },
      {
        secret: this.config.get<string>('jwt.patientAccessSecret'),
        expiresIn: this.config.get<string>('jwt.patientAccessExpiresIn'),
      } as JwtSignOptions,
    );

    return {
      accessToken,
      patient: this.toAuthenticatedPatient(patient),
    };
  }

  toAuthenticatedPatient(patient: {
    id: string;
    organizationId: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  }): AuthenticatedPatient {
    return {
      id: patient.id,
      organizationId: patient.organizationId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email,
    };
  }

  async getProfile(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    return patient;
  }

  async listAppointments(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      orderBy: { startsAt: 'desc' },
      include: {
        doctor: { select: { firstName: true, lastName: true } },
        treatment: true,
        clinic: { select: { name: true, address: true } },
      },
    });
  }

  async cancelAppointment(patientId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment || appointment.patientId !== patientId) {
      throw new ForbiddenException('No puedes modificar esta cita');
    }

    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      throw new BadRequestException('Esta cita ya no se puede cancelar');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancelReason: 'Cancelada por el paciente desde el portal',
      },
    });

    await this.whatsAppScheduler.notifyCancelled(appointmentId);

    return updated;
  }

  async listInvoices(patientId: string) {
    return this.prisma.invoice.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: { items: true, payments: true },
    });
  }
}
