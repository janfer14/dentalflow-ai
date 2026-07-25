import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { WhatsAppService } from './whatsapp.service';
import { BroadcastJobData, WHATSAPP_BROADCAST_QUEUE } from './whatsapp.types';

@Processor(WHATSAPP_BROADCAST_QUEUE)
export class WhatsAppBroadcastProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppBroadcastProcessor.name);

  constructor(private readonly whatsapp: WhatsAppService) {
    super();
  }

  async process(job: Job<BroadcastJobData>) {
    const { patientId, body } = job.data;

    try {
      await this.whatsapp.sendTextMessage(patientId, body);
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el mensaje masivo al paciente ${patientId}: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );
    }
  }
}
