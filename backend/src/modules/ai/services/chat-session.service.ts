import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ChatSession } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MistralService } from './mistral.service';

export type StoredChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  steps?: Array<{ tool: string; output: string }>;
};

const MAX_SESSIONS_PER_USER = 5;
const DEFAULT_TITLES = { en: 'New chat', it: 'Nuova chat' } as const;

const resolveLocaleKey = (locale?: string) =>
  locale && locale.toLowerCase().startsWith('it') ? 'it' : 'en';

@Injectable()
export class ChatSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mistralService: MistralService,
  ) {}

  async listSessions(tenantId: string, userId: string): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: { tenantId, userId },
      orderBy: { updatedAt: 'desc' },
      take: MAX_SESSIONS_PER_USER,
    });
  }

  async getSession(
    tenantId: string,
    userId: string,
    sessionId: string,
  ): Promise<ChatSession | null> {
    if (!sessionId) {
      return null;
    }

    return this.prisma.chatSession.findFirst({
      where: { id: sessionId, tenantId, userId },
    });
  }

  async createSession(params: {
    tenantId: string;
    userId: string;
    title?: string;
    locale?: string;
  }): Promise<ChatSession> {
    const session = await this.prisma.chatSession.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        title: params.title ?? this.getDefaultTitle(params.locale),
        messages: [],
      },
    });

    await this.enforceFifoLimit(params.tenantId, params.userId);
    return session;
  }

  async saveSessionMessages(params: {
    tenantId: string;
    userId: string;
    sessionId: string;
    messages: StoredChatMessage[];
    locale?: string;
  }): Promise<ChatSession> {
    const session = await this.getSession(
      params.tenantId,
      params.userId,
      params.sessionId,
    );

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    const sanitisedMessages = params.messages.map((message) => ({
      role: message.role,
      content: message.content,
      ...(message.steps ? { steps: message.steps } : {}),
    }));

    let title = session.title ?? this.getDefaultTitle(params.locale);
    if (
      this.isDefaultTitle(title, params.locale) &&
      sanitisedMessages.filter((msg) => msg.role === 'user').length > 0 &&
      sanitisedMessages.filter((msg) => msg.role === 'assistant').length > 0
    ) {
      try {
        title = await this.mistralService.generateChatTitle(
          sanitisedMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          params.locale,
        );
      } catch {
        title = this.deriveFallbackTitle(sanitisedMessages, params.locale);
      }
    }

    const updated = await this.prisma.chatSession.update({
      where: { id: session.id },
      data: {
        title,
        messages: sanitisedMessages as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    await this.enforceFifoLimit(params.tenantId, params.userId);
    return updated;
  }

  private async enforceFifoLimit(tenantId: string, userId: string): Promise<void> {
    const overflow = await this.prisma.chatSession.findMany({
      where: { tenantId, userId },
      orderBy: { updatedAt: 'desc' },
      skip: MAX_SESSIONS_PER_USER,
    });

    if (overflow.length === 0) {
      return;
    }

    const overflowIds = overflow.map((session: ChatSession) => session.id);
    await this.prisma.chatSession.deleteMany({
      where: { id: { in: overflowIds } },
    });
  }

  private deriveFallbackTitle(messages: StoredChatMessage[], locale?: string): string {
    const firstUserMessage = messages.find((msg) => msg.role === 'user');
    if (firstUserMessage?.content) {
      const trimmed = firstUserMessage.content.trim();
      if (trimmed.length > 0) {
        return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
      }
    }
    return this.getDefaultTitle(locale);
  }

  private getDefaultTitle(locale?: string): string {
    const key = resolveLocaleKey(locale);
    return DEFAULT_TITLES[key];
  }

  private isDefaultTitle(title?: string | null, locale?: string): boolean {
    if (!title) {
      return true;
    }

    const normalised = title.trim().toLowerCase();
    const currentDefault = this.getDefaultTitle(locale).toLowerCase();
    return (
      normalised === currentDefault ||
      normalised === DEFAULT_TITLES.en.toLowerCase() ||
      normalised === DEFAULT_TITLES.it.toLowerCase()
    );
  }

  async deleteSession(params: {
    tenantId: string;
    userId: string;
    sessionId: string;
  }): Promise<boolean> {
    const session = await this.getSession(params.tenantId, params.userId, params.sessionId);

    if (!session) {
      return false;
    }

    await this.prisma.chatSession.delete({
      where: { id: session.id },
    });

    return true;
  }
}
