import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import type { Messages as MistralChatMessage } from '@mistralai/mistralai/models/components/chatcompletionrequest.js';
import type { AssistantMessage } from '@mistralai/mistralai/models/components/assistantmessage.js';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingsService } from './embeddings.service';

type ConversationMessage = {
  role: 'assistant' | 'user';
  content: string;
};

type LocaleKey = 'en' | 'it';

const TITLE_PROMPTS: Record<
  LocaleKey,
  { system: string; conversationLabel: string; titleLabel: string; defaultTitle: string }
> = {
  en: {
    system:
      'You summarise conversations. Craft a short, descriptive title (max 8 words) for the conversation provided. Reply with the title only, no quotes.',
    conversationLabel: 'Conversation',
    titleLabel: 'Title',
    defaultTitle: 'New chat',
  },
  it: {
    system:
      'Sei un assistente che riassume le conversazioni. Crea un titolo breve e descrittivo (massimo 8 parole) per la conversazione indicata. Rispondi solo con il titolo, senza virgolette.',
    conversationLabel: 'Conversazione',
    titleLabel: 'Titolo',
    defaultTitle: 'Nuova chat',
  },
};

@Injectable()
export class MistralService {
  private logger = new Logger(MistralService.name);
  private defaultModel = 'mistral-medium-latest';
  private readonly embeddingModel = 'mistral-embed';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private embeddingsService: EmbeddingsService,
  ) {}

  private getApiKey(): string | undefined {
    return this.configService.get<string>('MISTRAL_API_KEY') || process.env.MISTRAL_API_KEY;
  }

  private getRequiredApiKey(): string {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Mistral API key is not configured');
    }
    return apiKey;
  }

  private getModel(): string {
    return this.configService.get<string>('MISTRAL_MODEL') || process.env.MISTRAL_MODEL || this.defaultModel;
  }

  getEmbeddingModel(): string {
    return this.embeddingModel;
  }

  async createMistralClient(): Promise<Mistral> {
    const apiKey = this.getRequiredApiKey();
    return this.createClient(apiKey);
  }

  async completePrompt(options: {
    systemPrompt?: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const { systemPrompt, userPrompt, temperature = 0.4, maxTokens = 512 } = options;

    try {
      const client = await this.createMistralClient();
      const messages: MistralChatMessage[] = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push({ role: 'user', content: userPrompt });

      const completion = await client.chat.complete({
        model: this.getModel(),
        messages,
        temperature,
        maxTokens,
      });

      const text = this.extractAssistantContent(completion.choices?.[0]?.message).trim();

      if (!text) {
        throw new Error('Empty response from AI service');
      }

      return text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Prompt completion failed: ${message}`, stack);
      throw error;
    }
  }

  private createClient(apiKey: string): Mistral {
    return new Mistral({
      apiKey,
    });
  }

  private normaliseConversation(history: any[]): MistralChatMessage[] {
    const result = history
      .filter((item): item is ConversationMessage => {
        return (
          item &&
          typeof item.content === 'string' &&
          (item.role === 'assistant' || item.role === 'user')
        );
      })
      .map((item) =>
        item.role === 'assistant'
          ? {
              role: 'assistant' as const,
              content: item.content,
            }
          : {
              role: 'user' as const,
              content: item.content,
            },
      );

    return result as MistralChatMessage[];
  }

  private extractAssistantContent(message: AssistantMessage | undefined): string {
    if (!message || message.content == null) {
      return '';
    }

    if (typeof message.content === 'string') {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      return message.content
        .map((chunk) => {
          if (chunk && typeof chunk === 'object' && 'text' in chunk && typeof chunk.text === 'string') {
            return chunk.text;
          }
          return '';
        })
        .join('')
        .trim();
    }

    return '';
  }

  async generateChatTitle(
    messages: Array<{ role: string; content: string }> = [],
    locale?: string,
  ): Promise<string> {
    const localeKey = this.resolveLocale(locale);

    if (!messages || messages.length === 0) {
      return TITLE_PROMPTS[localeKey].defaultTitle;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return this.buildFallbackTitle(messages, localeKey);
    }

    try {
      const client = this.createClient(apiKey);
      const recentMessages = messages.slice(-6);
      const transcript = recentMessages
        .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
        .join('\n');

      const completion = await client.chat.complete({
        model: this.getModel(),
        temperature: 0.2,
        maxTokens: 32,
        messages: [
          {
            role: 'system',
            content: TITLE_PROMPTS[localeKey].system,
          },
          {
            role: 'user',
            content: `${TITLE_PROMPTS[localeKey].conversationLabel}:\n${transcript}\n\n${TITLE_PROMPTS[localeKey].titleLabel}:`,
          },
        ],
      });

      const rawTitle =
        this.extractAssistantContent(completion.choices?.[0]?.message) ||
        this.buildFallbackTitle(messages, localeKey);
      return this.sanitiseTitle(rawTitle, localeKey);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to generate chat title: ${errorMessage}`);
      return this.buildFallbackTitle(messages, localeKey);
    }
  }

  private buildFallbackTitle(
    messages: Array<{ role: string; content: string }>,
    localeKey: LocaleKey,
  ): string {
    const firstUserMessage = messages.find(
      (message) => message.role === 'user' && typeof message.content === 'string' && message.content.trim().length > 0,
    );

    if (!firstUserMessage) {
      return TITLE_PROMPTS[localeKey].defaultTitle;
    }

    const trimmed = firstUserMessage.content.trim();
    if (trimmed.length <= 60) {
      return trimmed;
    }

    return `${trimmed.slice(0, 57)}...`;
  }

  private resolveLocale(locale?: string): LocaleKey {
    return locale && locale.toLowerCase().startsWith('it') ? 'it' : 'en';
  }

  private sanitiseTitle(title: string, localeKey: LocaleKey): string {
    const cleaned = title.replace(/^"+|"+$/g, '').replace(/[\r\n]+/g, ' ').trim();

    if (!cleaned) {
      return TITLE_PROMPTS[localeKey].defaultTitle;
    }

    if (cleaned.length <= 60) {
      return cleaned;
    }

    return `${cleaned.slice(0, 57)}...`;
  }

  /**
   * Generate embeddings for RAG
   */
  async generateEmbedding(text: string, client?: Mistral): Promise<number[]> {
    try {
      const mistralClient = client ?? (await this.createMistralClient());
      const response = await mistralClient.embeddings.create({
        model: this.embeddingModel,
        inputs: text,
      });

      const embedding = response.data?.[0]?.embedding;
      if (!embedding || embedding.length === 0) {
        throw new Error('Mistral embeddings response did not contain data');
      }

      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Get similar embeddings from database for RAG context
   */
  async searchSimilarContent(tenantId: string, embedding: number[], limit: number = 5) {
    try {
      return await this.embeddingsService.findSimilarContent(tenantId, embedding, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Similarity search failed: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Call Mistral API with RAG context
   */
  async generateResponse(
    tenantId: string,
    userId: string,
    userPrompt: string,
    conversationHistory: any[] = [],
    options?: { conversationId?: string },
  ): Promise<string> {
    const apiKey = this.getApiKey();
    const model = this.getModel();
    const conversationId = options?.conversationId ?? null;

    const userMessage = await this.prisma.message.create({
      data: {
        tenantId,
        userId,
        conversationId,
        role: 'user',
        content: userPrompt,
      },
    });

    if (!apiKey) {
      const fallbackResponse =
        'AI assistant is not configured for this environment yet. Please ask your administrator to set MISTRAL_API_KEY.';

      await this.prisma.message.create({
        data: {
          tenantId,
          userId,
          conversationId,
          role: 'assistant',
          content: fallbackResponse,
        },
      });

      this.logger.warn('Mistral API key missing. Responded with fallback message.');
      return fallbackResponse;
    }

    try {
      const mistralClient = this.createClient(apiKey);

      let ragContext = '';
      let userEmbedding: number[] | undefined;
      try {
        // Generate embedding for user prompt
        userEmbedding = await this.generateEmbedding(userPrompt, mistralClient);

        await this.embeddingsService.saveEmbedding({
          tenantId,
          messageId: userMessage.id,
          content: userPrompt,
          embedding: userEmbedding,
          model: this.embeddingModel,
          metadata: {
            source: 'user_prompt',
            createdBy: userId,
          },
        });

        // Search for similar content in knowledge base
        const similarContent = await this.searchSimilarContent(tenantId, userEmbedding);

        if (similarContent.length > 0) {
          const contextBlocks = similarContent
            .map((contentItem: any, index: number) => {
              const title = contentItem.documentName || `Fonte ${index + 1}`;
              return `### ${title}\n${contentItem.content}`;
            })
            .join('\n\n');
          ragContext = `\n\n---\nUtilizza le seguenti informazioni se rilevanti:\n\n${contextBlocks}\n\n---\n`;
        }
      } catch (ragError) {
        const ragMessage = ragError instanceof Error ? ragError.message : String(ragError);
        this.logger.warn(`Unable to build RAG context: ${ragMessage}`);
      }

      // Prepare messages for Mistral
      const historyMessages = this.normaliseConversation(conversationHistory);
      const messages: MistralChatMessage[] = [
        ...historyMessages,
        {
          role: 'user',
          content: userPrompt + ragContext,
        } as MistralChatMessage,
      ];

      // Call Mistral API
      const completion = await mistralClient.chat.complete({
        model,
        messages,
        temperature: 0.7,
        maxTokens: 1024,
      });

      const assistantMessage = completion.choices?.[0]?.message;
      const assistantResponse =
        this.extractAssistantContent(assistantMessage) ||
        'I could not generate a response just now. Please try asking again.';

      // Store assistant response in database
      await this.prisma.message.create({
        data: {
          tenantId,
          userId,
          conversationId,
          role: 'assistant',
          content: assistantResponse,
        },
      });

      this.logger.log(`Generated response for user: ${userId}`);
      return assistantResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to generate response: ${errorMessage}`, errorStack);

      let fallbackResponse =
        'The AI service is currently unavailable. Your message was saved; please try again in a moment.';

      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as { statusCode?: unknown }).statusCode;
        if (typeof statusCode === 'number') {
          this.logger.error(`Mistral API returned status ${statusCode}`);
          if (statusCode === 401 || statusCode === 403) {
            fallbackResponse =
              'AI request was rejected (unauthorized). Please verify that MISTRAL_API_KEY is valid and has the required permissions.';
          } else if (statusCode >= 500) {
            fallbackResponse =
              'Mistral API is experiencing issues right now. Your message was saved; please try again shortly.';
          }
        }
      }

      await this.prisma.message.create({
        data: {
          tenantId,
          userId,
          conversationId,
          role: 'assistant',
          content: fallbackResponse,
        },
      });

      return fallbackResponse;
    }
  }
}
