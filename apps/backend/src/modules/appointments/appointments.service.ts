import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppSchedulerService } from '../whatsapp/whatsapp-scheduler.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsDto } from './dto/list-appointments.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const NON_BLOCKING_STATUSES = ['CANCELLED', 'NO_SHOW'] as const;

const DOCTOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  isDoctor: true,
  specialtyId: true,
} as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppScheduler: WhatsAppSchedulerService,
  ) {}

  async create(dto: CreateAppointmentDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);

    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la hora de inicio',
      );
    }

    await this.assertNoOverlap({
      doctorId: dto.doctorId,
      consultingRoomId: dto.consultingRoomId,
      startsAt,
      endsAt,
    });

    const appointment = await this.prisma.appointment.create({
      data: {
        clinicId: dto.clinicId,
        consultingRoomId: dto.consultingRoomId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        treatmentId: dto.treatmentId,
        startsAt,
        endsAt,
        source: dto.source,
        notes: dto.notes,
      },
      include: {
        patient: true,
        doctor: { select: DOCTOR_SELECT },
        treatment: true,
      },
    });

    await this.whatsAppScheduler.scheduleForNewAppointment(
      appointment.id,
      startsAt,
    );

    return appointment;
  }

  async findAll(query: ListAppointmentsDto) {
    return this.prisma.appointment.findMany({
      where: {
        clinicId: query.clinicId,
        doctorId: query.doctorId,
        patientId: query.patientId,
        status: query.status,
        ...(query.from || query.to
          ? {
              startsAt: {
                gte: query.from ? new Date(query.from) : undefined,
                lte: query.to ? new Date(query.to) : undefined,
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
      include: {
        patient: true,
        doctor: { select: DOCTOR_SELECT },
        treatment: true,
        consultingRoom: true,
      },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { select: DOCTOR_SELECT },
        treatment: true,
        consultingRoom: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada');
    }

    return appointment;
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const existing = await this.findOne(id);

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;

    if (endsAt <= startsAt) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la hora de inicio',
      );
    }

    if (dto.startsAt || dto.endsAt || dto.doctorId || dto.consultingRoomId) {
      await this.assertNoOverlap({
        doctorId: dto.doctorId ?? existing.doctorId,
        consultingRoomId:
          dto.consultingRoomId ?? existing.consultingRoomId ?? undefined,
        startsAt,
        endsAt,
        excludeAppointmentId: id,
      });
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        clinicId: dto.clinicId,
        consultingRoomId: dto.consultingRoomId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        treatmentId: dto.treatmentId,
        startsAt: dto.startsAt ? startsAt : undefined,
        endsAt: dto.endsAt ? endsAt : undefined,
        status: dto.status,
        cancelReason: dto.cancelReason,
        notes: dto.notes,
      },
      include: {
        patient: true,
        doctor: { select: DOCTOR_SELECT },
        treatment: true,
      },
    });

    if (dto.status === 'CANCELLED' && existing.status !== 'CANCELLED') {
      await this.whatsAppScheduler.notifyCancelled(id);
    } else if (
      dto.startsAt &&
      startsAt.getTime() !== existing.startsAt.getTime()
    ) {
      await this.whatsAppScheduler.rescheduleForAppointment(id, startsAt);
    }

    return updated;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: 'Eliminada por el usuario' },
    });

    if (existing.status !== 'CANCELLED') {
      await this.whatsAppScheduler.notifyCancelled(id);
    }
  }

  private async assertNoOverlap(params: {
    doctorId: string;
    consultingRoomId?: string;
    startsAt: Date;
    endsAt: Date;
    excludeAppointmentId?: string;
  }) {
    const overlapping = await this.prisma.appointment.findFirst({
      where: {
        id: params.excludeAppointmentId
          ? { not: params.excludeAppointmentId }
          : undefined,
        status: { notIn: [...NON_BLOCKING_STATUSES] },
        startsAt: { lt: params.endsAt },
        endsAt: { gt: params.startsAt },
        OR: [
          { doctorId: params.doctorId },
          ...(params.consultingRoomId
            ? [{ consultingRoomId: params.consultingRoomId }]
            : []),
        ],
      },
    });

    if (overlapping) {
      throw new ConflictException(
        'El doctor o el consultorio ya tienen una cita programada en ese horario',
      );
    }
  }
}
