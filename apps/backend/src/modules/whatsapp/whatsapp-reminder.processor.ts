import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import {
  ReminderJobData,
  TEMPLATE_KEY_BY_KIND,
  WHATSAPP_REMINDERS_QUEUE,
} from './whatsapp.types';

const NON_SENDABLE_STATUSES = new Set(['CANCELLED', 'NO_SHOW']);

@Processor(WHATSAPP_REMINDERS_QUEUE)
export class WhatsAppReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppReminderProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {
    super();
  }

  async process(job: Job<ReminderJobData>) {
    const { appointmentId, kind } = job.data;

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true, treatment: true, clinic: true },
    });

    if (!appointment) {
      this.logger.warn(
        `Cita ${appointmentId} no existe, se omite recordatorio ${kind}`,
      );
      return;
    }

    if (kind !== 'CANCELLED' && NON_SENDABLE_STATUSES.has(appointment.status)) {
      this.logger.log(
        `Cita ${appointmentId} ya no está activa, se omite recordatorio ${kind}`,
      );
      return;
    }

    const dateStr = appointment.startsAt.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const timeStr = appointment.startsAt.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });

    await this.whatsapp.sendTemplateMessage({
      organizationId: appointment.patient.organizationId,
      patientId: appointment.patientId,
      appointmentId: appointment.id,
      templateKey: TEMPLATE_KEY_BY_KIND[kind],
      params: [
        appointment.patient.firstName,
        dateStr,
        timeStr,
        `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        appointment.clinic.name,
      ],
    });
  }
}
