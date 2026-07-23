import { NotFoundException } from '@nestjs/common';
import { AiService } from './ai.service';

function nthCallArg<T>(
  mockFn: { mock: { calls: unknown[][] } },
  index: number,
): T {
  return mockFn.mock.calls[index]?.[0] as T;
}

function buildService(apiKey?: string) {
  const prisma = {
    patient: { findFirst: jest.fn() },
    aiConversation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    aiMessage: { create: jest.fn(), findMany: jest.fn() },
  };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'ai.anthropicApiKey') return apiKey;
      if (key === 'ai.model') return 'claude-opus-4-8';
      return undefined;
    }),
  };

  const service = new AiService(config as never, prisma as never);
  return { service, prisma, config };
}

describe('AiService.isConfigured / getStatus', () => {
  it('is not configured and reports sandbox mode without an API key', () => {
    const { service } = buildService(undefined);

    expect(service.isConfigured).toBe(false);
    expect(service.getStatus()).toEqual({
      configured: false,
      model: 'claude-opus-4-8',
    });
  });

  it('is configured when an API key is present', () => {
    const { service } = buildService('sk-test-key');

    expect(service.isConfigured).toBe(true);
    expect(service.getStatus().configured).toBe(true);
  });
});

describe('AiService.createConversation', () => {
  it('throws NotFoundException when the given patient does not belong to the organization', async () => {
    const { service, prisma } = buildService();
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      service.createConversation('org-1', 'user-1', 'RECEPTION', 'patient-1'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.aiConversation.create).not.toHaveBeenCalled();
  });

  it('creates the conversation without a patient check when no patientId is given', async () => {
    const { service, prisma } = buildService();
    prisma.aiConversation.create.mockResolvedValue({ id: 'conv-1' });

    await service.createConversation('org-1', 'user-1');

    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
    expect(prisma.aiConversation.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        patientId: undefined,
        participant: 'RECEPTION',
      },
    });
  });

  it('creates the conversation once the patient is verified to belong to the organization', async () => {
    const { service, prisma } = buildService();
    prisma.patient.findFirst.mockResolvedValue({ id: 'patient-1' });
    prisma.aiConversation.create.mockResolvedValue({ id: 'conv-1' });

    await service.createConversation('org-1', 'user-1', 'DOCTOR', 'patient-1');

    expect(prisma.aiConversation.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', patientId: 'patient-1', participant: 'DOCTOR' },
    });
  });
});

describe('AiService.getConversation', () => {
  it('throws NotFoundException when the conversation does not exist', async () => {
    const { service, prisma } = buildService();
    prisma.aiConversation.findUnique.mockResolvedValue(null);

    await expect(service.getConversation('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('AiService.sendMessage in sandbox mode (no ANTHROPIC_API_KEY)', () => {
  it('stores the user message and replies with the sandbox explanation, without calling Claude', async () => {
    const { service, prisma } = buildService(undefined);
    prisma.aiConversation.findUnique.mockResolvedValue({
      id: 'conv-1',
      messages: [],
    });
    prisma.aiMessage.create.mockResolvedValue({ id: 'msg-1' });

    await service.sendMessage('org-1', 'conv-1', 'Hola');

    const firstCall = nthCallArg<{
      data: { conversationId: string; role: string; content: string };
    }>(prisma.aiMessage.create, 0);
    expect(firstCall.data).toEqual({
      conversationId: 'conv-1',
      role: 'user',
      content: 'Hola',
    });

    const secondCall = nthCallArg<{
      data: { conversationId: string; role: string; content: string };
    }>(prisma.aiMessage.create, 1);
    expect(secondCall.data.conversationId).toBe('conv-1');
    expect(secondCall.data.role).toBe('assistant');
    expect(secondCall.data.content).toContain('modo sandbox');
    expect(prisma.aiMessage.findMany).not.toHaveBeenCalled();
  });
});
