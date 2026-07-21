export type ReminderKind =
  | 'CONFIRMATION'
  | 'REMINDER_72H'
  | 'REMINDER_48H'
  | 'REMINDER_24H'
  | 'REMINDER_2H'
  | 'CANCELLED'
  | 'RESCHEDULED';

export interface ReminderJobData {
  appointmentId: string;
  kind: ReminderKind;
}

export const REMINDER_OFFSET_HOURS: Record<string, number> = {
  REMINDER_72H: 72,
  REMINDER_48H: 48,
  REMINDER_24H: 24,
  REMINDER_2H: 2,
};

export const TEMPLATE_KEY_BY_KIND: Record<ReminderKind, string> = {
  CONFIRMATION: 'appointment_confirmation',
  REMINDER_72H: 'appointment_reminder_72h',
  REMINDER_48H: 'appointment_reminder_48h',
  REMINDER_24H: 'appointment_reminder_24h',
  REMINDER_2H: 'appointment_reminder_2h',
  CANCELLED: 'appointment_cancelled',
  RESCHEDULED: 'appointment_rescheduled',
};

export const WHATSAPP_REMINDERS_QUEUE = 'whatsapp-reminders';
