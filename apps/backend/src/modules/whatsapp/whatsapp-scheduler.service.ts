import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  REMINDER_OFFSET_HOURS,
  ReminderKind,
  WHATSAPP_REMINDERS_QUEUE,
} from './whatsapp.types';

interface ReminderJobData {
  appointmentId: string;
  kind: ReminderKind;
}

@Injectable()
export class WhatsAppSchedulerService {
  constructor(
    @InjectQueue(WHATSAPP_REMINDERS_QUEUE)
    private readonly queue: Queue<ReminderJobData>,
  ) {}

  async scheduleForNewAppointment(appointmentId: string, startsAt: Date) {
    await this.enqueue(appointmentId, 'CONFIRMATION', 0);
    await this.scheduleReminders(appointmentId, startsAt);
  }

  async rescheduleForAppointment(appointmentId: string, startsAt: Date) {
    await this.cancelPendingReminders(appointmentId);
    await this.scheduleReminders(appointmentId, startsAt);
    await this.enqueue(appointmentId, 'RESCHEDULED', 0);
  }

  async notifyCancelled(appointmentId: string) {
    await this.cancelPendingReminders(appointmentId);
    await this.enqueue(appointmentId, 'CANCELLED', 0);
  }

  private async scheduleReminders(appointmentId: string, startsAt: Date) {
    for (const [kind, hours] of Object.entries(REMINDER_OFFSET_HOURS)) {
      const sendAt = startsAt.getTime() - hours * 60 * 60 * 1000;
      const delay = sendAt - Date.now();
      if (delay > 0) {
        await this.enqueue(appointmentId, kind as ReminderKind, delay);
      }
    }
  }

  private async cancelPendingReminders(appointmentId: string) {
    const jobs = await this.queue.getJobs(['delayed', 'waiting']);
    await Promise.all(
      jobs
        .filter((job) => job.data?.appointmentId === appointmentId)
        .map((job) => job.remove().catch(() => undefined)),
    );
  }

  private enqueue(appointmentId: string, kind: ReminderKind, delay: number) {
    return this.queue.add(
      'reminder',
      { appointmentId, kind },
      {
        delay: Math.max(delay, 0),
        jobId: `${appointmentId}__${kind}`,
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
  }
}
