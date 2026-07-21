import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiConversationParticipant, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_SYSTEM_PROMPT, AI_TOOLS } from './ai-tools';

const MAX_TOOL_ITERATIONS = 6;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('ai.anthropicApiKey');
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    this.model = this.config.get<string>('ai.model') ?? 'claude-opus-4-8';
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  getStatus() {
    return { configured: this.isConfigured, model: this.model };
  }

  async createConversation(
    organizationId: string,
    userId: string,
    participant: AiConversationParticipant = 'RECEPTION',
    patientId?: string,
  ) {
    if (patientId) {
      const patient = await this.prisma.patient.findFirst({
        where: { id: patientId, organizationId },
      });
      if (!patient) {
        throw new NotFoundException('Paciente no encontrado');
      }
    }

    return this.prisma.aiConversation.create({
      data: { userId, patientId, participant },
    });
  }

  async listConversations(userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
    });
  }

  async getConversation(id: string) {
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }
    return conversation;
  }

  async sendMessage(
    organizationId: string,
    conversationId: string,
    content: string,
  ) {
    const conversation = await this.getConversation(conversationId);

    await this.prisma.aiMessage.create({
      data: { conversationId, role: 'user', content },
    });

    if (!this.isConfigured) {
      const sandboxReply =
        'El asistente DentalFlow AI está en modo sandbox porque no se ha configurado ANTHROPIC_API_KEY en el backend. ' +
        'Agrega tu clave de la API de Claude en apps/backend/.env para activar respuestas reales.';
      return this.prisma.aiMessage.create({
        data: { conversationId, role: 'assistant', content: sandboxReply },
      });
    }

    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    let finalText = '';
    const toolCallLog: unknown[] = [];

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: 2048,
        system: AI_SYSTEM_PROMPT,
        tools: AI_TOOLS,
        messages,
      });

      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      );
      finalText = textBlocks.map((b) => b.text).join('\n');

      if (response.stop_reason !== 'tool_use') {
        break;
      }

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      );

      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        toolCallLog.push({ name: toolUse.name, input: toolUse.input });
        let resultText: string;
        try {
          resultText = await this.executeTool(
            organizationId,
            toolUse.name,
            toolUse.input,
          );
        } catch (error) {
          resultText = `Error ejecutando la herramienta: ${
            error instanceof Error ? error.message : 'desconocido'
          }`;
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: resultText,
        });
      }

      messages.push({ role: 'user', content: toolResults });
    }

    return this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content:
          finalText ||
          'No pude generar una respuesta. Intenta reformular tu pregunta.',
        toolCalls:
          toolCallLog.length > 0
            ? (toolCallLog as Prisma.InputJsonValue)
            : undefined,
      },
    });
  }

  private async executeTool(
    organizationId: string,
    name: string,
    input: unknown,
  ): Promise<string> {
    const args = (input ?? {}) as Record<string, unknown>;

    switch (name) {
      case 'search_patients': {
        const query = typeof args.query === 'string' ? args.query : '';
        const patients = await this.prisma.patient.findMany({
          where: {
            organizationId,
            deletedAt: null,
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 5,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        });
        return JSON.stringify(patients);
      }

      case 'search_treatments': {
        const query = typeof args.query === 'string' ? args.query : undefined;
        const treatments = await this.prisma.treatment.findMany({
          where: {
            organizationId,
            isActive: true,
            ...(query
              ? { name: { contains: query, mode: 'insensitive' } }
              : {}),
          },
          take: 10,
          select: {
            id: true,
            name: true,
            defaultPrice: true,
            durationMinutes: true,
          },
        });
        return JSON.stringify(treatments);
      }

      case 'get_patient_summary': {
        const patientId =
          typeof args.patientId === 'string' ? args.patientId : '';
        const patient = await this.prisma.patient.findFirst({
          where: { id: patientId, organizationId },
        });
        if (!patient)
          return JSON.stringify({ error: 'Paciente no encontrado' });

        const record = await this.prisma.clinicalRecord.findUnique({
          where: { patientId },
          include: {
            clinicalNotes: { orderBy: { createdAt: 'desc' }, take: 5 },
            odontogram: { include: { teeth: true } },
            treatmentPlans: {
              include: { items: { include: { treatment: true } } },
            },
          },
        });

        const upcomingAppointments = await this.prisma.appointment.findMany({
          where: {
            patientId,
            startsAt: { gte: new Date() },
            status: { notIn: ['CANCELLED'] },
          },
          orderBy: { startsAt: 'asc' },
          take: 3,
          select: { startsAt: true, status: true },
        });

        return JSON.stringify({
          patient: {
            name: `${patient.firstName} ${patient.lastName}`,
            phone: patient.phone,
            allergies: patient.allergies,
            medications: patient.medications,
            medicalHistory: patient.medicalHistory,
          },
          clinicalNotes: record?.clinicalNotes.map((n) => ({
            date: n.createdAt,
            content: n.content,
            diagnosis: n.diagnosis,
          })),
          odontogramConditions: record?.odontogram?.teeth
            .filter(
              (t) =>
                Array.isArray(t.conditions) &&
                (t.conditions as unknown[]).length > 0,
            )
            .map((t) => ({ tooth: t.toothNumber, conditions: t.conditions })),
          treatmentPlans: record?.treatmentPlans.map((plan) => ({
            title: plan.title,
            items: plan.items.map((item) => ({
              treatment: item.treatment.name,
              status: item.status,
              tooth: item.toothNumber,
            })),
          })),
          upcomingAppointments,
        });
      }

      case 'list_upcoming_appointments': {
        const days = typeof args.days === 'number' ? args.days : 7;
        const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const appointments = await this.prisma.appointment.findMany({
          where: {
            clinic: { organizationId },
            startsAt: { gte: new Date(), lte: to },
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
          orderBy: { startsAt: 'asc' },
          take: 20,
          include: {
            patient: { select: { firstName: true, lastName: true } },
            doctor: { select: { firstName: true, lastName: true } },
          },
        });
        return JSON.stringify(
          appointments.map((a) => ({
            patient: `${a.patient.firstName} ${a.patient.lastName}`,
            doctor: `${a.doctor.firstName} ${a.doctor.lastName}`,
            startsAt: a.startsAt,
            status: a.status,
          })),
        );
      }

      case 'find_patients_without_recent_visits': {
        const months = typeof args.months === 'number' ? args.months : 6;
        const since = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);
        const patients = await this.prisma.patient.findMany({
          where: {
            organizationId,
            isActive: true,
            deletedAt: null,
            appointments: { none: { startsAt: { gte: since } } },
          },
          take: 20,
          select: { id: true, firstName: true, lastName: true, phone: true },
        });
        return JSON.stringify(patients);
      }

      default:
        return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
    }
  }
}
