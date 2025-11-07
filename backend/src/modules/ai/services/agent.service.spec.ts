import { AgentService } from './agent.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { MistralService } from './mistral.service';
import { EmbeddingsService } from './embeddings.service';

jest.mock('@langchain/mistralai', () => ({
  ChatMistralAI: jest.fn().mockImplementation((params) => ({ params })),
}));

describe('AgentService', () => {
  const baseOptions = {
    tenantId: 'tenant-123',
    userId: 'user-456',
    prompt: 'Summarize my inbox',
  };

  const originalApiKey = process.env.MISTRAL_API_KEY;

  let config: jest.Mocked<ConfigService>;
  let prisma: {
    message: { create: jest.Mock };
    email: { findMany: jest.Mock };
  };
  let mistral: jest.Mocked<MistralService>;
  let embeddings: jest.Mocked<EmbeddingsService>;
  let service: AgentService;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string) => {
        if (key === 'MISTRAL_API_KEY') {
          return 'api-key';
        }
        if (key === 'MISTRAL_AGENT_MODEL') {
          return 'agent-model';
        }
        if (key === 'MISTRAL_MODEL') {
          return 'fallback-model';
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    prisma = {
      message: { create: jest.fn().mockResolvedValue(undefined) },
      email: { findMany: jest.fn() },
    };

    mistral = {
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2]),
    } as unknown as jest.Mocked<MistralService>;

    embeddings = {
      findSimilarContent: jest
        .fn()
        .mockResolvedValue([{ documentName: 'Doc 1', content: 'Body' }]),
    } as unknown as jest.Mocked<EmbeddingsService>;

    service = new AgentService(
      config,
      prisma as unknown as PrismaService,
      mistral,
      embeddings,
    );
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.MISTRAL_API_KEY;
    } else {
      process.env.MISTRAL_API_KEY = originalApiKey;
    }
  });

  const mockLangChain = (result: any) => {
    const invoke = jest.fn().mockResolvedValue(result);
    const createAgent = jest.fn().mockReturnValue({ invoke });
    const tool = jest.fn((impl, metadata) => ({
      name: metadata?.name ?? 'tool',
      run: impl,
    }));

    jest
      .spyOn(service as any, 'getLangChain')
      .mockResolvedValue({ createAgent, tool });

    return { invoke, createAgent, tool };
  };

  it('throws when API key is missing', async () => {
    config.get.mockImplementation(() => undefined);
    delete process.env.MISTRAL_API_KEY;
    mockLangChain({ output: 'ignored' });

    await expect(service.runAgent(baseOptions)).rejects.toThrow(
      'Mistral API key is not configured',
    );
  });

  it('runs the agent, persists messages, and returns tool steps', async () => {
    const langchain = mockLangChain({
      output: 'Final response',
      steps: [{ name: 'knowledge_search', result: { foo: 'bar' } }],
    });

    const response = await service.runAgent(baseOptions);

    expect(response).toEqual({
      output: 'Final response',
      intermediateSteps: [{ tool: 'knowledge_search', output: '{"foo":"bar"}' }],
    });

    expect(prisma.message.create).toHaveBeenCalledTimes(2);
    expect(langchain.createAgent).toHaveBeenCalledWith({
      model: expect.any(Object),
      tools: expect.any(Array),
    });

    const knowledgeHandler = langchain.tool.mock.calls.find(
      ([, meta]) => meta?.name === 'knowledge_search',
    )?.[0];
    expect(knowledgeHandler).toBeDefined();

    mistral.generateEmbedding.mockResolvedValueOnce([0.9]);
    embeddings.findSimilarContent.mockResolvedValueOnce([
      { documentName: 'Doc A', content: 'Snippet' },
    ]);
    const knowledgeOutput = await knowledgeHandler({ query: 'contracts', limit: 2 });
    expect(knowledgeOutput).toContain('Doc A');

    const recentEmailsHandler = langchain.tool.mock.calls.find(
      ([, meta]) => meta?.name === 'recent_emails',
    )?.[0];
    expect(recentEmailsHandler).toBeDefined();

    prisma.email.findMany.mockResolvedValueOnce([]);
    await expect(recentEmailsHandler({})).resolves.toBe(
      'No email messages were found for this workspace.',
    );

    prisma.email.findMany.mockResolvedValueOnce([
      {
        subject: 'Hello',
        from: 'a@example.com',
        snippet: 'Snippet',
        folder: 'INBOX',
        receivedAt: new Date('2025-01-02T03:04:05Z'),
      },
    ]);
    const emailsOutput = await recentEmailsHandler({ limit: 1 });
    expect(emailsOutput).toContain('Subject: Hello');
    expect(emailsOutput).toContain('INBOX');
  });

  it('falls back to default response when agent returns no output', async () => {
    mockLangChain({
      output: '',
      messages: [],
      structuredResponse: '',
      final_output: undefined,
    });

    const result = await service.runAgent(baseOptions);

    expect(result.output).toBe(
      'I could not produce a response for this request.',
    );
    expect(result.intermediateSteps).toBeUndefined();
  });
});
