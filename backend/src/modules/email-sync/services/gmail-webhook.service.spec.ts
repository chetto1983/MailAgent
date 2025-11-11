import { GmailWebhookService, GMAIL_WEBHOOK_RESOURCE } from './gmail-webhook.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueueService } from './queue.service';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthService } from '../../providers/services/google-oauth.service';
import { CryptoService } from '../../../common/services/crypto.service';
import { GmailPubSubMessage } from '../interfaces/webhook.interface';
import { google } from 'googleapis';

const watchMock = jest.fn();
const stopMock = jest.fn();
const setCredentialsMock = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(() => ({
        setCredentials: setCredentialsMock,
      })),
    },
    gmail: jest.fn(() => ({
      users: {
        watch: watchMock,
        stop: stopMock,
      },
    })),
  },
}));

describe('GmailWebhookService', () => {
  let service: GmailWebhookService;
  let prisma: {
    providerConfig: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    webhookSubscription: {
      update: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };
  let queueService: { addSyncJob: jest.Mock };
  let configService: { get: jest.Mock };
  let googleOAuthService: { refreshAccessToken: jest.Mock };
  let cryptoService: { decrypt: jest.Mock; encrypt: jest.Mock };

  beforeEach(() => {
    prisma = {
      providerConfig: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      webhookSubscription: {
        update: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    queueService = {
      addSyncJob: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    googleOAuthService = {
      refreshAccessToken: jest.fn(),
    };

    cryptoService = {
      decrypt: jest.fn(),
      encrypt: jest.fn(),
    };

    service = new GmailWebhookService(
      prisma as unknown as PrismaService,
      queueService as unknown as QueueService,
      configService as unknown as ConfigService,
      googleOAuthService as unknown as GoogleOAuthService,
      cryptoService as unknown as CryptoService,
    );

    watchMock.mockReset();
    stopMock.mockReset();
    setCredentialsMock.mockReset();
    (google.auth.OAuth2 as unknown as jest.Mock).mockClear();
    (google.gmail as unknown as jest.Mock).mockClear();
  });

  describe('handleNotification', () => {
    it('decodes Gmail Pub/Sub payloads and enqueues a high-priority sync', async () => {
      const provider = {
        id: 'provider-1',
        email: 'user@example.com',
        tenantId: 'tenant-1',
        providerType: 'google',
        isActive: true,
        lastSyncedAt: new Date('2025-01-01T00:00:00Z'),
      };

      prisma.providerConfig.findFirst.mockResolvedValue(provider);
      prisma.webhookSubscription.update.mockResolvedValue(undefined);
      queueService.addSyncJob.mockResolvedValue(undefined);

      const gmailData = {
        emailAddress: provider.email,
        historyId: '123456',
      };

      const message: GmailPubSubMessage = {
        message: {
          data: Buffer.from(JSON.stringify(gmailData)).toString('base64'),
          messageId: 'msg-1',
          publishTime: new Date().toISOString(),
        },
        subscription: 'projects/test/subscriptions/gmail',
      };

      await expect(service.handleNotification(message)).resolves.toBeUndefined();

      expect(prisma.providerConfig.findFirst).toHaveBeenCalledWith({
        where: {
          email: provider.email,
          providerType: 'google',
          isActive: true,
        },
      });

      expect(prisma.webhookSubscription.update).toHaveBeenCalledWith({
        where: {
          providerId_resourcePath: {
            providerId: provider.id,
            resourcePath: GMAIL_WEBHOOK_RESOURCE,
          },
        },
        data: {
          lastNotificationAt: expect.any(Date),
          notificationCount: { increment: 1 },
        },
      });

      expect(queueService.addSyncJob).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: provider.id,
          tenantId: provider.tenantId,
          email: provider.email,
          priority: 'high',
          syncType: 'incremental',
          lastSyncedAt: provider.lastSyncedAt,
        }),
      );
    });

    it('skips processing when no active Gmail provider matches the payload', async () => {
      prisma.providerConfig.findFirst.mockResolvedValue(null);

      const payload: GmailPubSubMessage = {
        message: {
          data: Buffer.from(
            JSON.stringify({
              emailAddress: 'missing@example.com',
              historyId: '987',
            }),
          ).toString('base64'),
          messageId: 'msg-2',
          publishTime: new Date().toISOString(),
        },
        subscription: 'projects/test/subscriptions/gmail',
      };

      await expect(service.handleNotification(payload)).resolves.toBeUndefined();

      expect(queueService.addSyncJob).not.toHaveBeenCalled();
      expect(prisma.webhookSubscription.update).not.toHaveBeenCalled();
    });
  });

  describe('createSubscription', () => {
    it('sets up a Gmail watch and persists the subscription metadata', async () => {
      const provider = {
        id: 'provider-42',
        email: 'watch@example.com',
        providerType: 'google' as const,
        accessToken: 'encrypted-token',
        tokenEncryptionIv: 'iv',
        tokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      };

      const expiration = Date.now() + 3600 * 1000;

      prisma.providerConfig.findUnique.mockResolvedValue(provider);
      cryptoService.decrypt.mockReturnValue('plain-access-token');
      prisma.webhookSubscription.upsert.mockResolvedValue(undefined);

      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'GOOGLE_PUBSUB_TOPIC':
            return 'projects/demo/topics/gmail';
          case 'GOOGLE_CLIENT_ID':
            return 'client-id';
          case 'GOOGLE_CLIENT_SECRET':
            return 'client-secret';
          default:
            return defaultValue;
        }
      });

      watchMock.mockResolvedValue({
        data: {
          historyId: 'history-abc',
          expiration: `${expiration}`,
        },
      });

      await expect(
        service.createSubscription({
          providerId: provider.id,
          providerType: 'google',
        }),
      ).resolves.toBeUndefined();

      expect(cryptoService.decrypt).toHaveBeenCalledWith(
        provider.accessToken,
        provider.tokenEncryptionIv,
      );

      expect(setCredentialsMock).toHaveBeenCalledWith({
        access_token: 'plain-access-token',
      });

      expect(watchMock).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          topicName: 'projects/demo/topics/gmail',
          labelIds: ['INBOX'],
        },
      });

      const upsertArgs = prisma.webhookSubscription.upsert.mock.calls[0][0];

      expect(upsertArgs).toMatchObject({
        where: {
          providerId_resourcePath: {
            providerId: provider.id,
            resourcePath: GMAIL_WEBHOOK_RESOURCE,
          },
        },
      });
      expect(upsertArgs.create).toMatchObject({
        providerId: provider.id,
        providerType: 'google',
        subscriptionId: 'history-abc',
        resourcePath: GMAIL_WEBHOOK_RESOURCE,
        isActive: true,
        metadata: {
          topicName: 'projects/demo/topics/gmail',
          historyId: 'history-abc',
        },
      });
      expect(upsertArgs.update).toMatchObject({
        subscriptionId: 'history-abc',
        isActive: true,
      });
      expect(upsertArgs.create.expiresAt).toEqual(new Date(expiration));
      expect(upsertArgs.update.expiresAt).toEqual(new Date(expiration));
    });
  });
});
