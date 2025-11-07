import { NotFoundException } from '@nestjs/common';
import { ChatSessionService, StoredChatMessage } from './chat-session.service';

describe('ChatSessionService', () => {
  const TENANT_ID = 'tenant-1';
  const USER_ID = 'user-1';

  let prisma: any;
  let mistral: any;
  let service: ChatSessionService;

  beforeEach(() => {
    prisma = {
      chatSession: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    mistral = {
      generateChatTitle: jest.fn(),
    };

    service = new ChatSessionService(prisma, mistral);
  });

  describe('listSessions', () => {
    it('returns latest sessions ordered by updatedAt', async () => {
      const sessions = [{ id: 's1' }];
      prisma.chatSession.findMany.mockResolvedValueOnce(sessions);

      const result = await service.listSessions(TENANT_ID, USER_ID);

      expect(prisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: USER_ID },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });
      expect(result).toEqual(sessions);
    });
  });

  describe('getSession', () => {
    it('returns null when sessionId is empty', async () => {
      const result = await service.getSession(TENANT_ID, USER_ID, '');

      expect(result).toBeNull();
      expect(prisma.chatSession.findFirst).not.toHaveBeenCalled();
    });

    it('returns session when found', async () => {
      const session = { id: 'session-1' };
      prisma.chatSession.findFirst.mockResolvedValueOnce(session);

      const result = await service.getSession(TENANT_ID, USER_ID, 'session-1');

      expect(prisma.chatSession.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-1', tenantId: TENANT_ID, userId: USER_ID },
      });
      expect(result).toEqual(session);
    });
  });

  describe('createSession', () => {
    it('uses locale-specific default title and enforces FIFO limit', async () => {
      const createdSession = { id: 'session-abc', title: 'Nuova chat' };
      prisma.chatSession.create.mockResolvedValueOnce(createdSession);

      const result = await service.createSession({
        tenantId: TENANT_ID,
        userId: USER_ID,
        locale: 'it-IT',
      });

      expect(prisma.chatSession.create).toHaveBeenCalledWith({
        data: {
          tenantId: TENANT_ID,
          userId: USER_ID,
          title: 'Nuova chat',
          messages: [],
        },
      });
      expect(prisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: USER_ID },
        orderBy: { updatedAt: 'desc' },
        skip: 5,
      });
      expect(prisma.chatSession.deleteMany).not.toHaveBeenCalled();
      expect(result).toEqual(createdSession);
    });
  });

  describe('saveSessionMessages', () => {
    const sessionBase = {
      id: 'session-xyz',
      tenantId: TENANT_ID,
      userId: USER_ID,
      title: 'New chat',
      messages: [],
    };

    const userMessage: StoredChatMessage = { role: 'user', content: 'Hello AI' };
    const assistantMessage: StoredChatMessage = { role: 'assistant', content: 'Hi human' };

    it('throws when session does not exist', async () => {
      prisma.chatSession.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.saveSessionMessages({
          tenantId: TENANT_ID,
          userId: USER_ID,
          sessionId: 'missing',
          messages: [],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('generates a smart title via Mistral when default title is in use', async () => {
      prisma.chatSession.findFirst.mockResolvedValueOnce(sessionBase);
      mistral.generateChatTitle.mockResolvedValueOnce('AI summary title');
      const updatedSession = { ...sessionBase, title: 'AI summary title' };
      prisma.chatSession.update.mockResolvedValueOnce(updatedSession);

      const result = await service.saveSessionMessages({
        tenantId: TENANT_ID,
        userId: USER_ID,
        sessionId: sessionBase.id,
        messages: [userMessage, assistantMessage],
        locale: 'en-US',
      });

      expect(mistral.generateChatTitle).toHaveBeenCalledWith(
        [
          { role: 'user', content: 'Hello AI' },
          { role: 'assistant', content: 'Hi human' },
        ],
        'en-US',
      );
      expect(prisma.chatSession.update).toHaveBeenCalledWith({
        where: { id: sessionBase.id },
        data: {
          title: 'AI summary title',
          messages: [
            { role: 'user', content: 'Hello AI' },
            { role: 'assistant', content: 'Hi human' },
          ],
          updatedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(updatedSession);
    });

    it('falls back to derived title when Mistral title generation fails', async () => {
      prisma.chatSession.findFirst.mockResolvedValueOnce(sessionBase);
      mistral.generateChatTitle.mockRejectedValueOnce(new Error('API unavailable'));
      const updatedSession = { ...sessionBase, title: 'Hello AI' };
      prisma.chatSession.update.mockResolvedValueOnce(updatedSession);

      await service.saveSessionMessages({
        tenantId: TENANT_ID,
        userId: USER_ID,
        sessionId: sessionBase.id,
        messages: [userMessage, assistantMessage],
        locale: 'en-US',
      });

      expect(prisma.chatSession.update).toHaveBeenCalledWith({
        where: { id: sessionBase.id },
        data: expect.objectContaining({
          title: 'Hello AI',
        }),
      });
    });
  });

  describe('deleteSession', () => {
    it('returns false when session does not exist', async () => {
      prisma.chatSession.findFirst.mockResolvedValueOnce(null);

      const result = await service.deleteSession({
        tenantId: TENANT_ID,
        userId: USER_ID,
        sessionId: 'missing',
      });

      expect(result).toBe(false);
      expect(prisma.chatSession.delete).not.toHaveBeenCalled();
    });

    it('deletes session when found', async () => {
      prisma.chatSession.findFirst.mockResolvedValueOnce({ id: 'session-123' });

      const result = await service.deleteSession({
        tenantId: TENANT_ID,
        userId: USER_ID,
        sessionId: 'session-123',
      });

      expect(result).toBe(true);
      expect(prisma.chatSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-123' },
      });
    });
  });
});
