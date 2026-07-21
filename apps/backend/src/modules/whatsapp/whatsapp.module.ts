import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppReminderProcessor } from './whatsapp-reminder.processor';
import { WhatsAppSchedulerService } from './whatsapp-scheduler.service';
import { WhatsAppService } from './whatsapp.service';
import { WHATSAPP_REMINDERS_QUEUE } from './whatsapp.types';

@Module({
  imports: [BullModule.registerQueue({ name: WHATSAPP_REMINDERS_QUEUE })],
  controllers: [WhatsAppController],
  providers: [
    WhatsAppService,
    WhatsAppSchedulerService,
    WhatsAppReminderProcessor,
  ],
  exports: [WhatsAppService, WhatsAppSchedulerService],
})
export class WhatsAppModule {}
