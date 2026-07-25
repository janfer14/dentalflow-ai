import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppBroadcastProcessor } from './whatsapp-broadcast.processor';
import { WhatsAppReminderProcessor } from './whatsapp-reminder.processor';
import { WhatsAppSchedulerService } from './whatsapp-scheduler.service';
import { WhatsAppService } from './whatsapp.service';
import {
  WHATSAPP_BROADCAST_QUEUE,
  WHATSAPP_REMINDERS_QUEUE,
} from './whatsapp.types';

@Module({
  imports: [
    BullModule.registerQueue({ name: WHATSAPP_REMINDERS_QUEUE }),
    BullModule.registerQueue({ name: WHATSAPP_BROADCAST_QUEUE }),
  ],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    WhatsAppSchedulerService,
    WhatsAppReminderProcessor,
    WhatsAppBroadcastProcessor,
  ],
  exports: [WhatsAppService, WhatsAppSchedulerService],
})
export class WhatsAppModule {}
