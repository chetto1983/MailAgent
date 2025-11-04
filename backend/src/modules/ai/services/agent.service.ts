import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { MistralService } from './mistral.service';
import { EmbeddingsService } from './embeddings.service';
import { ChatMistralAI } from '@langchain/mistralai';
import { z } from 'zod';

interface RunAgentOptions {
  tenantId: string;
  userId: string;
  prompt: string;
  conversationId?: string | null;
  history?: Array<{ role: string; content: string }>;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private langchainModulePromise?: Promise<typeof import('langchain')>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mistralService: MistralService,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  private async getLangChain() {
    if (!this.langchainModulePromise) {
      this.langchainModulePromise = import('langchain');
    }

    return this.langchainModulePromise;
  }

  private getApiKey(): string {
    const apiKey =
      this.configService.get<string>('MISTRAL_API_KEY') || process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('Mistral API key is not configured');
    }
    return apiKey;
  }

  async runAgent(options: RunAgentOptions): Promise<{
    output: string;
    intermediateSteps?: Array<{ tool: string; output: string }>;
  }> {
    const { createAgent, tool } = await this.getLangChain();

    const apiKey = this.getApiKey();
    const model =
      this.configService.get<string>('MISTRAL_AGENT_MODEL') ||
      this.configService.get<string>('MISTRAL_MODEL') ||
      'mistral-large-latest';

    const chatModel = new ChatMistralAI({
      apiKey,
      model,
      temperature: 0.2,
      maxTokens: 1024,
    });

    const knowledgeSearchTool = tool(
      async ({ query, limit }: { query: string; limit?: number }) => {
        const embedding = await this.mistralService.generateEmbedding(query);
        const results = await this.embeddingsService.findSimilarContent(
          options.tenantId,
          embedding,
          limit ?? 3,
        );

        if (!results.length) {
          return 'No relevant knowledge base entries were found for this query.';
        }

        return results
          .map((item, index) => {
            const title = item.documentName || `Document ${index + 1}`;
            return `${title}:\n${item.content}`;
          })
          .join('\n\n---\n\n');
      },
      {
        name: 'knowledge_search',
        description:
          'Search the internal knowledge base for documents or emails relevant to the user question.',
        schema: z.object({
          query: z.string().describe('Natural language search query'),
          limit: z.number().int().positive().max(10).optional(),
        }),
      },
    );

    const recentEmailsTool = tool(
      async ({ limit, folder }: { limit?: number; folder?: string }) => {
        const emails = await this.prisma.email.findMany({
          where: {
            tenantId: options.tenantId,
            ...(folder ? { folder: folder.toUpperCase() } : {}),
          },
          orderBy: { receivedAt: 'desc' },
          take: Math.min(limit ?? 3, 10),
          select: {
            subject: true,
            from: true,
            snippet: true,
            folder: true,
            receivedAt: true,
          },
        });

        if (!emails.length) {
          return 'No email messages were found for this workspace.';
        }

        return emails
          .map((email) => {
            const received = email.receivedAt
              ? new Date(email.receivedAt).toISOString()
              : 'Unknown date';
            return `Subject: ${email.subject}\nFrom: ${email.from}\nFolder: ${email.folder}\nReceived: ${received}\nSnippet: ${email.snippet ?? '(no snippet available)'}`;
          })
          .join('\n\n---\n\n');
      },
      {
        name: 'recent_emails',
        description:
          'Look up recent emails for this workspace. Useful to summarize or answer questions about new messages.',
        schema: z.object({
          limit: z.number().int().positive().max(10).optional(),
          folder: z.string().optional().describe('Optional folder name (e.g. INBOX, SENT)'),
        }),
      },
    );

    const agent = createAgent({
      model: chatModel,
      tools: [knowledgeSearchTool, recentEmailsTool],
    });

    const conversationId = options.conversationId ?? null;
    await this.prisma.message.create({
      data: {
        tenantId: options.tenantId,
        userId: options.userId,
        conversationId,
        role: 'user',
        content: options.prompt,
      },
    });

    const conversationMessages = [
      ...(options.history ?? []).map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: item.content,
      })),
      { role: 'user', content: options.prompt },
    ];

    const startTime = Date.now();
    this.logger.log(
      `Agent run started for tenant=${options.tenantId} user=${options.userId} ` +
        `promptLength=${options.prompt.length} historyCount=${conversationMessages.length - 1}`,
    );

    let result: any;
    try {
      result = await agent.invoke({
        input: options.prompt,
        messages: conversationMessages,
      });
    } catch (error) {
      this.logger.error(
        `Agent run failed for tenant=${options.tenantId} user=${options.userId}: ${error instanceof Error ? error.message : error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Agent run completed for tenant=${options.tenantId} user=${options.userId} in ${durationMs}ms`,
    );

    const resultKeys =
      result && typeof result === 'object' ? Object.keys(result).join(',') : 'n/a';
    const outputType = typeof result?.output;
    this.logger.debug(
      `Agent raw result metadata for tenant=${options.tenantId} user=${options.userId}: ` +
        `type=${typeof result} keys=${resultKeys} outputType=${outputType}`,
    );

    const output =
      typeof result?.output === 'string'
        ? result.output.trim()
        : typeof result === 'string'
          ? result
          : 'I could not produce a response for this request.';

    await this.prisma.message.create({
      data: {
        tenantId: options.tenantId,
        userId: options.userId,
        conversationId,
        role: 'assistant',
        content: output,
      },
    });

    const intermediateSteps = Array.isArray((result as any)?.steps)
      ? (result as any).steps.map((step: any) => ({
          tool: step?.tool ?? 'unknown',
          output:
            typeof step?.output === 'string'
              ? step.output
              : JSON.stringify(step?.output ?? ''),
        }))
      : undefined;

    const response = {
      output,
      intermediateSteps,
    };

    this.logger.debug(
      `Agent response summary for tenant=${options.tenantId} user=${options.userId}: ` +
        `outputLength=${output.length} steps=${intermediateSteps?.length ?? 0}`,
    );

    return response;
  }
}
