import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

interface SendTemplateParams {
  organizationId: string;
  patientId: string;
  appointmentId?: string;
  templateKey: string;
  params: string[];
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('whatsapp.phoneNumberId') &&
      this.config.get<string>('whatsapp.accessToken'),
    );
  }

  getStatus() {
    return {
      configured: this.isConfigured,
      phoneNumberId: this.config.get<string>('whatsapp.phoneNumberId') || null,
      mode: this.isConfigured ? 'live' : 'sandbox',
    };
  }

  renderTemplate(body: string, params: string[]): string {
    return params.reduce(
      (acc, param, index) => acc.split(`{{${index + 1}}}`).join(param),
      body,
    );
  }

  normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  async listTemplates(organizationId: string) {
    return this.prisma.whatsAppTemplate.findMany({
      where: { organizationId },
      orderBy: { key: 'asc' },
    });
  }

  async updateTemplate(organizationId: string, key: string, body: string) {
    return this.prisma.whatsAppTemplate.upsert({
      where: { organizationId_key: { organizationId, key } },
      update: { body },
      create: { organizationId, key, body },
    });
  }

  async listMessages(patientId: string) {
    return this.prisma.message.findMany({
      where: { patientId, channel: 'WHATSAPP' },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendTextMessage(patientId: string, body: string) {
    const patient = await this.prisma.patient.findUniqueOrThrow({
      where: { id: patientId },
    });
    if (!patient.phone) {
      throw new BadRequestException('El paciente no tiene teléfono registrado');
    }

    const message = await this.prisma.message.create({
      data: {
        patientId: patient.id,
        channel: 'WHATSAPP',
        direction: 'OUTBOUND',
        status: 'QUEUED',
        body,
      },
    });

    return this.dispatch(message.id, patient.phone, {
      messaging_product: 'whatsapp',
      to: this.normalizePhone(patient.phone),
      type: 'text',
      text: { body },
    });
  }

  async sendTemplateMessage(input: SendTemplateParams) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: input.patientId },
    });
    if (!patient) {
      this.logger.warn(
        `Paciente ${input.patientId} no encontrado, se omite envío de WhatsApp`,
      );
      return null;
    }
    if (!patient.phone) {
      this.logger.warn(
        `Paciente ${patient.id} no tiene teléfono, se omite envío de WhatsApp`,
      );
      return null;
    }
    if (!patient.whatsappOptIn) {
      this.logger.log(
        `Paciente ${patient.id} no acepta mensajes de WhatsApp, se omite envío`,
      );
      return null;
    }

    const template = await this.prisma.whatsAppTemplate.findUnique({
      where: {
        organizationId_key: {
          organizationId: input.organizationId,
          key: input.templateKey,
        },
      },
    });

    const body = template
      ? this.renderTemplate(template.body, input.params)
      : input.params.join(' ');

    const message = await this.prisma.message.create({
      data: {
        patientId: patient.id,
        appointmentId: input.appointmentId,
        channel: 'WHATSAPP',
        direction: 'OUTBOUND',
        status: 'QUEUED',
        templateKey: input.templateKey,
        body,
      },
    });

    return this.dispatch(message.id, patient.phone, {
      messaging_product: 'whatsapp',
      to: this.normalizePhone(patient.phone),
      type: 'template',
      template: {
        name: input.templateKey,
        language: { code: template?.language ?? 'es_MX' },
        components: [
          {
            type: 'body',
            parameters: input.params.map((text) => ({ type: 'text', text })),
          },
        ],
      },
    });
  }

  private async dispatch(
    messageId: string,
    phone: string,
    payload: Record<string, unknown>,
  ) {
    if (!this.isConfigured) {
      this.logger.log(
        `[WhatsApp sandbox] → ${phone}: ${JSON.stringify(payload)}`,
      );
      return this.prisma.message.update({
        where: { id: messageId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    }

    const phoneNumberId = this.config.get<string>('whatsapp.phoneNumberId');
    const accessToken = this.config.get<string>('whatsapp.accessToken');
    const apiVersion = this.config.get<string>('whatsapp.apiVersion');

    try {
      const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const responseBody = (await response.json()) as {
        messages?: { id: string }[];
        error?: { message: string };
      };

      if (!response.ok) {
        const errorReason =
          responseBody.error?.message ?? `HTTP ${response.status}`;
        this.logger.error(`Error enviando WhatsApp: ${errorReason}`);
        return this.prisma.message.update({
          where: { id: messageId },
          data: { status: 'FAILED', errorReason },
        });
      }

      return this.prisma.message.update({
        where: { id: messageId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId: responseBody.messages?.[0]?.id,
        },
      });
    } catch (error) {
      const errorReason =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Excepción enviando WhatsApp: ${errorReason}`);
      return this.prisma.message.update({
        where: { id: messageId },
        data: { status: 'FAILED', errorReason },
      });
    }
  }

  verifyWebhookChallenge(
    mode: string,
    token: string,
    challenge: string,
  ): string {
    const verifyToken = this.config.get<string>('whatsapp.verifyToken');
    if (mode === 'subscribe' && token && verifyToken && token === verifyToken) {
      return challenge;
    }
    throw new ForbiddenException('Token de verificación inválido');
  }

  verifySignature(
    rawBody: Buffer | undefined,
    signatureHeader?: string,
  ): boolean {
    const appSecret = this.config.get<string>('whatsapp.appSecret');
    if (!appSecret) return true;
    if (!rawBody || !signatureHeader) return false;

    const expected =
      'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signatureHeader);

    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  async handleWebhookEvent(payload: WhatsAppWebhookPayload) {
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        for (const status of value?.statuses ?? []) {
          await this.applyStatusUpdate(status);
        }
        for (const inboundMessage of value?.messages ?? []) {
          await this.storeInboundMessage(inboundMessage);
        }
      }
    }
  }

  private async applyStatusUpdate(status: WhatsAppStatusPayload) {
    const statusMap: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> =
      {
        sent: 'SENT',
        delivered: 'DELIVERED',
        read: 'READ',
        failed: 'FAILED',
      };
    const mapped = statusMap[status.status];
    if (!mapped) return;

    const timestamp = status.timestamp
      ? new Date(Number(status.timestamp) * 1000)
      : new Date();

    await this.prisma.message.updateMany({
      where: { providerMessageId: status.id },
      data: {
        status: mapped,
        ...(mapped === 'DELIVERED' ? { deliveredAt: timestamp } : {}),
        ...(mapped === 'READ' ? { readAt: timestamp } : {}),
        ...(mapped === 'FAILED'
          ? { errorReason: status.errors?.[0]?.title }
          : {}),
      },
    });
  }

  private async storeInboundMessage(inboundMessage: WhatsAppInboundMessage) {
    const fromPhone = inboundMessage.from;
    // Match by last 10 digits since stored phones may include country code /
    // formatting. Stored phones contain spaces (e.g. "+52 55 1234 5678"), so a
    // digit-only suffix can never match via SQL `contains` on the raw string —
    // fetch candidates and compare normalized digits in application code.
    const suffix = fromPhone.replace(/[^\d]/g, '').slice(-10);
    const candidates = await this.prisma.patient.findMany({
      where: { phone: { not: null } },
    });
    const patient =
      candidates.find(
        (p) => p.phone && p.phone.replace(/[^\d]/g, '').endsWith(suffix),
      ) ?? null;

    if (!patient) {
      this.logger.warn(
        `Mensaje entrante de WhatsApp de número no reconocido: ${fromPhone}`,
      );
      return;
    }

    const body =
      inboundMessage.text?.body ?? `[mensaje de tipo ${inboundMessage.type}]`;

    await this.prisma.message.create({
      data: {
        patientId: patient.id,
        channel: 'WHATSAPP',
        direction: 'INBOUND',
        status: 'DELIVERED',
        body,
        providerMessageId: inboundMessage.id,
        sentAt: new Date(Number(inboundMessage.timestamp) * 1000),
      },
    });
  }
}

interface WhatsAppStatusPayload {
  id: string;
  status: string;
  timestamp?: string;
  errors?: { title: string }[];
}

interface WhatsAppInboundMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        statuses?: WhatsAppStatusPayload[];
        messages?: WhatsAppInboundMessage[];
      };
    }[];
  }[];
}
